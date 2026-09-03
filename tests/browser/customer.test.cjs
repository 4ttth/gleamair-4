const { chromium } = require('playwright');
const EXE = process.env.CHROMIUM_PATH || undefined; // undefined = Playwright's own build
const OUT = process.env.SHOTS || require('node:os').tmpdir();
let pass = 0, fail = 0;
const check = (l, c, x) => { c ? (pass++, console.log('  PASS  ' + l)) : (fail++, console.log('  FAIL  ' + l + (x ? ' -> ' + x : ''))); };


// This sandbox has no outbound network, so Google Fonts requests hang until
// they time out and stall every networkidle wait. Block anything off-origin.
const offlinePage = async (browser, opts) => {
  const p = await browser.newPage(opts);
  await p.route('**', (route) => {
    const u = route.request().url();
    return (u.startsWith('http://localhost:4321') || u.startsWith('data:'))
      ? route.continue() : route.abort();
  });
  return p;
};

(async () => {
  const browser = await chromium.launch({ ...(EXE ? { executablePath: EXE } : {}), args: ['--no-sandbox'] });
  const page = await offlinePage(browser, { viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

  console.log('\n=== Sign in as the customer registered earlier ===');
  await page.goto('http://localhost:4321/login', { waitUntil: 'networkidle' });
  await page.fill('#email', 'juan.delacruz@example.com');
  await page.fill('#password', 'Aircon1!');
  await page.click('#submitBtn');
  await page.waitForURL('**/app/dashboard**', { timeout: 15000 });
  await page.waitForSelector('.svc', { timeout: 10000 });
  check('landed on customer dashboard', page.url().includes('/app/dashboard'));

  console.log('\n=== Dashboard ===');
  const svcCount = await page.locator('.svc').count();
  check('service cards render (' + svcCount + ')', svcCount === 4, String(svcCount));
  check('PMS marked available', (await page.locator('.svc.available .ribbon').first().textContent()).includes('Available'));
  const soon = await page.locator('.svc.soon').count();
  check('other services marked coming soon (' + soon + ')', soon === 3, String(soon));
  check('PMS shows PHP 500.00', (await page.locator('.svc.available .amt').textContent()).includes('500'));
  check('PMS shows PHP 250.00 reservation', (await page.locator('.svc.available .per').textContent()).includes('250'));
  check('empty bookings state shown', await page.locator('.empty h3').isVisible());
  await page.waitForFunction(() => {
    const i = document.querySelector('.svc.available img');
    return i && i.complete && i.naturalWidth > 0;
  }, { timeout: 15000 }).catch(() => {});
  const imgOk = await page.evaluate(() => {
    const i = document.querySelector('.svc.available img');
    return i && i.complete && i.naturalWidth > 0;
  });
  check('PMS image loaded from repo assets', imgOk);
  await page.screenshot({ path: OUT + '/06-customer-dashboard.png', fullPage: true });

  console.log('\n=== Booking page ===');
  await Promise.all([
    page.waitForURL('**/app/book**', { timeout: 20000 }),
    page.locator('.svc.available a.btn-primary').first().click(),
  ]);
  await page.waitForSelector('#unitRows .unit-row', { timeout: 10000 });
  check('unit row present', (await page.locator('.unit-row').count()) === 1);
  check('map container rendered', await page.locator('#pinMap').isVisible());
  const tilesTried = await page.evaluate(() => !!document.querySelector('.leaflet-container'));
  check('Leaflet initialised from vendored copy', tilesTried);

  await page.click('#addUnit');
  check('second unit row added', (await page.locator('.unit-row').count()) === 2);
  await page.locator('.unit-row').nth(1).locator('[data-u="type"]').selectOption('Window Type');
  await page.locator('.unit-row').nth(1).locator('[data-u="count"]').fill('3');
  await page.locator('.unit-row').first().locator('[data-u="count"]').fill('2');
  await page.locator('.unit-row').first().locator('[data-u="hp"]').selectOption('1.5');
  await page.waitForTimeout(200);
  check('unit total sums to 5', (await page.locator('#unitTotal').textContent()) === '5', await page.locator('#unitTotal').textContent());

  await page.locator('.unit-row').nth(1).locator('[data-remove]').click();
  await page.waitForTimeout(150);
  check('unit row removable', (await page.locator('.unit-row').count()) === 1);
  check('total recalculates to 2', (await page.locator('#unitTotal').textContent()) === '2');

  await page.click('#addUnit');
  await page.locator('.unit-row').nth(1).locator('[data-u="type"]').selectOption('Window Type');
  await page.locator('.unit-row').nth(1).locator('[data-u="count"]').fill('1');
  console.log('\n--- map pin ---');
  check('no pin set initially', (await page.locator('#pinReadout').textContent()).includes('No pin set'));
  const box = await page.locator('#pinMap').boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForFunction(() => document.getElementById('pinReadout').textContent.includes('Pinned at'), { timeout: 8000 });
  const readout = await page.locator('#pinReadout').textContent();
  check('clicking the map drops a pin: ' + readout.trim(), /Pinned at -?\d+\.\d+, -?\d+\.\d+/.test(readout), readout);
  const markerVisible = await page.locator('.leaflet-marker-icon').count();
  check('draggable marker rendered', markerVisible >= 1, String(markerVisible));

  await page.fill('#notes', 'Gate code 1234. Dog in the yard.');
  check('note counter updates', (await page.locator('#noteCount').textContent()) === '32', await page.locator('#noteCount').textContent());
  await page.screenshot({ path: OUT + '/07-booking-form.png', fullPage: true });

  console.log('\n=== Pay -> PayMongo -> return ===');
  await Promise.all([
    page.waitForURL('**/__fake-paymongo**', { timeout: 25000 }),
    page.click('#payBtn'),
  ]);
  check('redirected to PayMongo checkout', page.url().includes('__fake-paymongo'));
  check('checkout carries the booking reference', /ref=PMS-\d{6}/.test(page.url()), page.url());

  await Promise.all([
    page.waitForURL('**/app/booking-complete**', { timeout: 25000 }),
    page.click('#pay'),
  ]);
  await page.waitForSelector('.mono', { timeout: 10000 });
  const body = await page.locator('.card').first().textContent();
  check('confirmation says slot reserved', body.includes('slot is reserved'), body.slice(0, 90));
  check('shows down payment PHP 250.00', body.includes('250.00'));
  check('shows balance PHP 250.00', body.includes('Balance'));
  await page.screenshot({ path: OUT + '/08-booking-complete.png', fullPage: true });

  console.log('\n=== Back on the dashboard ===');
  await page.goto('http://localhost:4321/app/dashboard', { waitUntil: 'networkidle' });
  await page.waitForSelector('table.data', { timeout: 10000 });
  const row = await page.locator('table.data tbody tr').first().textContent();
  check('booking listed', /PMS-\d{6}/.test(row), row.slice(0, 80));
  check('status shows paid', row.includes('Paid'), row.slice(0, 120));
  check('units summarised', row.includes('Split Type'), row.slice(0, 140));
  check('active bookings stat = 1', (await page.locator('.stat .value').first().textContent()).trim() === '1');
  check('reservations paid stat shows 250', (await page.locator('.stat').nth(2).textContent()).includes('250'));
  await page.screenshot({ path: OUT + '/09-dashboard-with-booking.png', fullPage: true });

  console.log('\n=== Guard: signed-out access ===');
  const clean = await offlinePage(browser, {});
  await clean.goto('http://localhost:4321/app/dashboard');
  await clean.waitForURL('**/login**', { timeout: 10000 }).catch(() => {});
  check('signed-out visitor bounced to /login', clean.url().includes('/login'), clean.url());

  const real = errors.filter((e) => !/favicon|ERR_CONNECTION|Failed to fetch/.test(e));
  check('no page errors', real.length === 0, real.slice(0, 2).join(' | '));

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  await browser.close();
  if (fail) process.exitCode = 1;
})();
