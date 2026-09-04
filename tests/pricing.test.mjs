/* Runtime service pricing: who may change it, what a change is allowed to be,
   and - the point of the feature - which charges it does and does not affect. */

import { call, check, sessionFrom, summary } from './harness.js';
import { resetDb } from './fake-db.js';

process.env.PAYMONGO_SECRET_KEY = 'sk_test_fake';
process.env.PUBLIC_BASE_URL = 'https://gleamaire.com';
process.env.BOOTSTRAP_TOKEN = 'boot-token-abc';

/* Capture what we would actually send to PayMongo. The amount on the line item
   is the thing this whole feature exists to control. */
let checkoutBodies = [];
globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  if (u.includes('/checkout_sessions')) {
    if ((init.method || 'POST') === 'GET') {
      return new Response(JSON.stringify({ data: { id: 'cs_x', attributes: { payments: [] } } }), { status: 200 });
    }
    checkoutBodies.push(JSON.parse(init.body || '{}'));
    return new Response(JSON.stringify({
      data: { id: 'cs_' + checkoutBodies.length, attributes: { checkout_url: 'https://checkout.paymongo.com/x' } },
    }), { status: 200 });
  }
  return new Response('{}', { status: 200 });
};
const lastCheckout = () => checkoutBodies.at(-1)?.data?.attributes;
const lastAmount = () => lastCheckout()?.line_items?.[0]?.amount;

const register   = (await import('../api/auth/register.js')).default;
const login      = (await import('../api/auth/login.js')).default;
const bootstrap  = (await import('../api/bootstrap.js')).default;
const usersIdx   = (await import('../api/users/index.js')).default;
const bookings   = (await import('../api/bookings/index.js')).default;
const bookingOne = (await import('../api/bookings/[id].js')).default;
const services   = (await import('../api/services/index.js')).default;
const serviceOne = (await import('../api/services/[code].js')).default;

const sess = (t) => ({ cookies: { gleam_session: t } });
const ADDR = {
  line1: '12 Domingo St', line2: '',
  provinceCode: '0308', provinceName: 'Bataan',
  cityCode: '030801', cityName: 'Abucay',
  barangayCode: '030801001', barangayName: 'Bangkal',
};
const UNITS = [{ type: 'Split Type', horsepower: '1.0', count: 2 }];

resetDb();

/* ── Accounts ─────────────────────────────────────────────────────────────── */
let r = await call(bootstrap, { method: 'POST', body: {
  token: 'boot-token-abc', firstName: 'Super', lastName: 'Admin',
  email: 'sa@gleamaire.com', phone: '09170000001', password: 'Sup3r!pass' } });
r = await call(login, { method: 'POST', body: { email: 'sa@gleamaire.com', password: 'Sup3r!pass' } });
const superToken = sessionFrom(r);

for (const [role, email] of [['admin', 'admin@gleamaire.com'], ['staff', 'tech@gleamaire.com']]) {
  await call(usersIdx, { method: 'POST', ...sess(superToken), body: {
    role, firstName: role, lastName: 'User', email, phone: '0917000000' + (role === 'admin' ? 2 : 3),
    password: 'Sup3r!pass' } });
}
r = await call(login, { method: 'POST', body: { email: 'admin@gleamaire.com', password: 'Sup3r!pass' } });
const adminToken = sessionFrom(r);
r = await call(login, { method: 'POST', body: { email: 'tech@gleamaire.com', password: 'Sup3r!pass' } });
const staffToken = sessionFrom(r);

await call(register, { method: 'POST', body: {
  firstName: 'Cara', lastName: 'Cruz', email: 'cara@example.com', phone: '09171112222',
  password: 'Cust0mer!', address: ADDR } });
r = await call(login, { method: 'POST', body: { email: 'cara@example.com', password: 'Cust0mer!' } });
const custToken = sessionFrom(r);

