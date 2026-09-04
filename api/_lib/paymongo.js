/* PayMongo client.

   The secret key is read from the environment and used only here, server-side.
   It must never be sent to the browser: it can create charges, issue refunds
   and read every transaction on the account. The publishable key is not needed
   at all in this design, because we create the Checkout Session server-side and
   redirect the customer to PayMongo's hosted page. */

import crypto from 'node:crypto';
import { ApiError } from './http.js';

const API = 'https://api.paymongo.com/v1';

/* PayMongo works exclusively in centavos, and integer arithmetic avoids the
   rounding errors floats introduce with money. Prices themselves are no longer
   defined here — they live in the database so an admin can change them at any
   time. See api/_lib/services.js.

   PayMongo rejects a charge outside its per-transaction limits, and that
   rejection surfaces at checkout, in front of a paying customer, long after
   the price was set. Pricing changes are validated against these bounds at the
   moment they are saved so an admin is told immediately instead.

   The defaults are PayMongo's published per-transaction limits for card and
   e-wallet payments. If your account is configured differently, override them
   with PAYMONGO_MIN_AMOUNT / PAYMONGO_MAX_AMOUNT rather than editing this. */
const envAmount = (name, fallback) => {
  const n = Number(process.env[name]);
  return Number.isInteger(n) && n > 0 ? n : fallback;
};

export const MIN_CHARGE = envAmount('PAYMONGO_MIN_AMOUNT', 10_000);      // PHP 100.00
export const MAX_CHARGE = envAmount('PAYMONGO_MAX_AMOUNT', 100_000_000); // PHP 1,000,000.00

export const pesos = (centavos) =>
  (centavos / 100).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' });

function authHeader() {
  const key = process.env.PAYMONGO_SECRET_KEY;
  if (!key) {
    console.error('[paymongo] PAYMONGO_SECRET_KEY is not set');
    throw new ApiError(503, 'Online payment is not configured yet. Please contact us to book.');
  }
  return `Basic ${Buffer.from(`${key}:`).toString('base64')}`;
}

function methods() {
  const raw = process.env.PAYMONGO_METHODS || 'card,gcash,paymaya';
  return raw.split(',').map((m) => m.trim()).filter(Boolean);
}

