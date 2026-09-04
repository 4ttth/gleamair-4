/* /api/services/:code
     GET   - one service, with its price-change history (admin+)
     PATCH - change what this service costs (admin+)

   A PATCH here takes effect immediately: the next booking created, and the
   PayMongo charge it produces, use the new figures. Bookings that already
   exist keep the amounts they were quoted - see api/_lib/services.js. */

import { getDb } from '../_lib/db.js';
import { notFound, ok, readJson, route } from '../_lib/http.js';
import { requireAtLeast } from '../_lib/auth.js';
import { adminService, getService, priceHistory, updateServicePricing } from '../_lib/services.js';

function codeFromUrl(req) {
  const raw = req.query?.code ?? new URL(req.url, 'http://localhost').pathname.split('/').pop();
  return decodeURIComponent(String(raw || '')).toUpperCase();
}

async function getOne(req, res) {
  await requireAtLeast(req, 'admin');
  const db = await getDb();
  const code = codeFromUrl(req);

  const service = await getService(db, code);
  if (!service) throw notFound('That service does not exist.');

  return ok(res, { service: adminService(service), history: await priceHistory(db, code) });
}

async function patch(req, res) {
  const actor = await requireAtLeast(req, 'admin');
  const db = await getDb();
  const body = await readJson(req);

  const updated = await updateServicePricing(db, codeFromUrl(req), body, actor);
  return ok(res, { service: adminService(updated) });
}

export default route({ GET: getOne, PATCH: patch });
