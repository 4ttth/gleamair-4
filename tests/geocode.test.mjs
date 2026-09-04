/* Where the booking map opens. The point of the feature is that a customer in
   Bataan is not asked to drag a marker across a province from Olongapo, so
   these tests are mostly about the cascade: barangay, then city, then
   province, and never an error the customer can see. */

import { call, check, sessionFrom, summary } from './harness.js';
import { resetDb, dump } from './fake-db.js';

process.env.PAYMONGO_SECRET_KEY = 'sk_test_fake';
process.env.PUBLIC_BASE_URL = 'https://gleamaire.com';

/* Stands in for Nominatim. `answers` maps the start of a query to the
   coordinates it should return; anything unmatched is a miss, which is what a
   real gazetteer does with a barangay name it has never heard of. Matching on
   the start matters - "Abucay, Bataan" also appears inside the barangay-level
   query, and answering that one would hide the fallback this tests. */
let asked = [];
let answers = {};
let failNext = false;

globalThis.fetch = async (url) => {
  const query = new URL(url).searchParams.get('q') || '';
  asked.push(query);
  if (failNext) {
    failNext = false;
    throw new Error('getaddrinfo ENOTFOUND nominatim.openstreetmap.org');
  }
  const hit = Object.entries(answers).find(([needle]) => query.startsWith(needle));
  return new Response(JSON.stringify(hit ? [{ lat: String(hit[1][0]), lon: String(hit[1][1]) }] : []),
    { status: 200 });
};

const register = (await import('../api/auth/register.js')).default;
const geocode  = (await import('../api/geocode.js')).default;

const sess = (t) => ({ cookies: { gleam_session: t } });
const ADDR = { line1: '12 Domingo St', line2: '', provinceCode: '0308', provinceName: 'Bataan',
  cityCode: '030801', cityName: 'Abucay', barangayCode: '030801001', barangayName: 'Bangkal' };

resetDb();
let r = await call(register, { method: 'POST', body: { firstName: 'Juan', lastName: 'Cruz',
  email: 'juan@example.com', phone: '09171234567', address: ADDR, password: 'Aircon1!' } });
const custTok = sessionFrom(r);

console.log('\n=== Geocoding a customer address ===');

r = await call(geocode, { method: 'GET' });
check('anonymous caller -> 401', r.statusCode === 401, r.body);

answers = { 'Bangkal, Abucay': [14.7245, 120.5361] };
asked = [];
r = await call(geocode, { method: 'GET', ...sess(custTok) });
check('customer gets their barangay', r.body?.location?.lat === 14.7245, r.body);
check('precision reported as barangay', r.body?.location?.precision === 'barangay', r.body?.location);
check('zoom is close enough to nudge the pin', r.body?.location?.zoom === 16, r.body?.location);
check('the country is part of the query', asked[0]?.endsWith(', Philippines'), asked);
check('one provider call, not three', asked.length === 1, asked);

asked = [];
r = await call(geocode, { method: 'GET', ...sess(custTok) });
check('a second lookup is served from cache', asked.length === 0, asked);
check('and still answers', r.body?.location?.lat === 14.7245, r.body);
check('one cache row per locality', dump('geocache').length === 1, dump('geocache'));

console.log('\n=== Falling back when the barangay is unknown ===');

resetDb();
r = await call(register, { method: 'POST', body: { firstName: 'Ana', lastName: 'Reyes',
  email: 'ana@example.com', phone: '09171234500', address: ADDR, password: 'Aircon1!' } });
const anaTok = sessionFrom(r);

answers = { 'Abucay, Bataan': [14.7269, 120.5347] };  // the barangay is a miss
asked = [];
r = await call(geocode, { method: 'GET', ...sess(anaTok) });
check('falls back to the city', r.body?.location?.lat === 14.7269, r.body);
check('precision reported as city', r.body?.location?.precision === 'city', r.body?.location);
check('zoomed out a step for a coarser point', r.body?.location?.zoom === 14, r.body?.location);
check('tried the barangay first', asked[0]?.startsWith('Bangkal'), asked);
check('the miss is cached too', dump('geocache').some((d) => d.found === false), dump('geocache'));

asked = [];
await call(geocode, { method: 'GET', ...sess(anaTok) });
check('a cached miss is not re-asked', asked.length === 0, asked);

console.log('\n=== Nothing is allowed to break a booking ===');

resetDb();
r = await call(register, { method: 'POST', body: { firstName: 'Bea', lastName: 'Lim',
  email: 'bea@example.com', phone: '09171234501', address: ADDR, password: 'Aircon1!' } });
const beaTok = sessionFrom(r);

answers = {};
r = await call(geocode, { method: 'GET', ...sess(beaTok) });
check('an unplaceable address -> 200 with no location', r.statusCode === 200 && r.body?.location === null, r.body);

resetDb();
r = await call(register, { method: 'POST', body: { firstName: 'Carl', lastName: 'Uy',
  email: 'carl@example.com', phone: '09171234502', address: ADDR, password: 'Aircon1!' } });