async function call(path, { method = 'POST', body } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);

  let response;
  try {
    response = await fetch(`${API}${path}`, {
      method,
      headers: {
        Authorization: authHeader(),
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    console.error('[paymongo] network failure:', err.message);
    throw new ApiError(502, 'We could not reach the payment provider. Please try again in a moment.');
  }
  clearTimeout(timer);

  const text = await response.text();
  let payload = {};
  try { payload = text ? JSON.parse(text) : {}; } catch { /* handled below */ }

  if (!response.ok) {
    const detail = payload?.errors?.[0]?.detail || payload?.errors?.[0]?.code || text.slice(0, 300);
    // Logged in full for us; the customer gets a message they can act on.
    console.error(`[paymongo] ${method} ${path} -> ${response.status}: ${detail}`);

    if (response.status === 401) {
      throw new ApiError(503, 'Online payment is not configured correctly. Please contact us to book.');
    }
    if (response.status === 400 && /payment_method|not.*(enabled|activated)/i.test(String(detail))) {
      throw new ApiError(
        503,
        'The selected payment methods are not activated on our payment account yet. Please contact us to book.'
      );
    }
    throw new ApiError(502, `Payment provider error: ${detail}`);
  }

  return payload;
}

/**
 * Creates a hosted Checkout Session for a booking's down payment.
 *
 * `amounts` is the booking's OWN snapshot, not the current catalogue price.
 * Re-issuing a checkout link for an existing booking must charge what that
 * customer was quoted, even if an admin has re-priced the service since.
 *
 * Returns { id, checkoutUrl }.
 */
export async function createCheckoutSession({ booking, customer, service, amounts }) {
  const base = (process.env.PUBLIC_BASE_URL || '').replace(/\/+$/, '');
  if (!base) {
    console.error('[paymongo] PUBLIC_BASE_URL is not set');
    throw new ApiError(503, 'Online payment is not configured yet. Please contact us to book.');
  }

  const money = amounts ?? booking.amounts ?? {};
  const downpayment = money.downpayment;
  const total = money.total;
  const currency = money.currency || service.currency || 'PHP';

  // Prices are editable at runtime now, so the amount reaching this request is
  // no longer a compile-time constant. Refuse to send a charge PayMongo would
  // reject, or - far worse - one it would silently accept as wrong.
  if (!Number.isInteger(downpayment) || !Number.isInteger(total)) {
    console.error(`[paymongo] non-integer amounts for ${booking.reference}:`, JSON.stringify(money));
    throw new ApiError(500, 'This service is not priced correctly. Please contact us to book.');
  }
  if (downpayment < MIN_CHARGE || downpayment > MAX_CHARGE) {
    console.error(`[paymongo] ${booking.reference} down payment ${downpayment} is outside PayMongo's limits`);
    throw new ApiError(500, 'This service is not priced correctly. Please contact us to book.');
  }
  if (downpayment > total) {
    console.error(`[paymongo] ${booking.reference} down payment ${downpayment} exceeds total ${total}`);
    throw new ApiError(500, 'This service is not priced correctly. Please contact us to book.');
  }

  const balance = total - downpayment;

  const payload = {
    data: {
      attributes: {
        line_items: [
          {
            currency,
            amount: downpayment,
            name: `${service.name} - Reservation Down Payment`,
            quantity: 1,
            description: balance > 0
              ? `Down payment for booking ${booking.reference}. Balance of ${pesos(balance)} is payable on completion of service.`
              : `Payment in full for booking ${booking.reference}. Nothing further is payable on completion.`,
          },
        ],
        payment_method_types: methods(),
        // PayMongo appends its own query params; keep ours explicit.
        success_url: `${base}/app/booking-complete?ref=${encodeURIComponent(booking.reference)}`,
        cancel_url: `${base}/app/dashboard?payment=cancelled&ref=${encodeURIComponent(booking.reference)}`,
        description: `${service.name} down payment - ${booking.reference}`,
        reference_number: booking.reference,
        send_email_receipt: true,
        show_description: true,
        show_line_items: true,
        billing: {
          name: `${customer.firstName} ${customer.lastName}`.trim(),
          email: customer.email,
          phone: customer.phone,
        },
        metadata: {
          bookingRef: booking.reference,
          bookingId: String(booking._id),
          customerId: String(customer._id),
          service: service.code,
          // Which catalogue price this charge came from, so a payment can
          // still be traced back to the figures in force when it was made.
          priceVersion: String(money.priceVersion ?? service.version ?? ''),
        },
      },
    },
  };

  const result = await call('/checkout_sessions', { body: payload });
  const id = result?.data?.id;
  const checkoutUrl = result?.data?.attributes?.checkout_url;

  if (!id || !checkoutUrl) {
    console.error('[paymongo] unexpected create response:', JSON.stringify(result).slice(0, 500));
    throw new ApiError(502, 'The payment provider returned an unexpected response. Please try again.');
  }
  return { id, checkoutUrl };
}

export async function retrieveCheckoutSession(id) {
  const result = await call(`/checkout_sessions/${encodeURIComponent(id)}`, { method: 'GET' });
  return result?.data ?? null;
}

/**
 * Verifies the Paymongo-Signature header against the raw request body.
 *
 * Header format: t=<unix ts>,te=<test signature>,li=<live signature>
 * The signed payload is `${t}.${rawBody}` HMAC-SHA256'd with the webhook
 * secret. The raw bytes matter - re-serialising parsed JSON changes the
 * whitespace and the signature will never match.
 */
export function verifyWebhookSignature(rawBody, signatureHeader) {
  const secret = process.env.PAYMONGO_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[paymongo] PAYMONGO_WEBHOOK_SECRET is not set - rejecting webhook');
    return false;
  }
  if (!signatureHeader || typeof signatureHeader !== 'string') return false;

  const parts = Object.fromEntries(
    signatureHeader.split(',').map((piece) => {
      const idx = piece.indexOf('=');
      return idx < 0 ? [piece.trim(), ''] : [piece.slice(0, idx).trim(), piece.slice(idx + 1).trim()];
    })
  );

  const timestamp = parts.t;
  const provided = parts.li || parts.te; // live key first, test key as fallback
  if (!timestamp || !provided) return false;

  // Reject replays of an old, previously valid delivery.
  const ageSeconds = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(ageSeconds) || ageSeconds > 300) {
    console.error('[paymongo] webhook timestamp outside the 5 minute tolerance');
    return false;
  }

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody.toString('utf8')}`)
    .digest('hex');

  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(provided, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
