/* /api/users/:id - superadmin only.
     PATCH  - edit details, change role, activate/deactivate
     DELETE - remove the account

   A superadmin can act on every account except their own role and their own
   existence, so the last superadmin cannot lock themselves out or delete the
   only account able to create replacements. */

import { ObjectId } from 'mongodb';
import { Collections, getDb, unwrapUpdated } from '../_lib/db.js';
import { badRequest, conflict, forbidden, notFound, ok, readJson, route } from '../_lib/http.js';
import { destroyUserSessions, hashPassword, publicUser, requireRole } from '../_lib/auth.js';
import * as V from '../_lib/validate.js';

function targetId(req) {
  const raw = req.query?.id ?? new URL(req.url, 'http://localhost').pathname.split('/').pop();
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

export default route({ PATCH: patch, DELETE: remove });
