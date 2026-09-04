/* /api/bookings
     GET  - list, scoped to the caller's role
     POST - customer creates a PMS booking and gets a PayMongo checkout URL */

import { ObjectId } from 'mongodb';
import { Collections, getDb, nextSequence } from '../_lib/db.js';
import { badRequest, conflict, forbidden, ok, readJson, route } from '../_lib/http.js';
import { requireUser } from '../_lib/auth.js';
import { createCheckoutSession } from '../_lib/paymongo.js';
import { scopeBooking, serviceFor } from '../_lib/bookings.js';
import { publicService } from '../_lib/services.js';
import * as V from '../_lib/validate.js';

const LIST_LIMIT = 200;
const STAFF_VISIBLE_STATUSES = ['paid', 'assigned', 'in_progress', 'completed'];
const REFERENCE_ATTEMPTS = 5;

/**
 * Takes the next number from the counter and inserts the booking under it.
 *
 * The counter is consumed at creation and never handed back, so a booking left
 * awaiting payment - or one whose payment later fails - keeps the reference it
 * was given and the next customer through gets the following number.
 *
 * The retry covers the case where the collection already holds the reference
 * the counter just issued, which happens after a restored backup or when rows
 * predate a counter fix. Bumping to the next number clears that by itself
 * rather than failing the booking in front of a paying customer.
 */
async function insertWithReference(db, booking, code) {
  let lastTaken = null;

  for (let attempt = 1; attempt <= REFERENCE_ATTEMPTS; attempt++) {
    const seq = await nextSequence(db, 'booking');
    booking.reference = `${code}-${String(seq).padStart(6, '0')}`;

    // The unique index is the real guard, but it only protects a database it
    // managed to build on - and it cannot build on a collection that already
    // holds duplicates. Look first, so the counter walks past legacy rows even
    // there; the catch below still covers losing the race to another request.
    const taken = await Collections.bookings(db).findOne(
      { reference: booking.reference }, { projection: { _id: 1 } }
    );
    if (!taken) {
      try {
        const inserted = await Collections.bookings(db).insertOne(booking);
        booking._id = inserted.insertedId;
        return booking;
      } catch (err) {
        if (err?.code !== 11000) throw err;
      }
    }
    lastTaken = booking.reference;
    console.warn(`[bookings] reference ${lastTaken} is already taken - advancing the counter`);
  }

  throw new Error(
    `[bookings] no free reference for ${code} after ${REFERENCE_ATTEMPTS} attempts (last tried ${lastTaken})`
  );
}

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
  const db = await getDb();

  // Read the price at the moment of booking rather than from a constant, so an
  // admin's change is live for the very next customer through this route.
  const service = await serviceFor(db, V.string(body.service, 'Service', { max: 20 }).toUpperCase());
  if (!service || service.bookable !== true || service.total == null || service.downpayment == null) {
    throw badRequest('That service is not available for online booking yet.', { field: 'service' });
  }

  // The customer clicked a button showing a price. If it changed between the
  // page loading and the click, stop and show them the new one rather than
  // charging a figure they never agreed to.
  if (body.priceVersion !== undefined && Number(body.priceVersion) !== service.version) {
    throw conflict('The price of this service changed while you were booking. Please review the new total and try again.', {
      field: 'priceVersion',
      service: publicService(service),
    });
  }

  const units = V.units(body.units);
  const location = V.location(body.location);
  const notes = V.string(body.notes, 'Notes', { max: 600, required: false });

  const now = new Date();
  const booking = {
    // Assigned by insertWithReference below, once the counter has issued one.
    reference: null,
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
    // Snapshot, not a reference. A later price change must never alter what
    // this customer was quoted, what they paid, or what is still owed.
    amounts: {
      total: service.total,
      downpayment: service.downpayment,
      balance: service.total - service.downpayment,
      currency: service.currency,
      priceVersion: service.version,
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

  await insertWithReference(db, booking, service.code);

  let checkout;
  try {
    checkout = await createCheckoutSession({ booking, customer: user, service, amounts: booking.amounts });
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
