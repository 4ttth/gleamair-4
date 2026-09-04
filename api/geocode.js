/* GET /api/geocode        - where to open the map for the signed-in customer
   GET /api/geocode?q=...  - place search, so they can jump the map to a
                             landmark instead of dragging across a province

   Both need a session. Without `q` the address comes from the caller's own
   user record rather than the query string: that answer is about them, not a
   general-purpose geocoding proxy for anyone who finds the URL. The search
   form is necessarily open-ended, so it is quota'd per user and confined to
   the Philippines.

   Always 200 apart from the quota. A caller that cannot be placed gets
   { location: null } and falls back to a sensible default, because a map pin
   is a convenience and must never be the reason a booking cannot be made. */

import { getDb } from './_lib/db.js';
import { ok, route } from './_lib/http.js';
import { requireUser } from './_lib/auth.js';
import { checkSearchQuota, geocodeAddress, searchPlaces } from './_lib/geocode.js';

// Six decimals is roughly 10 cm - far finer than any of this deserves, and it
// keeps the payload from carrying false precision.
const round = (n) => Math.round(n * 1e6) / 1e6;

async function locate(req, res) {
  const user = await requireUser(req);
  const query = new URL(req.url, 'http://localhost').searchParams.get('q');
  const db = await getDb();

  if (query != null) {
    await checkSearchQuota(db, String(user._id));
    const results = await searchPlaces(db, query);
    return ok(res, {
      results: results.map((r) => ({ lat: round(r.lat), lng: round(r.lng), label: r.label })),
    });
  }

  if (!user.address) return ok(res, { location: null });

  const point = await geocodeAddress(db, user.address);
  if (!point) return ok(res, { location: null });

  return ok(res, {
    location: {
      lat: round(point.lat),
      lng: round(point.lng),
      precision: point.precision,
      zoom: point.zoom,
      label: point.label,
    },
  });
}

export default route({ GET: locate });
