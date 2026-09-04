/* Runtime pricing, end to end through the real UI:
   an admin changes a price, and it reaches the customer's dashboard, the
   booking page and the PayMongo charge without a redeploy.

   Standalone: creates its own superadmin, admin and customer. */

const { chromium } = require('playwright');
const EXE = process.env.CHROMIUM_PATH || undefined;
let pass = 0, fail = 0;
const check = (l, c, x) => { c ? (pass++, console.log('  PASS  ' + l)) : (fail++, console.log('  FAIL  ' + l + (x ? ' -> ' + x : ''))); };

const BASE = 'http://localhost:4321';

// No outbound network in the sandbox: block off-origin so networkidle settles.
const offlinePage = async (browser, opts) => {
  const p = await browser.newPage(opts);
  await p.route('**', (route) => {
    const u = route.request().url();
    return (u.startsWith(BASE) || u.startsWith('data:')) ? route.continue() : route.abort();
  });
  return p;
};

const post = (path, body, cookie) => fetch(BASE + path, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}) },
  body: JSON.stringify(body),
});

const signIn = async (page, email, password, landing) => {
  await page.goto(BASE + '/login', { waitUntil: 'networkidle' });
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('#submitBtn');
  await page.waitForURL('**' + landing + '**', { timeout: 15000 });
};

