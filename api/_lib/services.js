/* The service catalogue and its pricing.

   Prices used to be a constant compiled into the bundle, which meant changing
   what Gleamair charges required a code edit and a redeploy. They now live in
   MongoDB so an admin or superadmin can change them at any time and the next
   booking — and the PayMongo charge it creates — uses the new figure
   immediately.

   Two rules make that safe:

   1. A booking SNAPSHOTS its amounts at creation (see api/bookings/index.js).
      Re-pricing never rewrites a booking that already exists: a customer pays
      the price they were quoted, and a paid booking's history stays truthful.
   2. Every write is validated against PayMongo's per-transaction limits, so an
      impossible price is rejected here rather than at checkout, in front of a
      customer. */

import { Collections, unwrapUpdated } from './db.js';
import { badRequest, conflict, notFound } from './http.js';
import { MAX_CHARGE, MIN_CHARGE } from './paymongo.js';
import * as V from './validate.js';

/** Seeded into an empty database on first read. These are the values that were
    previously hardcoded; once a service row exists, the database wins and this
    list is never consulted for it again. */
export const DEFAULT_SERVICES = [
  {
    _id: 'PMS', code: 'PMS',
    name: 'Preventive Maintenance Service',
    total: 50_000,        // PHP 500.00, in centavos
    downpayment: 25_000,  // PHP 250.00
    currency: 'PHP',
    bookable: true,
  },
  {
    _id: 'INSTALL', code: 'INSTALL',
    name: 'Aircon Supply & Installation',
    total: null, downpayment: null, currency: 'PHP', bookable: false,
  },
  {
    _id: 'VENT', code: 'VENT',
    name: 'Roof Ventilation',
    total: null, downpayment: null, currency: 'PHP', bookable: false,
  },
  {
    _id: 'SOLAR', code: 'SOLAR',
    name: 'Solar Lighting',
    total: null, downpayment: null, currency: 'PHP', bookable: false,
  },
];

/* Seeding runs at most once per warm serverless instance. $setOnInsert means a
   concurrent cold start, or a redeploy, can never overwrite a price an admin
   has already changed.

   The flag lives on globalThis rather than in a module local for the same
   reason the Mongo client does: a serverless instance keeps the module graph
   between invocations, and a test that resets the database needs a way to
   clear it. */
async function ensureSeeded(db) {
  if (globalThis.__gleamairServicesSeeded) return;
  const now = new Date();
  try {
    await Promise.all(DEFAULT_SERVICES.map((s) =>
      Collections.services(db).updateOne(
        { _id: s._id },
        { $setOnInsert: { ...s, version: 1, createdAt: now, updatedAt: now, updatedBy: null } },
        { upsert: true }
      )
    ));
    globalThis.__gleamairServicesSeeded = true;
  } catch (err) {
    // Never take a request down over seeding; the next one retries.
    console.error('[services] seed failed:', err.message);
  }
}

/** The shape sent to any caller. `version` is included so a client can prove
    which price it was showing when it acted on it. */
export function publicService(s) {
  return {
    code: s.code,
    name: s.name,
    total: s.total ?? null,
    downpayment: s.downpayment ?? null,
    balance: s.total != null && s.downpayment != null ? s.total - s.downpayment : null,
    currency: s.currency || 'PHP',
    bookable: s.bookable === true && s.total != null && s.downpayment != null,
    version: s.version ?? 1,
  };
}

/** Adds the audit trail. Admin and superadmin only — `updatedBy` names a
    member of staff and is not the customer's business. */
export function adminService(s) {
  return {
    ...publicService(s),
    updatedAt: s.updatedAt ?? null,
    updatedBy: s.updatedBy ?? null,
  };
}

export async function listServices(db) {
  await ensureSeeded(db);
  return Collections.services(db).find({}).sort({ code: 1 }).toArray();
}

/** The single source of truth for what a booking costs, read fresh on every
    call so a price change takes effect on the very next booking. */
export async function getService(db, code) {
  await ensureSeeded(db);
  const raw = V.string(code, 'Service', { max: 20 }).toUpperCase();
  return Collections.services(db).findOne({ _id: raw });
}

/**
 * Applies a pricing change under optimistic concurrency.
 *
 * `expectedVersion` is the version the editor was looking at. If someone else
 * changed the price in between, the update is refused rather than silently
 * overwriting their change — two admins editing money at once is exactly the
 * case where a lost update is expensive.
 */
export async function updateServicePricing(db, code, patch, actor) {
  const current = await getService(db, code);
  if (!current) throw notFound('That service does not exist.');

  const expected = Number(patch.version);
  if (!Number.isInteger(expected)) {
    throw badRequest('A version is required. Re-read the service and try again.', { field: 'version' });
  }

  // Merge onto the current row so a caller can send just one field, then
  // validate the RESULT — a lone `total` can still invalidate the downpayment.
  const total = patch.total === undefined
    ? current.total
    : V.centavos(patch.total, 'Total price', { min: MIN_CHARGE, max: MAX_CHARGE });

  const downpayment = patch.downpayment === undefined
    ? current.downpayment
    : V.centavos(patch.downpayment, 'Down payment', { min: MIN_CHARGE, max: MAX_CHARGE });

  const bookable = patch.bookable === undefined ? current.bookable === true : patch.bookable === true;

  // Enforced whether or not the service is currently on sale, so a row can
  // never be flipped back to bookable while holding nonsense figures.
  if (total != null && downpayment != null && downpayment > total) {
    throw badRequest('The down payment cannot be more than the total price.', { field: 'downpayment' });
  }
  if (bookable && (total == null || downpayment == null)) {
    throw badRequest('A bookable service needs both a total price and a down payment.', { field: 'total' });
  }

  const now = new Date();
  const result = await Collections.services(db).findOneAndUpdate(
    { _id: current._id, version: expected },
    {
      $set: {
        total, downpayment, bookable,
        version: expected + 1,
        updatedAt: now,
        updatedBy: { id: String(actor._id), name: `${actor.firstName} ${actor.lastName}`.trim(), role: actor.role },
      },
    },
    { returnDocument: 'after' }
  );

  const updated = unwrapUpdated(result);
  if (!updated) {
    // The guard matched nothing, so the version moved under us.
    const fresh = await getService(db, code);
    throw conflict(
      'Someone else changed this price while you were editing. Review the current figures and try again.',
      { field: 'version', current: fresh ? adminService(fresh) : null }
    );
  }

  // Written after the fact: the price change is what must not be lost, and an
  // audit row that fails to insert must not roll back a completed change.
  try {
    await Collections.servicePriceHistory(db).insertOne({
      code: current.code,
      at: now,
      by: updated.updatedBy,
      from: { total: current.total ?? null, downpayment: current.downpayment ?? null, bookable: current.bookable === true },
      to:   { total, downpayment, bookable },
      version: expected + 1,
    });
  } catch (err) {
    console.error('[services] price history insert failed:', err.message);
  }

  console.log(`[services] ${current.code} priced by ${updated.updatedBy?.name}: total=${total} downpayment=${downpayment}`);
  return updated;
}

export async function priceHistory(db, code, limit = 20) {
  return Collections.servicePriceHistory(db)
    .find({ code: String(code).toUpperCase() })
    // Ordered by version, not timestamp: two changes can land in the same
    // millisecond, and version is the one value guaranteed to increase.
    .sort({ version: -1 })
    .limit(limit)
    .toArray();
}
