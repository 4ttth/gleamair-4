/* POST /api/auth/login - one entry point for every role.
   The response says where to go next; the browser does not decide. */

import { Collections, getDb } from '../_lib/db.js';
import { ApiError, clientIp, ok, readJson, route } from '../_lib/http.js';
import {
  checkLoginThrottle, clearLoginThrottle, createSession,
  publicUser, recordFailedLogin, verifyPassword,
} from '../_lib/auth.js';
import * as V from '../_lib/validate.js';

export const landingFor = (role) => (role === 'customer' ? '/app/dashboard' : '/app/admin');

async function login(req, res) {
  const body = await readJson(req);
  const email = V.email(body.email);
  const password = typeof body.password === 'string' ? body.password : '';

  const db = await getDb();
  // Throttle per email+IP so one attacker cannot lock out a real customer
  // simply by guessing against their address from elsewhere.
  const throttleKey = `${email}|${clientIp(req)}`;
  await checkLoginThrottle(db, throttleKey);

  const user = await Collections.users(db).findOne({ email });

  // Same message whether the address is unknown or the password is wrong, so
  // the form cannot be used to enumerate which emails have accounts.
  const invalid = new ApiError(401, 'Email or password is incorrect.');

  if (!user) {
    await recordFailedLogin(db, throttleKey);
    throw invalid;
  }
  if (!(await verifyPassword(password, user.passwordHash))) {
    await recordFailedLogin(db, throttleKey);
    throw invalid;
  }
  if (user.active === false) {
    throw new ApiError(403, 'This account has been deactivated. Please contact Gleamair for assistance.');
  }

  await clearLoginThrottle(db, throttleKey);
  await createSession(res, user);

  return ok(res, { user: publicUser(user), redirect: landingFor(user.role) });
}

export default route({ POST: login });
