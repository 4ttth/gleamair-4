/* /api/bookings
     GET  - list, scoped to the caller's role
     POST - customer creates a PMS booking and gets a PayMongo checkout URL */

import { ObjectId } from 'mongodb';
import { Collections, getDb, nextSequence } from '../_lib/db.js';
import { badRequest, forbidden, ok, readJson, route } from '../_lib/http.js';
import { requireUser } from '../_lib/auth.js';
import { createCheckoutSession } from '../_lib/paymongo.js';
import { scopeBooking, serviceFor } from '../_lib/bookings.js';
import * as V from '../_lib/validate.js';

const LIST_LIMIT = 200;
const STAFF_VISIBLE_STATUSES = ['paid', 'assigned', 'in_progress', 'completed'];

async function list(req, res) {
  const user = await requireUser(req);
  const db = await getDb();

  const url = new URL(req.url, 'http://localhost');
  const statusFilter = url.searchParams.get('status');
  const query = {};

  if (user.role === 'customer') {
    query.customerId = user._id;
  }

  // The statuses this caller is allowed to see at all. Unpaid and cancelled
  // bookings are not yet real work, so staff never see them - matching the
  // single-booking endpoint, which 404s staff on awaiting_payment.
  const visibleStatuses = user.role === 'staff' ? STAFF_VISIBLE_STATUSES : V.BOOKING_STATUSES;

  // Intersect the requested filter with what the role may see. Assigning the
  // filter directly would let a staff caller pass ?status=awaiting_payment and
  // replace the role guard outright.
  if (statusFilter && visibleStatuses.includes(statusFilter)) {
    query.status = statusFilter;
  } else if (user.role === 'staff') {
    query.status = { $in: visibleStatuses };
  }
  if (url.searchParams.get('mine') === '1' && user.role !== 'customer') {
    query.assignedStaffId = user._id;
  }

  const docs = await Collections.bookings(db)
    .find(query)
    .sort({ createdAt: -1 })
    .limit(LIST_LIMIT)
    .toArray();

  return ok(res, { bookings: docs.map((b) => scopeBooking(b, user)) });
}

async function create(req, res) {
  const user = await requireUser(req);
  if (user.role !== 'customer') {
    throw forbidden('Only customer accounts can book a service.');
  }

  const body = await readJson(req);
  const service = serviceFor(V.string(body.service, 'Service', { max: 20 }).toUpperCase());
  if (!service) throw badRequest('That service is not available for online booking yet.', { field: 'service' });

  const units = V.units(body.units);
  const location = V.location(body.location);
  const notes = V.string(body.notes, 'Notes', { max: 600, required: false });

  const db = await getDb();
  const seq = await nextSequence(db, 'booking');
  const reference = `${service.code}-${String(seq).padStart(6, '0')}`;

  const now = new Date();
  const booking = {
    reference,
    service: service.code,
    serviceName: service.name,
    customerId: user._id,
    // Snapshot the customer as they were at booking time: if they later move
    // house, the technician's job card must still show where to go.
    customer: {
      fullName: `${user.firstName} ${user.lastName}`.trim(),
      email: user.email,
      phone: user.phone,
      address: user.address,
    },
    units,
    location,
    notes,
    amounts: {
      total: service.total,
      downpayment: service.downpayment,
      balance: service.total - service.downpayment,
      currency: service.currency,
    },
    payment: { provider: 'paymongo', status: 'pending', checkoutSessionId: null, paymentIntentId: null },
    status: 'awaiting_payment',
    assignedStaffId: null,
    assignedStaffName: null,
    scheduledAt: null,
    createdAt: now,
    updatedAt: now,

    // Reserved for the later Odoo merge.
    odooTaskId: null,
    odooSaleOrderId: null,
  };

  const inserted = await Collections.bookings(db).insertOne(booking);
  booking._id = inserted.insertedId;

  let checkout;
  try {
    checkout = await createCheckoutSession({ booking, customer: user, service });
  } catch (err) {
    // Don't strand an unpayable booking in the list if PayMongo rejects us.
    await Collections.bookings(db).deleteOne({ _id: booking._id });
    throw err;
  }

  await Collections.bookings(db).updateOne(
    { _id: booking._id },
    { $set: { 'payment.checkoutSessionId': checkout.id, updatedAt: new Date() } }
  );
  booking.payment.checkoutSessionId = checkout.id;

  return ok(res, {
    booking: scopeBooking(booking, user),
    checkoutUrl: checkout.checkoutUrl,
  });
}

export default route({ GET: list, POST: create });
