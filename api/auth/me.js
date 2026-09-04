/* GET /api/auth/me - who is signed in. Every portal page calls this on load
   and redirects to /login on 401, so a page is never rendered for a stale
   session. */

import { ok, route, unauthorized } from '../_lib/http.js';
import { currentUser, publicUser } from '../_lib/auth.js';
import { landingFor } from './login.js';

async function me(req, res) {
  const user = await currentUser(req);
  if (!user) throw unauthorized('Please sign in to continue.');
  return ok(res, { user: publicUser(user), landing: landingFor(user.role) });
}

export default route({ GET: me });