console.log('\n=== 1. Catalogue seeds from the previous hardcoded prices ===');
r = await call(services, { method: 'GET', url: '/api/services' });
const pms = () => (r.body.services || []).find((s) => s.code === 'PMS');
check('catalogue is public', r.statusCode === 200, r.body);
check('PMS seeded at PHP 500.00 total', pms()?.total === 50000, pms());
check('PMS seeded at PHP 250.00 down payment', pms()?.downpayment === 25000, pms());
check('balance is derived', pms()?.balance === 25000, pms());
check('PMS is bookable', pms()?.bookable === true, pms());
check('unpriced services are not bookable', r.body.services.find((s) => s.code === 'INSTALL')?.bookable === false);
check('anonymous caller gets no audit trail', pms()?.updatedBy === undefined, pms());
check('anonymous caller gets no limits block', r.body.limits === undefined, r.body);

console.log('\n=== 2. Who may change a price ===');
const patchPrice = (token, body) => call(serviceOne, {
  method: 'PATCH', url: '/api/services/PMS', query: { code: 'PMS' },
  ...(token ? sess(token) : {}), body,
});
r = await patchPrice(null, { total: 60000, downpayment: 30000, version: 1 });
check('anonymous cannot change a price -> 401', r.statusCode === 401, r.body);
r = await patchPrice(custToken, { total: 60000, downpayment: 30000, version: 1 });
check('customer cannot change a price -> 403', r.statusCode === 403, r.body);
r = await patchPrice(staffToken, { total: 60000, downpayment: 30000, version: 1 });
check('staff cannot change a price -> 403', r.statusCode === 403, r.body);

console.log('\n=== 3. Validation ===');
r = await patchPrice(adminToken, { total: 60000, downpayment: 90000, version: 1 });
check('down payment above total -> 400', r.statusCode === 400, r.body);
r = await patchPrice(adminToken, { total: 60000, downpayment: 500, version: 1 });
check('down payment below PayMongo minimum -> 400', r.statusCode === 400, r.body);
r = await patchPrice(adminToken, { total: 500.75, downpayment: 25000, version: 1 });
check('fractional centavos -> 400', r.statusCode === 400, r.body);
r = await patchPrice(adminToken, { total: -50000, downpayment: 25000, version: 1 });
check('negative price -> 400', r.statusCode === 400, r.body);
r = await patchPrice(adminToken, { total: 999_999_999_99, downpayment: 25000, version: 1 });
check('price above PayMongo maximum -> 400', r.statusCode === 400, r.body);
r = await patchPrice(adminToken, { total: 'free', downpayment: 25000, version: 1 });
check('non-numeric price -> 400', r.statusCode === 400, r.body);
r = await patchPrice(adminToken, { total: 60000, downpayment: 30000 });
check('missing version -> 400', r.statusCode === 400, r.body);
r = await call(services, { method: 'GET', url: '/api/services' });
check('no failed attempt changed the price', pms()?.total === 50000, pms());

console.log('\n=== 4. A price change is live for the next booking ===');
r = await patchPrice(adminToken, { total: 80000, downpayment: 40000, version: 1 });
check('admin CAN change a price', r.statusCode === 200, r.body);
check('new total returned', r.body?.service?.total === 80000, r.body);
check('version incremented', r.body?.service?.version === 2, r.body);
check('change is attributed', r.body?.service?.updatedBy?.role === 'admin', r.body?.service);

r = await call(bookings, { method: 'POST', ...sess(custToken), body: { service: 'PMS', units: UNITS } });
check('booking created after the change', r.statusCode === 200, r.body);
const newRef = r.body?.booking?.reference;
check('booking snapshots the NEW total', r.body?.booking?.amounts?.total === 80000, r.body?.booking?.amounts);
check('PayMongo charged the NEW down payment', lastAmount() === 40000, lastCheckout()?.line_items);
check('PayMongo description quotes the new balance', /₱|PHP/.test(lastCheckout()?.line_items?.[0]?.description || ''), lastCheckout()?.line_items);
check('charge carries the price version', lastCheckout()?.metadata?.priceVersion === '2', lastCheckout()?.metadata);

console.log('\n=== 5. Existing bookings keep the price they were quoted ===');
r = await patchPrice(adminToken, { total: 120000, downpayment: 60000, version: 2 });
check('price raised again', r.body?.service?.downpayment === 60000, r.body);

