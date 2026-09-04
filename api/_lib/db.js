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

/** Atomic per-name counter, used for human-readable booking references. */
export async function nextSequence(db, name) {
  const res = await Collections.counters(db).findOneAndUpdate(
    { _id: name },
    { $inc: { value: 1 } },
    { upsert: true, returnDocument: 'after' }
  );
  return (res?.value ?? res)?.value ?? 1;
}
