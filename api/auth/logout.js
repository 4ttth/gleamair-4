/* POST /api/auth/logout - deletes the session record and clears the cookie. */

import { ok, route } from '../_lib/http.js';
import { destroySession } from '../_lib/auth.js';

async function logout(req, res) {
  await destroySession(req, res);
  return ok(res, { redirect: '/login' });
}

export default route({ POST: logout });