r = await call(bookingOne, { method: 'GET', url: `/api/bookings/${newRef}`, query: { id: newRef }, ...sess(custToken) });
check('existing booking still shows its own total', r.body?.booking?.amounts?.total === 80000, r.body?.booking?.amounts);

r = await call(bookingOne, {
  method: 'POST', url: `/api/bookings/${newRef}`, query: { id: newRef },
  ...sess(custToken), body: { action: 'pay' } });
check('re-paying an existing booking succeeds', r.statusCode === 200, r.body);
check('re-payment charges the QUOTED down payment, not the new one', lastAmount() === 40000, lastCheckout()?.line_items);

console.log('\n=== 6. Concurrent edits do not silently overwrite each other ===');
r = await patchPrice(adminToken, { total: 90000, downpayment: 45000, version: 2 });
check('a stale version is refused -> 409', r.statusCode === 409, r.body);
check('conflict hands back the current figures', r.body?.details?.current?.total === 120000, r.body?.details);
r = await call(services, { method: 'GET', url: '/api/services' });
check('the refused write changed nothing', pms()?.total === 120000, pms());

console.log('\n=== 7. A customer never pays a price they were not shown ===');
r = await call(bookings, { method: 'POST', ...sess(custToken), body: {
  service: 'PMS', units: UNITS, priceVersion: 1 } });
check('booking with a stale priceVersion -> 409', r.statusCode === 409, r.body);
check('conflict returns the current price', r.body?.details?.service?.total === 120000, r.body?.details);
r = await call(bookings, { method: 'POST', ...sess(custToken), body: {
  service: 'PMS', units: UNITS, priceVersion: 3 } });
check('booking with the current priceVersion succeeds', r.statusCode === 200, r.body);
check('and is charged the current down payment', lastAmount() === 60000, lastCheckout()?.line_items);

console.log('\n=== 8. Withdrawing a service from sale ===');
r = await patchPrice(adminToken, { bookable: false, version: 3 });
check('admin can close a service to new bookings', r.statusCode === 200 && r.body?.service?.bookable === false, r.body);
r = await call(bookings, { method: 'POST', ...sess(custToken), body: { service: 'PMS', units: UNITS } });
check('a closed service cannot be booked -> 400', r.statusCode === 400, r.body);
r = await call(bookingOne, {
  method: 'POST', url: `/api/bookings/${newRef}`, query: { id: newRef },
  ...sess(custToken), body: { action: 'pay' } });
check('but an existing booking can still be paid', r.statusCode === 200, r.body);
await patchPrice(adminToken, { bookable: true, version: 4 });

console.log('\n=== 9. The audit trail ===');
r = await call(serviceOne, { method: 'GET', url: '/api/services/PMS', query: { code: 'PMS' }, ...sess(adminToken) });
check('admin sees the price history', Array.isArray(r.body?.history) && r.body.history.length >= 4, r.body?.history?.length);
check('history is newest first', r.body.history[0].version > r.body.history[1].version, r.body?.history);
check('history records what changed', r.body.history.at(-1)?.from?.total === 50000, r.body.history.at(-1));
check('history names who changed it', r.body.history[0]?.by?.name === 'admin User', r.body.history[0]?.by);
check('admin sees the audit fields on the service', !!r.body?.service?.updatedBy, r.body?.service);

r = await call(serviceOne, { method: 'GET', url: '/api/services/PMS', query: { code: 'PMS' }, ...sess(staffToken) });
check('staff cannot read the audit trail -> 403', r.statusCode === 403, r.body);

r = await call(services, { method: 'GET', url: '/api/services', ...sess(adminToken) });
check('admin list includes the spend limits', r.body?.limits?.min === 10000, r.body?.limits);

r = await call(services, { method: 'GET', url: '/api/services', ...sess(custToken) });
check('a customer still sees no audit trail', r.body.services.find((s) => s.code === 'PMS')?.updatedBy === undefined);

console.log('\n=== 10. Unknown services ===');
r = await call(serviceOne, { method: 'PATCH', url: '/api/services/NOPE', query: { code: 'NOPE' },
  ...sess(adminToken), body: { total: 50000, downpayment: 25000, version: 1 } });
check('pricing an unknown service -> 404', r.statusCode === 404, r.body);

summary();
