/* /api/bookings/:id  (accepts a Mongo id or a booking reference like PMS-000042)
     GET   - one booking, scoped to the caller's role
     PATCH - assign / schedule / update status / edit notes
     POST  - { action: 'pay' } re-issue a checkout URL
             { action: 'sync' } reconcile payment straight from PayMongo */

import { ObjectId } from 'mongodb';
import { Collections, getDb, unwrapUpdated } from '../_lib/db.js';
import { badRequest, forbidden, notFound, ok, readJson, route } from '../_lib/http.js';
import { requireUser } from '../_lib/auth.js';
import { createCheckoutSession } from '../_lib/paymongo.js';
import { scopeBooking, serviceFor, syncPaymentStatus } from '../_lib/bookings.js';
import * as V from '../_lib/validate.js';

function idFromUrl(req) {
  const raw = req.query?.id ?? new URL(req.url, 'http://localhost').pathname.split('/').pop();
  return decodeURIComponent(String(raw || ''));
}

async function load(db, key) {
  const or = [{ reference: key.toUpperCase() }];
  if (ObjectId.isValid(key) && String(new ObjectId(key)) === key) or.push({ _id: new ObjectId(key) });
  const doc = await Collections.bookings(db).findOne({ $or: or });
  if (!doc) throw notFound('That booking could not be found.');
  return doc;
}

/** Customers may only ever touch their own bookings. */
function assertVisible(booking, user) {
  if (user.role === 'customer' && String(booking.customerId) !== String(user._id)) {
    throw notFound('That booking could not be found.');
  }
  if (user.role === 'staff' && booking.status === 'awaiting_payment') {
    throw notFound('That booking could not be found.');
  }
}

async function getOne(req, res) {
  const user = await requireUser(req);
  const db = await getDb();
  const booking = await load(db, idFromUrl(req));
  assertVisible(booking, user);
  return ok(res, { booking: scopeBooking(booking, user) });
}

async function patch(req, res) {
  const user = await requireUser(req);
  const db = await getDb();
  const booking = await load(db, idFromUrl(req));
  assertVisible(booking, user);

  const body = await readJson(req);
  const set = { updatedAt: new Date() };

  if (user.role === 'customer') {
    // A customer's only control is cancelling something they have not paid for.
    if (body.status !== 'cancelled') {
      throw forbidden('You can only cancel a booking that has not been paid.');
    }
    if (booking.status !== 'awaiting_payment') {
      throw badRequest('This booking has already been paid and can no longer be cancelled online. Please contact us.');
    }
    set.status = 'cancelled';

  } else if (user.role === 'staff') {
    // Staff move their own jobs along; they cannot assign or reschedule.
    if (String(booking.assignedStaffId) !== String(user._id)) {
      throw forbidden('You can only update jobs assigned to you.');
    }
    const next = V.string(body.status, 'Status', { max: 20 });
    if (!['in_progress', 'completed'].includes(next)) {
      throw badRequest('You can only mark a job as in progress or completed.', { field: 'status' });
    }
    set.status = next;

  } else {
    // admin + superadmin
    if (body.assignedStaffId !== undefined) {
      if (body.assignedStaffId === null || body.assignedStaffId === '') {
        set.assignedStaffId = null;
        set.assignedStaffName = null;
      } else {
        const staffId = V.string(body.assignedStaffId, 'Technician', { max: 40 });
        if (!ObjectId.isValid(staffId)) throw badRequest('That technician is invalid.', { field: 'assignedStaffId' });

        const staff = await Collections.users(db).findOne({
          _id: new ObjectId(staffId),
          role: { $in: ['staff', 'admin', 'superadmin'] },
          active: { $ne: false },
        });
        if (!staff) throw badRequest('That technician could not be found.', { field: 'assignedStaffId' });

        set.assignedStaffId = staff._id;
        set.assignedStaffName = `${staff.firstName} ${staff.lastName}`.trim();
      }
    }

    if (body.scheduledAt !== undefined) {
      if (body.scheduledAt === null || body.scheduledAt === '') {
        set.scheduledAt = null;
      } else {
        const when = new Date(body.scheduledAt);
        if (Number.isNaN(when.getTime())) throw badRequest('That schedule date is invalid.', { field: 'scheduledAt' });
        set.scheduledAt = when;
      }
    }

    if (body.status !== undefined) {
      const next = V.string(body.status, 'Status', { max: 20 });
      if (!V.BOOKING_STATUSES.includes(next)) {
        throw badRequest('That status is not recognised.', { field: 'status' });
      }
      set.status = next;
    }

    if (body.notes !== undefined) {
      set.notes = V.string(body.notes, 'Notes', { max: 600, required: false });
    }

    /* Keep status and assignment consistent, and do it AFTER both have been
       read. The management form always submits the status it was opened with,
       so deriving the transition earlier let that stale value overwrite it —
       a job could end up showing "Paid - Unassigned" with a technician on it.
       Only the paid <-> assigned pair is derived; an explicit in_progress,
       completed or cancelled from an admin always wins. */
    const nextStatus = set.status ?? booking.status;
    const nextAssignee = 'assignedStaffId' in set ? set.assignedStaffId : booking.assignedStaffId;

    if (nextAssignee && nextStatus === 'paid') set.status = 'assigned';
    else if (!nextAssignee && nextStatus === 'assigned') set.status = 'paid';
  }

  const updated = await Collections.bookings(db).findOneAndUpdate(
    { _id: booking._id }, { $set: set }, { returnDocument: 'after' }
  );
  const doc = unwrapUpdated(updated) ?? (await Collections.bookings(db).findOne({ _id: booking._id }));

  return ok(res, { booking: scopeBooking(doc, user) });
}

async function post(req, res) {
  const user = await requireUser(req);
  const db = await getDb();
  const booking = await load(db, idFromUrl(req));
  assertVisible(booking, user);

  const body = await readJson(req);
  const action = V.string(body.action, 'Action', { max: 20 });

  if (action === 'sync') {
    const synced = await syncPaymentStatus(db, booking);
    return ok(res, { booking: scopeBooking(synced, user) });
  }

  if (action === 'pay') {
    if (user.role !== 'customer' || String(booking.customerId) !== String(user._id)) {
      throw forbidden('Only the customer who made this booking can pay for it.');
    }
    if (booking.payment?.status === 'paid') {
      throw badRequest('This booking has already been paid.');
    }
    if (booking.status === 'cancelled') {
      throw badRequest('This booking was cancelled. Please create a new one.');
    }

    const service = await serviceFor(db, booking.service);
    if (!service) throw badRequest('That service is no longer available.');

    // Deliberately the booking's OWN amounts, not the catalogue's current
    // ones. This customer booked at a quoted price; re-issuing their payment
    // link must not silently charge them a price set after they booked. The
    // service row is read only for its name.
    const checkout = await createCheckoutSession({
      booking, customer: user, service, amounts: booking.amounts,
    });
    await Collections.bookings(db).updateOne(
      { _id: booking._id },
      { $set: { 'payment.checkoutSessionId': checkout.id, updatedAt: new Date() } }
    );
    return ok(res, { checkoutUrl: checkout.checkoutUrl });
  }

  throw badRequest('Unknown action.', { field: 'action' });
}

export default route({ GET: getOne, PATCH: patch, POST: post });
