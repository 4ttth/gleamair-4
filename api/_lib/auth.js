/* Password hashing, server-side sessions and role guards.

   Passwords use scrypt from Node's standard library rather than bcrypt or
   argon2: it is memory-hard, needs no native build step (which is a common
   source of serverless deploy failures), and has no third-party supply chain.

   Sessions are records in MongoDB, not JWTs. The cookie carries a random
   token; only its SHA-256 hash is stored. That means a database leak does not
   hand an attacker usable sessions, and signing out or deleting a user
   revokes access immediately - which a stateless JWT cannot do. */

import crypto from 'node:crypto';
import { ObjectId } from 'mongodb';
import { Collections, getDb } from './db.js';
import { clearCookie, forbidden, parseCookies, setCookie, unauthorized } from './http.js';
import { ROLE_RANK } from './validate.js';

export const SESSION_COOKIE = 'gleam_session';
const SESSION_DAYS = 7;

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };

const scrypt = (password, salt) =>
  new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p },
      (err, key) => (err ? reject(err) : resolve(key)));
  });

/** Returns a self-describing string: scrypt$N$r$p$salt$hash */
export async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt);
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('base64')}$${key.toString('base64')}`;
}

export async function verifyPassword(password, stored) {
  if (typeof stored !== 'string') return false;
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;

  const [, N, r, p, saltB64, hashB64] = parts;
  const salt = Buffer.from(saltB64, 'base64');
  const expected = Buffer.from(hashB64, 'base64');

  const actual = await new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, expected.length,
      { N: Number(N), r: Number(r), p: Number(p) },
      (err, key) => (err ? reject(err) : resolve(key)));
  });

  if (actual.length !== expected.length) return false;
  // Constant-time compare so response timing does not leak the hash.
  return crypto.timingSafeEqual(actual, expected);
}

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

export async function createSession(res, user) {
  const db = await getDb();
  const token = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400 * 1000);

  await Collections.sessions(db).insertOne({
    tokenHash: hashToken(token),
    userId: user._id,
    role: user.role,
    createdAt: new Date(),
    expiresAt,
  });

  setCookie(res, SESSION_COOKIE, token, { maxAge: SESSION_DAYS * 86400, expires: expiresAt });
  return token;
}

export async function destroySession(req, res) {
  const token = parseCookies(req)[SESSION_COOKIE];
  if (token) {
    const db = await getDb();
    await Collections.sessions(db).deleteOne({ tokenHash: hashToken(token) });
  }
  clearCookie(res, SESSION_COOKIE);
}

/** Invalidate every session for a user - used when a superadmin deletes or
    demotes an account, so the change takes effect immediately. */
export async function destroyUserSessions(db, userId) {
  await Collections.sessions(db).deleteMany({ userId: new ObjectId(userId) });
}

/** Resolves the signed-in user, or null. Never throws for anonymous callers. */
export async function currentUser(req) {
  const token = parseCookies(req)[SESSION_COOKIE];
  if (!token) return null;

  const db = await getDb();
  const session = await Collections.sessions(db).findOne({ tokenHash: hashToken(token) });
  // The TTL index sweeps periodically rather than instantly, so check too.
  if (!session || session.expiresAt <= new Date()) return null;

  const user = await Collections.users(db).findOne({ _id: session.userId });
  if (!user || user.active === false) return null;

  return user;
}

export async function requireUser(req) {
  const user = await currentUser(req);
  if (!user) throw unauthorized('Please sign in to continue.');
  return user;
}

/** Requires one of the named roles exactly. */
export async function requireRole(req, roles) {
  const user = await requireUser(req);
  const allowed = Array.isArray(roles) ? roles : [roles];
  if (!allowed.includes(user.role)) {
    throw forbidden('Your account does not have access to this area.');
  }
  return user;
}

/** Requires at least the given role in the staff < admin < superadmin order. */
export async function requireAtLeast(req, minimum) {
  const user = await requireUser(req);
  if ((ROLE_RANK[user.role] ?? -1) < ROLE_RANK[minimum]) {
    throw forbidden('Your account does not have access to this area.');
  }
  return user;
}

/** The shape sent to the browser. Never includes passwordHash. */
export function publicUser(user) {
  return {
    id: String(user._id),
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: `${user.firstName} ${user.lastName}`.trim(),
    email: user.email,
    phone: user.phone,
    address: user.address ?? null,
    active: user.active !== false,
    createdAt: user.createdAt,
  };
}

/* ─── Login throttling ──────────────────────────────────────────────────────
   Stored in Mongo rather than memory: serverless instances are per-request and
   an in-memory counter would reset constantly, giving no real protection. */

const MAX_ATTEMPTS = 8;
const WINDOW_MIN = 15;

export async function checkLoginThrottle(db, key) {
  const rec = await Collections.loginAttempts(db).findOne({ key });
  if (rec && rec.count >= MAX_ATTEMPTS && rec.expiresAt > new Date()) {
    const mins = Math.max(1, Math.ceil((rec.expiresAt - Date.now()) / 60000));
    throw forbidden(`Too many sign-in attempts. Please try again in ${mins} minute${mins === 1 ? '' : 's'}.`);
  }
}

export async function recordFailedLogin(db, key) {
  await Collections.loginAttempts(db).updateOne(
    { key },
    {
      $inc: { count: 1 },
      $setOnInsert: { expiresAt: new Date(Date.now() + WINDOW_MIN * 60000) },
    },
    { upsert: true }
  );
}

export async function clearLoginThrottle(db, key) {
  await Collections.loginAttempts(db).deleteOne({ key });
}
