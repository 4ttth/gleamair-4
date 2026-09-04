/* MongoDB connection + index management.
   Serverless functions are recycled between invocations, so the client is
   cached on globalThis. Without this, every request opens a new connection
   pool and Atlas hits its connection limit under modest traffic. */

import { MongoClient } from 'mongodb';

const uri    = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'gleamair';

if (!uri) {
  // Fail loudly at cold start rather than with a confusing error per request.
  console.error('[db] MONGODB_URI is not set — see .env.example');
}

let cached = globalThis.__gleamairMongo;
if (!cached) cached = globalThis.__gleamairMongo = { conn: null, promise: null, indexed: false };

async function connect() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = new MongoClient(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 8000,
    }).connect();
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

/** Created once per cold start. All are idempotent. */
async function ensureIndexes(db) {
  if (cached.indexed) return;
  cached.indexed = true;
  try {
    await Promise.all([
      db.collection('users').createIndex({ email: 1 }, { unique: true }),
      db.collection('users').createIndex({ role: 1, createdAt: -1 }),

      // TTL index: Mongo evicts expired sessions on its own, so a stale cookie
      // can never resolve to a live session even if logout never ran.
      db.collection('sessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
      db.collection('sessions').createIndex({ userId: 1 }),

      db.collection('bookings').createIndex({ reference: 1 }, { unique: true }),
      db.collection('bookings').createIndex({ customerId: 1, createdAt: -1 }),
      db.collection('bookings').createIndex({ status: 1, createdAt: -1 }),
      db.collection('bookings').createIndex({ assignedStaffId: 1 }),
      db.collection('bookings').createIndex({ 'payment.checkoutSessionId': 1 }),

      // Login throttling records expire by themselves.
      db.collection('loginAttempts').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
      db.collection('loginAttempts').createIndex({ key: 1 }),

      // Service pricing. _id is the service code, so uniqueness is free; the
      // history is only ever read newest-first for one service at a time.
      db.collection('servicePriceHistory').createIndex({ code: 1, version: -1 }),
    ]);
  } catch (err) {
    // A racing cold start can collide here; never take the request down for it.
    cached.indexed = false;
    console.error('[db] index creation failed:', err.message);
  }
}

export async function getDb() {
  const client = await connect();
  const db = client.db(dbName);
  await ensureIndexes(db);
  return db;
}

export const Collections = {
  users:         (db) => db.collection('users'),
  sessions:      (db) => db.collection('sessions'),
  bookings:      (db) => db.collection('bookings'),
  counters:      (db) => db.collection('counters'),
  loginAttempts: (db) => db.collection('loginAttempts'),
  services:      (db) => db.collection('services'),
  servicePriceHistory: (db) => db.collection('servicePriceHistory'),
};

/**
 * findOneAndUpdate changed shape across driver majors: <=4 wrapped the document
 * as `{ value: <doc|null>, lastErrorObject, ok }`, while >=5 (this project pins
 * ^6) returns the document itself. Detect the wrapper by its metadata keys, not
 * by the presence of a `value` field - the counters documents store their tally
 * in a field of exactly that name, and reading `res.value.value` off a driver-6
 * result silently yielded `undefined`, which is what made every booking
 * reference come out as 000001.
 */
export function unwrapUpdated(res) {
  if (!res) return null;
  if ('lastErrorObject' in res || 'ok' in res) return res.value ?? null;
  return res;
}

/** Atomic per-name counter, used for human-readable booking references.
    Every call consumes a number, so a booking that is awaiting payment, failed
    or was abandoned still holds its own reference and the next customer gets
    the following one. */
export async function nextSequence(db, name) {
  const doc = unwrapUpdated(
    await Collections.counters(db).findOneAndUpdate(
      { _id: name },
      { $inc: { value: 1 } },
      { upsert: true, returnDocument: 'after' }
    )
  );
  const seq = doc?.value;
  // Never fall back to a constant: handing out a number the counter did not
  // issue is how two bookings end up sharing a reference.
  if (!Number.isInteger(seq) || seq < 1) {
    throw new Error(`[db] counter "${name}" returned no usable sequence (got ${JSON.stringify(doc)})`);
  }
  return seq;
}
