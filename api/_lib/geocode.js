/* ─── Address → coordinates ──────────────────────────────────────────────────
   Turns a customer's saved PSGC address into an approximate map point, so the
   booking map opens over their own barangay instead of over Gleamair's office.

   OpenStreetMap's Nominatim is used for the same reason its tiles are: no API
   key, no billing account. Its usage policy asks for an identifying
   User-Agent, no more than one request a second, and that results are cached
   rather than re-requested — hence the geocache collection. A locality does
   not move, so a hit is kept for months and one lookup serves every customer
   in that barangay from then on.

   Nothing here is allowed to break a booking: every failure path returns null
   and the caller falls back to the office coordinates.
   ────────────────────────────────────────────────────────────────────────── */

import { Collections } from './db.js';
import { tooMany } from './http.js';

const PROVIDER = process.env.GEOCODER_URL || 'https://nominatim.openstreetmap.org/search';
// Nominatim rejects anonymous traffic; identify the deployment that is asking.
const CONTACT  = process.env.GEOCODER_CONTACT || 'https://www.gleamaire.com';

const REQUEST_TIMEOUT_MS = 4000;
// Total time this is allowed to spend on the provider, so a slow geocoder
// cannot hold a serverless invocation open through the whole cascade.
const BUDGET_MS = 7000;

const HIT_TTL_MS  = 180 * 24 * 60 * 60 * 1000; // localities do not move
const MISS_TTL_MS = 12 * 60 * 60 * 1000;       // a miss may be a bad day, not a bad name

// Place search. Nominatim's policy forbids autocomplete-style traffic, so the
// page searches on submit only and every answer is cached; this quota is the
// backstop that keeps one impatient session from becoming that traffic anyway.
const SEARCH_WINDOW_MS = 5 * 60 * 1000;
const SEARCH_QUOTA = 40;
const SEARCH_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const SEARCH_LIMIT = 5;

/** How far to zoom in for a point of each accuracy. */
export const PRECISION_ZOOM = { barangay: 16, city: 14, province: 11 };

/* PSGC names carry bookkeeping a gazetteer does not recognise:
   "Poblacion (Bgy. 1)", "San Roque (Pob.)", "Del Pilar (Bgy. 3 & 4)". Strip the
   parenthetical and the Pob. marker; keep the name a map would actually list. */
