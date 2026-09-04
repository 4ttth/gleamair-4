/* POST /api/auth/register - customer self-registration.

   Registration is deliberately customer-only. Staff, admin and superadmin
   accounts are created exclusively by a superadmin through /api/users, so the
   role can never be chosen by the person signing up. */

import { Collections, getDb } from '../_lib/db.js';
import { conflict, ok, readJson, route } from '../_lib/http.js';
import { createSession, hashPassword, publicUser } from '../_lib/auth.js';
import * as V from '../_lib/validate.js';

async function register(req, res) {
  const body = await readJson(req);

  // Note the role is never read from the request.
  const doc = {
    role: 'customer',
    firstName: V.string(body.firstName, 'First name', { max: 80 }),
    lastName:  V.string(body.lastName, 'Last name', { max: 80 }),
    email:     V.email(body.email),
    phone:     V.phone(body.phone),
    address:   V.address(body.address),
    active:    true,
    createdAt: new Date(),
    updatedAt: new Date(),

    // Reserved for the later Odoo merge; populated by the sync script.
    odooPartnerId: null,
    odooUserId: null,
  };
  const password = V.password(body.password);

  const db = await getDb();
  const users = Collections.users(db);

  if (await users.findOne({ email: doc.email }, { projection: { _id: 1 } })) {
    throw conflict('An account with that email address already exists. Try signing in instead.', { field: 'email' });
  }

  doc.passwordHash = await hashPassword(password);

  let inserted;
  try {
    inserted = await users.insertOne(doc);
  } catch (err) {
    // Two simultaneous submissions can both pass the check above; the unique
    // index is the real guarantee.
    if (err?.code === 11000) {
      throw conflict('An account with that email address already exists. Try signing in instead.', { field: 'email' });
    }
    throw err;
  }

  const user = { ...doc, _id: inserted.insertedId };

  // Sign the customer straight in - the brief calls for landing on the
  // dashboard immediately after registering.
  await createSession(res, user);

  return ok(res, { user: publicUser(user), redirect: '/app/dashboard' });
}

export default route({ POST: register });