(async () => {
  const ADDR = {
    line1: '9 Rizal Ave', line2: '',
    provinceCode: '0371', provinceName: 'Zambales',
    cityCode: '037107', cityName: 'Olongapo City',
    barangayCode: '037107021', barangayName: 'Barretto',
  };

  console.log('\n=== Fixtures ===');
  // /api/bootstrap only ever runs once per database. On a fresh dev server it
  // makes our own superadmin; if another suite already claimed it, fall back to
  // the one the README tells you to create.
  let r = await post('/api/bootstrap', {
    token: 'dev-bootstrap-token', firstName: 'Price', lastName: 'Boss',
    email: 'priceboss@gleamaire.com', phone: '09170009001', password: 'Sup3r!pass' });
  check('a superadmin exists', [200, 409].includes(r.status), String(r.status));

  const cookieFrom = (res) => (res.headers.getSetCookie?.() || []).map((c) => c.split(';')[0]).join('; ');
  let superCookie = '';
  for (const email of ['priceboss@gleamaire.com', 'ana@gleamaire.com']) {
    const attempt = await post('/api/auth/login', { email, password: 'Sup3r!pass' });
    if (attempt.status === 200) { superCookie = cookieFrom(attempt); break; }
  }
  check('superadmin signed in', !!superCookie,
        'no known superadmin could sign in - bootstrap one first (see tests/browser/README.md)');

  r = await post('/api/users', {
    role: 'admin', firstName: 'Pia', lastName: 'Admin',
    email: 'pia@gleamaire.com', phone: '09170009002', password: 'Sup3r!pass' }, superCookie);
  check('admin account created', [200, 409].includes(r.status), String(r.status));

  r = await post('/api/auth/register', {
    firstName: 'Rico', lastName: 'Buyer', email: 'rico@example.com',
    phone: '09170009003', password: 'Cust0mer!', address: ADDR });
  check('customer registered', [200, 409].includes(r.status), String(r.status));

  const browser = await chromium.launch({ ...(EXE ? { executablePath: EXE } : {}), args: ['--no-sandbox'] });
  const errors = [];

  /* ── Admin changes the price ───────────────────────────────────────────── */
  const admin = await offlinePage(browser, { viewport: { width: 1440, height: 1000 } });
  admin.on('pageerror', (e) => errors.push('ADMIN PAGEERROR: ' + e.message));

  console.log('\n=== Admin: Service Pricing screen ===');
  await signIn(admin, 'pia@gleamaire.com', 'Sup3r!pass', '/app/admin');
  await admin.click('text=Service Pricing');
  await admin.waitForSelector('[data-price="PMS"]', { timeout: 10000 });
  check('pricing screen lists services', await admin.locator('[data-price]').count() === 4);
  const pmsRow = admin.locator('tr', { has: admin.locator('[data-price="PMS"]') });
  check('PMS shows its current total', (await pmsRow.textContent()).includes('500'), await pmsRow.textContent());
  check('PMS shown as open for booking', (await pmsRow.textContent()).includes('Open'));

  await admin.click('[data-price="PMS"]');
  await admin.waitForSelector('#pTotal', { timeout: 10000 });
  check('editor pre-filled with the current total', await admin.inputValue('#pTotal') === '500.00',
        await admin.inputValue('#pTotal'));

  await admin.fill('#pTotal', '750.50');
  await admin.fill('#pDown', '400.25');
  check('balance previews live', (await admin.textContent('#pBalance')).includes('350.25'),
        await admin.textContent('#pBalance'));

  await admin.click('#pSave');
  await admin.waitForFunction(() =>
    !document.querySelector('.modal-backdrop') &&
    /750\.50/.test(document.body.textContent), { timeout: 10000 });
  check('new price shown on the pricing screen', (await admin.textContent('body')).includes('750.50'));
  check('change attributed to the admin', (await admin.textContent('body')).includes('Pia Admin'));

  console.log('\n=== Admin: PHP 1.00 is a price the form accepts ===');
  await admin.click('[data-price="PMS"]');
  await admin.waitForSelector('#pTotal');
  await admin.fill('#pTotal', '1.00');
  await admin.fill('#pDown', '1.00');
  await admin.click('#pSave');
  await admin.waitForFunction(() => !document.querySelector('.modal-backdrop'), { timeout: 10000 });
  const oneRow = admin.locator('tr', { has: admin.locator('[data-price="PMS"]') });
  check('PHP 1.00 saved from the form', (await oneRow.textContent()).includes('₱1.00'), await oneRow.textContent());

  // Put it back to something the rest of this test can reason about.
  await admin.click('[data-price="PMS"]');
  await admin.waitForSelector('#pTotal');
  await admin.fill('#pTotal', '750.50');
  await admin.fill('#pDown', '400.25');
  await admin.click('#pSave');
  await admin.waitForFunction(() => !document.querySelector('.modal-backdrop'), { timeout: 10000 });

  console.log('\n=== Admin: rejects an impossible price ===');
  await admin.click('[data-price="PMS"]');
  await admin.waitForSelector('#pTotal');
  await admin.fill('#pTotal', '100.00');
  await admin.fill('#pDown', '900.00');
  await admin.click('#pSave');
  await admin.waitForSelector('#modalAlert:not([hidden])', { timeout: 10000 });
  check('down payment above total is refused',
        (await admin.textContent('#modalAlert')).toLowerCase().includes('down payment'),
        await admin.textContent('#modalAlert'));
  await admin.click('.modal-backdrop [data-close]');

  /* ── Customer sees it ──────────────────────────────────────────────────── */
  const cust = await offlinePage(browser, { viewport: { width: 1440, height: 1000 } });
  cust.on('pageerror', (e) => errors.push('CUSTOMER PAGEERROR: ' + e.message));

  console.log('\n=== Customer: dashboard reflects the new price ===');
  await signIn(cust, 'rico@example.com', 'Cust0mer!', '/app/dashboard');
  await cust.waitForSelector('.svc.available .amt', { timeout: 10000 });
  check('dashboard card shows the NEW total',
        (await cust.textContent('.svc.available .amt')).includes('750.50'),
        await cust.textContent('.svc.available .amt'));
  check('dashboard card shows the NEW reservation amount',
        (await cust.textContent('.svc.available .per')).includes('400.25'),
        await cust.textContent('.svc.available .per'));

  console.log('\n=== Customer: booking page and the actual charge ===');
  await cust.goto(BASE + '/app/book', { waitUntil: 'networkidle' });
  await cust.waitForSelector('#payBtn', { timeout: 10000 });
  check('summary total is live', (await cust.textContent('#sumTotal')).includes('750.50'), await cust.textContent('#sumTotal'));
  check('summary down payment is live', (await cust.textContent('#sumDown')).includes('400.25'), await cust.textContent('#sumDown'));
  check('summary balance is live', (await cust.textContent('#sumBalance')).includes('350.25'), await cust.textContent('#sumBalance'));
  check('pay button quotes the live amount', (await cust.textContent('#payBtn')).includes('400.25'), await cust.textContent('#payBtn'));

  console.log('\n=== A price change while the booking page is open ===');
  // Admin re-prices behind the customer's back, then the customer presses Pay.
  r = await fetch(BASE + '/api/services', { headers: { cookie: superCookie } });
  const current = (await r.json()).services.find((s) => s.code === 'PMS');
  r = await fetch(BASE + '/api/services/PMS', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', cookie: superCookie },
    body: JSON.stringify({ total: 99000, downpayment: 49500, version: current.version }) });
  check('price moved under the open page', r.status === 200, String(r.status));

  await cust.click('#payBtn');
  await cust.waitForSelector('#pageAlert:not([hidden])', { timeout: 10000 });
  check('customer is NOT sent to checkout at the stale price', cust.url().includes('/app/book'), cust.url());
  check('customer is told the price changed',
        (await cust.textContent('#pageAlert')).toLowerCase().includes('price'),
        await cust.textContent('#pageAlert'));
  check('page now shows the new amount', (await cust.textContent('#sumDown')).includes('495'),
        await cust.textContent('#sumDown'));

  console.log('\n=== Retrying at the price now shown ===');
  await cust.click('#payBtn');
  await cust.waitForURL('**/__fake-paymongo**', { timeout: 15000 });
  check('second attempt reaches checkout', cust.url().includes('__fake-paymongo'), cust.url());

  const ref = new URL(cust.url()).searchParams.get('ref');
  r = await fetch(BASE + '/api/bookings/' + ref, { headers: { cookie: superCookie } });
  const booking = (await r.json()).booking;
  check('booking snapshotted the price it was charged at',
        booking.amounts.downpayment === 49500 && booking.amounts.total === 99000,
        JSON.stringify(booking.amounts));

  console.log('\n=== A later price change does not rewrite that booking ===');
  r = await fetch(BASE + '/api/services', { headers: { cookie: superCookie } });
  const now = (await r.json()).services.find((s) => s.code === 'PMS');
  await fetch(BASE + '/api/services/PMS', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', cookie: superCookie },
    body: JSON.stringify({ total: 20000, downpayment: 10000, version: now.version }) });

  r = await fetch(BASE + '/api/bookings/' + ref, { headers: { cookie: superCookie } });
  const after = (await r.json()).booking;
  check('the existing booking still owes what it was quoted',
        after.amounts.downpayment === 49500 && after.amounts.total === 99000,
        JSON.stringify(after.amounts));

  check('no page errors', errors.length === 0, errors.join(' | '));

  await browser.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail) process.exitCode = 1;
})();