function cleanName(name) {
  return String(name || '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\bPob\.?\b/gi, ' ')
    .replace(/\bBgy\.?\s*\d+[^,]*/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/[\s,\-]+$/, '')
    .trim();
}

/** Coarsening cascade: barangay first, then its city, then its province. */
function levelsFor(address) {
  const city     = cleanName(address.cityName);
  const province = cleanName(address.provinceName);
  const barangay = cleanName(address.barangayName);

  const levels = [];
  if (barangay && city) {
    levels.push({ level: 'barangay', code: address.barangayCode, parts: [barangay, city, province] });
  }
  if (city) levels.push({ level: 'city', code: address.cityCode, parts: [city, province] });
  if (province) levels.push({ level: 'province', code: address.provinceCode, parts: [province] });
  return levels.filter((l) => l.code);
}

async function readCache(db, key) {
  try {
    const doc = await Collections.geocache(db).findOne({ _id: key });
    if (!doc) return null;
    // A TTL index does the real eviction, but Mongo only sweeps every minute
    // or so — check the date here too rather than trust a stale row.
    if (doc.expiresAt && new Date(doc.expiresAt).getTime() < Date.now()) return null;
    return doc;
  } catch (err) {
    console.error('[geocode] cache read failed:', err.message);
    return null;
  }
}

async function writeCache(db, key, doc) {
  try {
    await Collections.geocache(db).updateOne(
      { _id: key },
      { $set: { ...doc, _id: key, cachedAt: new Date() } },
      { upsert: true }
    );
  } catch (err) {
    // A cache that will not write is a performance problem, not a failure.
    console.error('[geocode] cache write failed:', err.message);
  }
}

/**
 * One provider call. Never throws. Returns:
 *   { ok: true, point }   located, or ok with point null when the gazetteer
 *                         genuinely has no such place
 *   { ok: false }         the provider could not be reached or errored, which
 *                         says nothing about the address and must not be
 *                         cached as if it did
 */
async function askProvider(query) {
  const url = new URL(PROVIDER);
  url.searchParams.set('q', `${query}, Philippines`);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '1');
  url.searchParams.set('countrycodes', 'ph');
  url.searchParams.set('addressdetails', '0');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': `GleamairPortal/1.0 (${CONTACT})`,
        Accept: 'application/json',
        'Accept-Language': 'en',
      },
      signal: controller.signal,
    });
    if (!response.ok) {
      console.error(`[geocode] provider returned ${response.status} for "${query}"`);
      return { ok: false };
    }
    const results = await response.json();
    const hit = Array.isArray(results) ? results[0] : null;
    if (!hit) return { ok: true, point: null };

    const lat = Number(hit.lat);
    const lng = Number(hit.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { ok: true, point: null };
    return { ok: true, point: { lat, lng } };
  } catch (err) {
    console.error('[geocode] provider unreachable:', err.message);
    return { ok: false };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Approximate coordinates for a PSGC address.
 * Resolves to { lat, lng, precision, zoom, label } or null when nothing at any
 * level could be located.
 */
export async function geocodeAddress(db, address) {
  if (!address || typeof address !== 'object') return null;

  const started = Date.now();
  for (const { level, code, parts } of levelsFor(address)) {
    const query = parts.filter(Boolean).join(', ');
    const key = `${level}:${code}`;

    const cached = await readCache(db, key);
    if (cached) {
      if (cached.found === false) continue; // known-bad name; try a coarser one
      return {
        lat: cached.lat,
        lng: cached.lng,
        precision: level,
        zoom: PRECISION_ZOOM[level],
        label: cached.label || query,
      };
    }

    // Out of time: return nothing rather than make the customer wait. The
    // next booking on this address will find a warm cache.
    if (Date.now() - started > BUDGET_MS) break;

    const answer = await askProvider(query);
    // The provider is down. Coarsening the query will not help and would only
    // add load to something already struggling, so stop and let the caller
    // fall back. Nothing is cached: this told us nothing about the address.
    if (!answer.ok) break;

    const { point } = answer;
    const expiresAt = new Date(Date.now() + (point ? HIT_TTL_MS : MISS_TTL_MS));
    await writeCache(db, key, { level, code, label: query, found: !!point, ...(point || {}), expiresAt });

    if (point) {
      return { ...point, precision: level, zoom: PRECISION_ZOOM[level], label: query };
    }
  }
  return null;
}

/* ─── Place search ───────────────────────────────────────────────────────────
   Lets someone type "SM City Olongapo" or a street and move the map there
   instead of dragging across the province. Same provider, same cache, and the
   results are confined to the Philippines - this is a booking form, not a
   world atlas.
   ────────────────────────────────────────────────────────────────────────── */

/** Throws 429 once a user has spent their share of the provider's goodwill. */
export async function checkSearchQuota(db, userId) {
  const key = `geosearch:${userId}`;
  const now = new Date();
  try {
    const rec = await Collections.apiLimits(db).findOne({ key });
    if (rec && rec.expiresAt > now && rec.count >= SEARCH_QUOTA) {
      throw tooMany('That is a lot of searches in a short time. Please wait a few minutes, or drag the marker instead.');
    }
    // A window that has run out is replaced rather than incremented, so the
    // count cannot creep up across windows.
    if (!rec || rec.expiresAt <= now) {
      await Collections.apiLimits(db).updateOne(
        { key },
        { $set: { key, count: 1, expiresAt: new Date(Date.now() + SEARCH_WINDOW_MS) } },
        { upsert: true }
      );
    } else {
      await Collections.apiLimits(db).updateOne({ key }, { $inc: { count: 1 } });
    }
  } catch (err) {
    if (err?.status === 429) throw err;
    // A quota that cannot be read is not a reason to refuse the search; the
    // provider's own rate limiting still applies.
    console.error('[geocode] quota check failed:', err.message);
  }
}

/** Cache key for a search. Case and spacing are not meaningful to a gazetteer. */
const searchKey = (query) => `q:${query.toLowerCase().replace(/\s+/g, ' ').trim()}`;

/**
 * Free-text place search, Philippines only.
 * Resolves to an array of { lat, lng, label }, empty when nothing matched or
 * the provider could not be reached - the caller shows "no matches" either
 * way, since neither is something the customer can act on differently.
 */
export async function searchPlaces(db, rawQuery) {
  const query = String(rawQuery || '').trim().slice(0, 120);
  if (query.length < 3) return [];

  const key = searchKey(query);
  const cached = await readCache(db, key);
  if (cached) return cached.results || [];

  const url = new URL(PROVIDER);
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', String(SEARCH_LIMIT));
  url.searchParams.set('countrycodes', 'ph');
  url.searchParams.set('addressdetails', '0');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let payload;
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': `GleamairPortal/1.0 (${CONTACT})`,
        Accept: 'application/json',
        'Accept-Language': 'en',
      },
      signal: controller.signal,
    });
    if (!response.ok) {
      console.error(`[geocode] search returned ${response.status} for "${query}"`);
      return [];
    }
    payload = await response.json();
  } catch (err) {
    // Not cached: an outage says nothing about the search terms.
    console.error('[geocode] search unreachable:', err.message);
    return [];
  } finally {
    clearTimeout(timer);
  }

  const results = (Array.isArray(payload) ? payload : [])
    .map((hit) => ({
      lat: Number(hit.lat),
      lng: Number(hit.lon),
      label: String(hit.display_name || '').slice(0, 200),
    }))
    .filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lng) && r.label)
    .slice(0, SEARCH_LIMIT);

  await writeCache(db, key, {
    kind: 'search', query, results,
    expiresAt: new Date(Date.now() + (results.length ? SEARCH_TTL_MS : MISS_TTL_MS)),
  });
  return results;
}
