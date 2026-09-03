/* POST /api/bootstrap - creates the FIRST superadmin, once.

   Chicken-and-egg problem: only a superadmin can create accounts with elevated
   roles, but a fresh database has none. This route is guarded two ways:
   it requires the BOOTSTRAP_TOKEN environment variable, and it refuses to run
   at all once any superadmin exists.

   Delete BOOTSTRAP_TOKEN from the Vercel project once you have signed in. */

import crypto from 'node:crypto';
import { Collections, getDb } from './_lib/db.js';
import { ApiError, conflict, forbidden, ok, readJson, route } from './_lib/http.js';
import { hashPassword, publicUser } from './_lib/auth.js';
import * as V from './_lib/validate.js';

function tokenMatches(provided) {
  const expected = process.env.BOOTSTRAP_TOKEN;
  if (!expected) return false;
  const a = Buffer.from(String(provided ?? ''), 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

async function bootstrap(req, res) {
  if (!process.env.BOOTSTRAP_TOKEN) {
    throw new ApiError(404, 'Not found.');
  }

  const body = await readJson(req);
  if (!tokenMatches(body.token)) {
    throw forbidden('Invalid bootstrap token.');
  }

  const db = await getDb();
  const users = Collections.users(db);

  if (await users.findOne({ role: 'superadmin' }, { projection: { _id: 1 } })) {
    throw conflict('A superadmin already exists. Remove BOOTSTRAP_TOKEN from your environment variables.');
  }

  const doc = {
    role: 'superadmin',
    firstName: V.string(body.firstName, 'First name', { max: 80 }),
    lastName:  V.string(body.lastName, 'Last name', { max: 80 }),
    email:     V.email(body.email),
    phone:     V.phone(body.phone),
    address:   null,
    active:    true,
    createdAt: new Date(),
    updatedAt: new Date(),
    odooPartnerId: null,
    odooUserId: null,
    passwordHash: await hashPassword(V.password(body.password)),
  };

  const inserted = await users.insertOne(doc);
  console.log(`[bootstrap] superadmin created: ${doc.email}`);

  return ok(res, {
    user: publicUser({ ...doc, _id: inserted.insertedId }),
    next: 'Sign in at /login, then delete BOOTSTRAP_TOKEN from your Vercel environment variables.',
  });
}

export default route({ POST: bootstrap });
