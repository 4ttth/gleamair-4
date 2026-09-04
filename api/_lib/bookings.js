/* Shared booking helpers: role-scoped shaping and payment reconciliation. */

import { Collections } from './db.js';
import { retrieveCheckoutSession } from './paymongo.js';
import { getService } from './services.js';

/**
 * Staff are intentionally limited to the customer's NAME, the UNIT DETAILS and
 * the MAP PIN, per the brief. Contact details and street address are withheld.
 *
 * If technicians turn out to need to phone the customer or read the exact
 * address on site, flip this to true - it is the only switch involved.
 */
export const STAFF_SEES_CONTACT = false;

const base = (b) => ({
  id: String(b._id),
  reference: b.reference,
  service: b.service,
  serviceName: b.serviceName,
  units: b.units,
  status: b.status,
  amounts: b.amounts,
  scheduledAt: b.scheduledAt ?? null,
  assignedStaffId: b.assignedStaffId ? String(b.assignedStaffId) : null,
  assignedStaffName: b.assignedStaffName ?? null,
  location: b.location ?? null,
  createdAt: b.createdAt,
});

const contact = (b) => ({
  customerEmail: b.customer?.email ?? null,
  customerPhone: b.customer?.phone ?? null,
  address: b.customer?.address ?? null,
});

/** Shapes a booking for the viewer's role. Never send the raw document. */
export function scopeBooking(b, viewer) {
  const shaped = {
    ...base(b),
    customerName: b.customer?.fullName ?? null,
    payment: {
      status: b.payment?.status ?? 'pending',
      paidAt: b.payment?.paidAt ?? null,
      method: b.payment?.method ?? null,
    },
  };

  if (viewer.role === 'customer') {
    return { ...shaped, ...contact(b), notes: b.notes ?? '' };
  }
  if (viewer.role === 'staff') {
    // Deliberately narrow - see STAFF_SEES_CONTACT above.
    const staffView = { ...shaped, city: b.customer?.address?.cityName ?? null,
                        province: b.customer?.address?.provinceName ?? null };
    return STAFF_SEES_CONTACT ? { ...staffView, ...contact(b) } : staffView;
  }
  // admin + superadmin
  return {
    ...shaped,
    ...contact(b),
    customerId: b.customerId ? String(b.customerId) : null,
    notes: b.notes ?? '',
    payment: {
      ...shaped.payment,
      checkoutSessionId: b.payment?.checkoutSessionId ?? null,
      paymentIntentId: b.payment?.paymentIntentId ?? null,
    },
  };
}

/**
 * Asks PayMongo directly whether a checkout session was paid, and promotes the
 * booking if so. The webhook is the primary path; this is the fallback used by
 * the payment-return page so a delayed or misconfigured webhook never leaves a
 * paying customer looking at an unpaid booking.
 */
export async function syncPaymentStatus(db, booking) {
  if (booking.payment?.status === 'paid') return booking;
  const sessionId = booking.payment?.checkoutSessionId;
  if (!sessionId) return booking;

  const session = await retrieveCheckoutSession(sessionId);
  const payments = session?.attributes?.payments ?? [];
  const paid = payments.find((p) => p?.attributes?.status === 'paid');
  if (!paid) return booking;

  return markPaid(db, booking, {
    paymentIntentId: session?.attributes?.payment_intent?.id ?? null,
    method: paid?.attributes?.source?.type ?? null,
    amount: paid?.attributes?.amount ?? null,
  });
}

/** Idempotent: safe to call from both the webhook and the return page. */
export async function markPaid(db, booking, { paymentIntentId, method, amount } = {}) {
  const result = await Collections.bookings(db).findOneAndUpdate(
    { _id: booking._id, 'payment.status': { $ne: 'paid' } },
    {
      $set: {
        status: 'paid',
        'payment.status': 'paid',
        'payment.paidAt': new Date(),
        'payment.paymentIntentId': paymentIntentId ?? booking.payment?.paymentIntentId ?? null,
        'payment.method': method ?? null,
        'payment.amountPaid': amount ?? booking.amounts?.downpayment ?? null,
        updatedAt: new Date(),
      },
    },
    { returnDocument: 'after' }
  );
  // findOneAndUpdate returns null when the guard matched nothing, i.e. it was
  // already paid - re-read so callers always get a document back.
  return result?.value ?? result ?? (await Collections.bookings(db).findOne({ _id: booking._id }));
}

/** Reads the service straight from the database on every call, so a price an
    admin changed a second ago is the price the next booking is charged. */
export const serviceFor = (db, code) => getService(db, code);
