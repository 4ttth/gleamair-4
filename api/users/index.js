/* /api/users            - the account collection
   /api/users/:id        - one account

   Both paths are served by this one function, and deliberately so: Vercel's
   Hobby plan allows twelve Serverless Functions per deployment and every file
   under api/ is one of them. `/api/users/:id` has no file of its own, so it
   falls through to the rewrite in vercel.json, which hands it here with the id
   as a query parameter. Keep that rewrite and this file in step.

     GET    - admin+ list accounts (technician picker, superadmin user table)
     POST   - superadmin only: create an account of ANY role
     PATCH  - superadmin only: edit details, change role, activate/deactivate
     DELETE - superadmin only: remove the account

   Self-registration (/api/auth/register) can only ever produce a customer.
   This is the only route that can mint staff, admin or superadmin accounts.

   A superadmin can act on every account except their own role and their own
   existence, so the last superadmin cannot lock themselves out or delete the
   only account able to create replacements. */

import { ObjectId } from 'mongodb';
import { Collections, getDb, unwrapUpdated } from '../_lib/db.js';
import { conflict, forbidden, notFound, ok, readJson, route } from '../_lib/http.js';
import {
  destroyUserSessions, hashPassword, publicUser, requireAtLeast, requireRole,
} from '../_lib/auth.js';
import * as V from '../_lib/validate.js';

const LIST_LIMIT = 500;

async function list(req, res) {
  const viewer = await requireAtLeast(req, 'admin');
  const db = await getDb();

  const url = new URL(req.url, 'http://localhost');
  const query = {};

  const roleParam = url.searchParams.get('role');
  if (roleParam) {
    const roles = roleParam.split(',').map((r) => r.trim()).filter((r) => V.ROLES.includes(r));
    if (roles.length) query.role = { $in: roles };
  }

  const search = url.searchParams.get('q');
  if (search) {
    // Escape the input so a user-supplied '.' or '*' cannot alter the pattern.
    const safe = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rx = new RegExp(safe, 'i');
    query.$or = [{ firstName: rx }, { lastName: rx }, { email: rx }, { phone: rx }];
  }

  const docs = await Collections.users(db)
    .find(query, { projection: { passwordHash: 0 } })
    .sort({ createdAt: -1 })
    .limit(LIST_LIMIT)
    .toArray();

  return ok(res, { users: docs.map(publicUser), viewerRole: viewer.role });
}

async function create(req, res) {
  await requireRole(req, 'superadmin');
  const body = await readJson(req);

  const role = V.role(body.role);
  const doc = {
    role,
    firstName: V.string(body.firstName, 'First name', { max: 80 }),
    lastName:  V.string(body.lastName, 'Last name', { max: 80 }),
    email:     V.email(body.email),
    phone:     V.phone(body.phone),
    // Only customers have a service address; staff accounts do not need one.
    address:   role === 'customer' ? V.address(body.address) : null,
    active:    body.active !== false,
    createdAt: new Date(),
    updatedAt: new Date(),
    odooPartnerId: null,
    odooUserId: null,
  };
  const password = V.password(body.password);

  const db = await getDb();
  const users = Collections.users(db);

  if (await users.findOne({ email: doc.email }, { projection: { _id: 1 } })) {
    throw conflict('An account with that email address already exists.', { field: 'email' });
  }

  doc.passwordHash = await hashPassword(password);

  try {
    const inserted = await users.insertOne(doc);
    return ok(res, { user: publicUser({ ...doc, _id: inserted.insertedId }) });
  } catch (err) {
    if (err?.code === 11000) {
      throw conflict('An account with that email address already exists.', { field: 'email' });
    }
    throw err;
  }
}

/* ── One account ───────────────────────────────────────────────────────── */

/* Reads the account id from whichever shape the request arrives in: the query
   the rewrite builds, a query string the runtime did not parse for us, or the
   last path segment if this is ever a file-based dynamic route again. Nothing
   here guesses: a PATCH or DELETE aimed at the collection itself yields
   "users", which is not an ObjectId, and is refused as not found rather than
   acting on some other account. */
function targetId(req) {
  const url = new URL(req.url || '', 'http://localhost');
  const raw = req.query?.id
    ?? url.searchParams.get('id')
    ?? url.pathname.split('/').pop();

  const id = decodeURIComponent(String(raw || ''));
  if (!ObjectId.isValid(id)) throw notFound('That account could not be found.');
  return new ObjectId(id);
}

async function patch(req, res) {
  const actor = await requireRole(req, 'superadmin');
  const id = targetId(req);
  const db = await getDb();

  const target = await Collections.users(db).findOne({ _id: id });
  if (!target) throw notFound('That account could not be found.');

  const isSelf = String(target._id) === String(actor._id);
  const body = await readJson(req);
  const set = { updatedAt: new Date() };

  if (body.firstName !== undefined) set.firstName = V.string(body.firstName, 'First name', { max: 80 });
  if (body.lastName  !== undefined) set.lastName  = V.string(body.lastName, 'Last name', { max: 80 });
  if (body.phone     !== undefined) set.phone     = V.phone(body.phone);
  if (body.address   !== undefined && body.address !== null) set.address = V.address(body.address);

  if (body.email !== undefined) {
    const email = V.email(body.email);
    if (email !== target.email) {
      if (await Collections.users(db).findOne({ email }, { projection: { _id: 1 } })) {
        throw conflict('Another account already uses that email address.', { field: 'email' });
      }
      set.email = email;
    }
  }

  if (body.role !== undefined) {
    const role = V.role(body.role);
    if (isSelf && role !== target.role) {
      throw forbidden('You cannot change your own role. Ask another superadmin to do it.');
    }
    set.role = role;
  }

  if (body.active !== undefined) {
    if (isSelf && body.active === false) {
      throw forbidden('You cannot deactivate your own account.');
    }
    set.active = Boolean(body.active);
  }

  if (body.password !== undefined && body.password !== '') {
    set.passwordHash = await hashPassword(V.password(body.password));
  }

  const updated = await Collections.users(db).findOneAndUpdate(
    { _id: id }, { $set: set }, { returnDocument: 'after', projection: { passwordHash: 0 } }
  );
  const doc = unwrapUpdated(updated) ?? (await Collections.users(db).findOne({ _id: id }, { projection: { passwordHash: 0 } }));

  // A demotion, deactivation or password change must take effect now, not
  // whenever the target's existing cookie happens to expire.
  if (set.role || set.active === false || set.passwordHash) {
    await destroyUserSessions(db, id);
  }

  return ok(res, { user: publicUser(doc) });
}

async function remove(req, res) {
  const actor = await requireRole(req, 'superadmin');
  const id = targetId(req);

  if (String(id) === String(actor._id)) {
    throw forbidden('You cannot delete your own account.');
  }

  const db = await getDb();
  const target = await Collections.users(db).findOne({ _id: id });
  if (!target) throw notFound('That account could not be found.');

  // Bookings are financial records and must outlive the account. Detach the
  // link instead of cascading the delete; the snapshot on each booking keeps
  // the job card readable.
  await Collections.bookings(db).updateMany({ customerId: id }, { $set: { customerId: null } });
  await Collections.bookings(db).updateMany(
    { assignedStaffId: id },
    { $set: { assignedStaffId: null, assignedStaffName: null } }
  );

  await destroyUserSessions(db, id);
  await Collections.users(db).deleteOne({ _id: id });

  return ok(res, { deleted: String(id) });
}

export default route({ GET: list, POST: create, PATCH: patch, DELETE: remove });
