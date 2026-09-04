/* GET /api/services - the live service catalogue and its current prices.

   Public on purpose: a price list is public information, and serving it from
   one place means the booking page, the dashboard and the admin screen can
   never disagree about what a service costs. Callers with an admin session
   additionally get the audit trail. */

import { getDb } from '../_lib/db.js';
import { ok, route } from '../_lib/http.js';
import { currentUser } from '../_lib/auth.js';
import { adminService, listServices, publicService } from '../_lib/services.js';
import { MAX_CHARGE, MIN_CHARGE, paymentConfigStatus } from '../_lib/paymongo.js';
import { ROLE_RANK } from '../_lib/validate.js';

async function list(req, res) {
  const db = await getDb();
  // currentUser never throws for an anonymous caller, so an unauthenticated
  // request still gets the price list - just without the audit fields.
  const viewer = await currentUser(req);
  const isAdmin = (ROLE_RANK[viewer?.role] ?? -1) >= ROLE_RANK.admin;

  const docs = await listServices(db);
  return ok(res, {
    services: docs.map(isAdmin ? adminService : publicService),
    // The bounds the admin form validates against, so it can say no before
    // the request is made rather than after.
    ...(isAdmin ? {
      limits: { min: MIN_CHARGE, max: MAX_CHARGE, currency: 'PHP' },
      // Whether payments can actually be taken. Presence of settings only -
      // no key material ever leaves the server.
      payments: paymentConfigStatus(),
    } : {}),
  });
}

export default route({ GET: list });
