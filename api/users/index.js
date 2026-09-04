/* /api/users
     GET  - admin+ list accounts (used for the technician picker and the
            superadmin user table)
     POST - superadmin only: create an account of ANY role

   Self-registration (/api/auth/register) can only ever produce a customer.
   This is the only route that can mint staff, admin or superadmin accounts. */

import { Collections, getDb } from '../_lib/db.js';
import { conflict, forbidden, ok, readJson, route } from '../_lib/http.js';
import { hashPassword, publicUser, requireAtLeast, requireRole } from '../_lib/auth.js';
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

export default route({ GET: list, POST: create });
