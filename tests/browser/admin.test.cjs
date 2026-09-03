const { chromium } = require('playwright');
const EXE = process.env.CHROMIUM_PATH || undefined; // undefined = Playwright's own build
const OUT = process.env.SHOTS || require('node:os').tmpdir();
let pass = 0, fail = 0;
const check = (l, c, x) => { c ? (pass++, console.log('  PASS  ' + l)) : (fail++, console.log('  FAIL  ' + l + (x ? ' -> ' + String(x).slice(0,160) : ''))); };

const signIn = async (page, email, password) => {
  await page.goto('http://localhost:4321/login', { waitUntil: 'networkidle' });
  await page.fill('#email', email);
  await page.fill('#password', password);
  await Promise.all([page.waitForURL(/\/app\//, { timeout: 20000 }), page.click('#submitBtn')]);
};


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
  const errors = [];

  console.log('\n=== Superadmin ===');
  const sa = await offlinePage(browser, { viewport: { width: 1500, height: 1000 } });
  sa.on('pageerror', (e) => errors.push('SA: ' + e.message));
  await signIn(sa, 'ana@gleamaire.com', 'Sup3r!pass');
  check('superadmin routed to /app/admin', sa.url().includes('/app/admin'), sa.url());
  await sa.waitForSelector('.stat', { timeout: 15000 });

  const navText = await sa.locator('.sidebar').textContent();
  check('nav has Overview', navText.includes('Overview'));
  check('nav has PMS Jobs', navText.includes('PMS Jobs'));
  check('nav has User Management', navText.includes('User Management'));
  check('nav shows coming-soon modules', navText.includes('CRM') && navText.includes('Payroll & Accounting') && navText.includes('Attendance'));
  const soonTags = await sa.locator('.soon-tag').count();
  check('coming-soon items badged (' + soonTags + ')', soonTags === 5, String(soonTags));

  const overview = await sa.locator('#content').textContent();
  check('overview shows collected down payment 250', overview.includes('250'), overview.slice(0, 100));
  check('overview lists business modules', overview.includes('Coming soon'));
  check('paid job awaiting assignment listed', overview.includes('PMS-'), overview.slice(0, 200));
  await sa.screenshot({ path: OUT + '/10-admin-overview.png', fullPage: true });

  console.log('\n=== Create a staff account ===');
  await sa.click('[data-nav="users"]');
  await sa.waitForSelector('#addUser', { timeout: 10000 });
  await sa.click('#addUser');
  await sa.waitForSelector('#userForm', { timeout: 10000 });
  await sa.selectOption('#uRole', 'staff');
  await sa.fill('#uFirst', 'Mario');
  await sa.fill('#uLast', 'Bautista');
  await sa.fill('#uEmail', 'mario@gleamaire.com');
  await sa.fill('#uPhone', '09181234567');
  await sa.fill('#uPassword', 'Tech1!pass');
  await sa.screenshot({ path: OUT + '/11-admin-new-user.png' });
  await sa.click('#uSave');
  await sa.waitForFunction(() => document.body.innerText.includes('mario@gleamaire.com'), { timeout: 15000 });
  check('staff account created and listed', true);
  const usersText = await sa.locator('#content').textContent();
  check('own row marked "This is you"', usersText.includes('This is you'));
  await sa.screenshot({ path: OUT + '/12-admin-users.png', fullPage: true });

  console.log('\n=== Assign technician to the paid job ===');
  await sa.click('[data-nav="jobs"]');
  await sa.waitForSelector('[data-manage]', { timeout: 10000 });
  await sa.click('[data-manage]');
  await sa.waitForSelector('#mTech', { timeout: 10000 });
  const modalText = await sa.locator('.modal').textContent();
  check('admin modal shows customer phone', /\+639\d{9}/.test(modalText), modalText.slice(0, 120));
  check('admin modal shows full address', modalText.includes('Domingo'), modalText.slice(0, 200));
  check('admin modal shows customer notes', modalText.includes('Gate code'));
  const techValue = await sa.evaluate(() => {
    const o = [...document.querySelectorAll('#mTech option')].find((x) => x.textContent.includes('Mario Bautista'));
    return o ? o.value : '';
  });
  check('Mario appears in the technician picker', !!techValue, techValue);
  await sa.selectOption('#mTech', techValue);
  await sa.fill('#mWhen', '2026-10-05T09:00');
  await sa.screenshot({ path: OUT + '/13-admin-assign.png' });
  await sa.click('#mSave');
  await sa.waitForSelector('.modal-backdrop', { state: 'detached', timeout: 15000 });
  await sa.waitForFunction(
    () => document.querySelector('table.data tbody tr')?.innerText.includes('Mario Bautista'),
    { timeout: 15000 });
  check('technician assigned', true);
  const rowText = await sa.locator('table.data tbody tr').first().textContent();
  check('row status moved to Technician assigned', /technician assigned/i.test(rowText), rowText.replace(/\s+/g, ' ').slice(0, 200));
  check('row is not still Paid - unassigned', !/unassigned/i.test(rowText), rowText.replace(/\s+/g, ' ').slice(0, 200));
  check('row shows the technician', rowText.includes('Mario Bautista'), rowText.replace(/\s+/g, ' ').slice(0, 200));

  console.log('\n=== Job map ===');
  await sa.click('[data-nav="map"]');
  await sa.waitForSelector('#jobMap', { timeout: 10000 });
  await sa.waitForTimeout(1200);
  const markers = await sa.locator('.leaflet-marker-icon').count();
  check('job plotted on the map (' + markers + ')', markers >= 1, String(markers));
  check('legend rendered', await sa.locator('.map-legend').isVisible());
  await sa.screenshot({ path: OUT + '/14-admin-map.png', fullPage: true });

  console.log('\n=== Staff role restrictions ===');
  const st = await offlinePage(browser, { viewport: { width: 1500, height: 1000 } });
  st.on('pageerror', (e) => errors.push('STAFF: ' + e.message));
  await signIn(st, 'mario@gleamaire.com', 'Tech1!pass');
  check('staff routed to /app/admin', st.url().includes('/app/admin'), st.url());
  await st.waitForSelector('#jobMap, .empty', { timeout: 15000 });

  const staffNav = await st.locator('.sidebar').textContent();
  check('staff nav has Job Map', staffNav.includes('Job Map'));
  check('staff nav has My Jobs', staffNav.includes('My Jobs'));
  check('staff nav has NO Overview', !staffNav.includes('Overview'), staffNav.replace(/\s+/g,' '));
  check('staff nav has NO User Management', !staffNav.includes('User Management'));
  check('staff nav has NO CRM/Payroll modules', !staffNav.includes('Payroll'));
  await st.screenshot({ path: OUT + '/15-staff-map.png', fullPage: true });

  await st.click('[data-nav="jobs"]');
  await st.waitForSelector('table.data, .empty', { timeout: 10000 });
  const staffJobs = await st.locator('#content').textContent();
  check('staff sees the assigned job', staffJobs.includes('PMS-'), staffJobs.slice(0, 150));
  check('staff sees customer name', staffJobs.includes('Juan'), staffJobs.slice(0, 200));
  check('staff sees unit details', staffJobs.includes('Split Type'));
  check('staff does NOT see phone number', !/\+639\d{9}/.test(staffJobs), staffJobs.slice(0, 250));
  check('staff does NOT see street address', !staffJobs.includes('Domingo'), staffJobs.slice(0, 250));
  await st.screenshot({ path: OUT + '/16-staff-jobs.png', fullPage: true });

  console.log('\n=== Staff updates job status ===');
  await st.click('[data-progress]');
  await st.waitForSelector('#sStatus', { timeout: 10000 });
  const staffModal = await st.locator('.modal').textContent();
  check('staff modal has no contact details', !/\+639\d{9}/.test(staffModal), staffModal.slice(0, 200));
  await st.selectOption('#sStatus', 'in_progress');
  await st.click('#sSave');
  await st.waitForSelector('.modal-backdrop', { state: 'detached', timeout: 15000 });
  await st.waitForFunction(
    () => /in progress/i.test(document.querySelector('table.data tbody tr')?.innerText || ''),
    { timeout: 15000 });
  check('staff moved job to In progress', true);

  console.log('\n=== Customer cannot reach the ops dashboard ===');
  const cu = await offlinePage(browser, {});
  await signIn(cu, 'juan.delacruz@example.com', 'Aircon1!');
  await cu.goto('http://localhost:4321/app/admin');
  await cu.waitForURL('**/app/dashboard**', { timeout: 15000 }).catch(() => {});
  check('customer bounced from /app/admin to their dashboard', cu.url().includes('/app/dashboard'), cu.url());

  const real = errors.filter((e) => !/favicon|ERR_CONNECTION/.test(e));
  check('no page errors', real.length === 0, real.slice(0, 2).join(' | '));

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  await browser.close();
  if (fail) process.exitCode = 1;
})();
