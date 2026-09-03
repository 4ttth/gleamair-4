/* POST /api/webhooks/paymongo

   PayMongo's server-to-server confirmation that money actually moved. This is
   the authoritative source for marking a booking paid: the browser returning
   to a success URL proves nothing, because anyone can visit that URL.

   Body parsing is disabled so the exact bytes PayMongo signed are available
   for HMAC verification. */

import { Collections, getDb } from '../_lib/db.js';
import { json, readRaw, route } from '../_lib/http.js';
import { verifyWebhookSignature } from '../_lib/paymongo.js';
import { markPaid } from '../_lib/bookings.js';

export const config = { api: { bodyParser: false } };

const PAID_EVENTS = new Set([
  'checkout_session.payment.paid',
  'payment.paid',
]);

async function handle(req, res) {
  const raw = await readRaw(req);
  const signature = req.headers['paymongo-signature'];

  if (!verifyWebhookSignature(raw, signature)) {
    console.error('[webhook] rejected: signature did not verify');
    // 401 tells PayMongo the delivery failed so it will retry, and stops a
    // forged request from ever reaching the booking update below.
    return json(res, 401, { ok: false, error: 'Invalid signature.' });
  }

  let event;
  try {
    event = JSON.parse(raw.toString('utf8'));
  } catch {
    return json(res, 400, { ok: false, error: 'Malformed payload.' });
  }

  const attrs = event?.data?.attributes ?? {};
  const type = attrs.type;

  if (!PAID_EVENTS.has(type)) {
    // Acknowledge everything else so PayMongo stops retrying it.
    return json(res, 200, { ok: true, ignored: type ?? 'unknown' });
  }

  const payload = attrs.data?.attributes ?? {};
  const sessionId = attrs.data?.id ?? null;

  // Locate the booking by checkout session, falling back to the reference we
  // set at creation time.
  const reference =
    payload?.reference_number ||
    payload?.metadata?.bookingRef ||
    payload?.payment_intent?.attributes?.metadata?.bookingRef ||
    null;

  const db = await getDb();
  const or = [];
  if (sessionId) or.push({ 'payment.checkoutSessionId': sessionId });
  if (reference) or.push({ reference: String(reference).toUpperCase() });

  if (!or.length) {
    console.error('[webhook] paid event carried no session id or reference:', JSON.stringify(event).slice(0, 400));
    return json(res, 200, { ok: true, ignored: 'unidentifiable' });
  }

  const booking = await Collections.bookings(db).findOne({ $or: or });
  if (!booking) {
    console.error('[webhook] no booking matched', { sessionId, reference });
    // 200, not 404: retrying will not make an unknown booking appear.
    return json(res, 200, { ok: true, ignored: 'no-matching-booking' });
  }

  const payments = payload?.payments ?? [];
  const paid = payments.find((p) => p?.attributes?.status === 'paid') ?? null;

  await markPaid(db, booking, {
    paymentIntentId: payload?.payment_intent?.id ?? payload?.id ?? null,
    method: paid?.attributes?.source?.type ?? payload?.source?.type ?? null,
    amount: paid?.attributes?.amount ?? payload?.amount ?? null,
  });

  console.log(`[webhook] booking ${booking.reference} marked paid (${type})`);
  return json(res, 200, { ok: true });
}

export default route({ POST: handle });