const carlTok = sessionFrom(r);

failNext = true;
answers = { 'Bangkal, Abucay': [14.7245, 120.5361] };
asked = [];
r = await call(geocode, { method: 'GET', ...sess(carlTok) });
check('a dead geocoder -> 200, never a 500', r.statusCode === 200, r.body);
check('and no location rather than a wrong one', r.body?.location === null, r.body);
check('a struggling provider is not hammered with the coarser queries',
  asked.length === 1, asked);
check('an outage is not cached as a bad address', dump('geocache').length === 0, dump('geocache'));

// The provider recovering must be enough; nothing should have been poisoned.
asked = [];
r = await call(geocode, { method: 'GET', ...sess(carlTok) });
check('the next attempt asks again and succeeds', r.body?.location?.lat === 14.7245, r.body);

console.log('\n=== PSGC names are cleaned before they are asked about ===');

resetDb();
r = await call(register, { method: 'POST', body: { firstName: 'Del', lastName: 'Rosario',
  email: 'del@example.com', phone: '09171234503', password: 'Aircon1!',
  address: { ...ADDR, barangayName: 'San Roque (Pob.)' } } });
const delTok = sessionFrom(r);

answers = {};
asked = [];
await call(geocode, { method: 'GET', ...sess(delTok) });
check('the "(Pob.)" bookkeeping is dropped', asked[0]?.startsWith('San Roque, Abucay'), asked);

r = await call(geocode, { method: 'POST', ...sess(delTok) });
check('POST is not allowed', r.statusCode === 405, r.body);

console.log('\n=== Searching the map ===');

resetDb();
r = await call(register, { method: 'POST', body: { firstName: 'Eva', lastName: 'Tan',
  email: 'eva@example.com', phone: '09171234504', address: ADDR, password: 'Aircon1!' } });
const evaTok = sessionFrom(r);

const SEARCH = { 'SM City Olongapo': [14.8386, 120.2842] };
globalThis.fetch = async (url) => {
  const q = new URL(url).searchParams.get('q') || '';
  asked.push(q);
  const hit = Object.entries(SEARCH).find(([needle]) => q.startsWith(needle));
  return new Response(JSON.stringify(hit
    ? [{ lat: String(hit[1][0]), lon: String(hit[1][1]), display_name: hit[0] + ', Zambales, Philippines' }]
    : []), { status: 200 });
};

r = await call(geocode, { method: 'GET', url: '/api/geocode?q=SM%20City%20Olongapo', ...sess(evaTok) });
check('search returns a place', r.body?.results?.length === 1, r.body);
check('with coordinates', r.body?.results?.[0]?.lat === 14.8386, r.body?.results);
check('and a label to show', /SM City Olongapo/.test(r.body?.results?.[0]?.label || ''), r.body?.results);

asked = [];
r = await call(geocode, { method: 'GET', url: '/api/geocode?q=sm%20city%20olongapo', ...sess(evaTok) });
check('the same search, differently cased, is served from cache', asked.length === 0, asked);
check('and gives the same place', r.body?.results?.[0]?.lat === 14.8386, r.body);

r = await call(geocode, { method: 'GET', url: '/api/geocode?q=zzzzz', ...sess(evaTok) });
check('a search with no matches -> empty list, not an error',
  r.statusCode === 200 && Array.isArray(r.body?.results) && r.body.results.length === 0, r.body);

asked = [];
r = await call(geocode, { method: 'GET', url: '/api/geocode?q=ab', ...sess(evaTok) });
check('a two-character search never reaches the provider', asked.length === 0, asked);
check('and answers with nothing', r.body?.results?.length === 0, r.body);

r = await call(geocode, { method: 'GET', url: '/api/geocode?q=SM%20City%20Olongapo' });
check('search needs a session too', r.statusCode === 401, r.body);

// The quota is per user and counts every search, cached or not: the point is
// to bound one session's appetite, not just its provider traffic.
let last;
for (let i = 0; i < 45; i++) {
  last = await call(geocode, { method: 'GET', url: `/api/geocode?q=SM%20City%20Olongapo%20${i}`, ...sess(evaTok) });
}
check('a runaway search loop is cut off with 429', last?.statusCode === 429, last?.body);
check('and is told what to do instead', /drag the marker/i.test(last?.body?.error || ''), last?.body);

r = await call(geocode, { method: 'GET', ...sess(evaTok) });
check('the address lookup still works while searching is throttled',
  r.statusCode === 200, r.body);

console.log('\n=== A pin dropped from the address is recorded as such ===');

const validate = await import('../api/_lib/validate.js');
check('an address-derived pin keeps its provenance',
  validate.location({ lat: 14.72, lng: 120.53, source: 'address' })?.source === 'address');
check('a GPS pin still does too',
  validate.location({ lat: 14.72, lng: 120.53, source: 'gps' })?.source === 'gps');
check('anything else is recorded as a hand-placed pin',
  validate.location({ lat: 14.72, lng: 120.53, source: 'satellite' })?.source === 'pin');

summary();
