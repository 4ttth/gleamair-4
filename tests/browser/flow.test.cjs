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
  const page = await offlinePage(browser, { viewport: { width: 1440, height: 950 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

  console.log('\n=== Login page ===');
  await page.goto('http://localhost:4321/login', { waitUntil: 'networkidle' });
  await page.screenshot({ path: OUT + '/01-login.png' });
  check('brand panel renders', await page.locator('.auth-aside h1').isVisible());
  check('email + password fields present', await page.locator('#email').isVisible() && await page.locator('#password').isVisible());
  check('show/hide password toggle injected', await page.locator('.pw-toggle').isVisible());

  await page.fill('#email', 'nobody@example.com');
  await page.fill('#password', 'WrongPass1!');
  await page.click('#submitBtn');
  await page.waitForSelector('#formAlert:not([hidden])', { timeout: 5000 });
  check('bad credentials show an alert', (await page.locator('#formAlert').textContent()).includes('incorrect'));
  await page.screenshot({ path: OUT + '/02-login-error.png' });

  console.log('\n=== Registration step 1 ===');
  await page.goto('http://localhost:4321/register', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelector('#province')?.options.length > 5, { timeout: 15000 });
  const provCount = await page.locator('#province option').count();
  const groupCount = await page.locator('#province optgroup').count();
  check('provinces loaded (' + provCount + ' options)', provCount > 80, String(provCount));
  check('grouped by region (' + groupCount + ' optgroups)', groupCount > 10, String(groupCount));

  console.log('\n--- phone 09 -> +639 auto-translation ---');
  await page.fill('#phone', '09171234567');
  await page.locator('#phone').blur();
  let shown = await page.inputValue('#phone');
  check('typing 09171234567 renders as "' + shown + '" behind the +63 prefix', shown === '917 123 4567', shown);
  await page.fill('#phone', '+639171234567');
  await page.locator('#phone').blur();
  shown = await page.inputValue('#phone');
  check('pasting +639171234567 renders as "' + shown + '"', shown === '917 123 4567', shown);
  await page.fill('#phone', '639171234567');
  await page.locator('#phone').blur();
  check('pasting 639171234567 also normalises', (await page.inputValue('#phone')) === '917 123 4567');

  await page.fill('#firstName', 'Juan');
  await page.fill('#lastName', 'Dela Cruz');
  await page.fill('#email', 'juan.delacruz@example.com');
  await page.fill('#phone', '09171234567');
  await page.fill('#line1', '12 Domingo Street');
  await page.fill('#line2', 'Gordon Heights');

  console.log('\n--- cascading address dropdowns ---');
  check('city disabled before province chosen', await page.locator('#city').isDisabled());
  await page.selectOption('#province', { label: 'Bataan' });
  await page.waitForFunction(() => !document.querySelector('#city').disabled, { timeout: 10000 });
  const cityCount = await page.locator('#city option').count();
  check('Bataan cities loaded (' + (cityCount - 1) + ')', cityCount > 5, String(cityCount));
  check('barangay still disabled', await page.locator('#barangay').isDisabled());

  await page.selectOption('#city', { label: 'Abucay' });
  await page.waitForFunction(() => !document.querySelector('#barangay').disabled, { timeout: 10000 });
  const brgyCount = await page.locator('#barangay option').count();
  check('Abucay barangays loaded (' + (brgyCount - 1) + ')', brgyCount > 3, String(brgyCount));
  await page.selectOption('#barangay', { label: 'Bangkal' });
  await page.screenshot({ path: OUT + '/03-register-step1.png', fullPage: true });

  console.log('\n=== Registration step 2: password rules ===');
  await page.click('#toStep2');
  await page.waitForSelector('#step2:not(.hidden)');
  await page.screenshot({ path: OUT + '/04-register-step2.png' });
  check('step indicator marks step 1 done', (await page.locator('#stepInd1').getAttribute('class')).includes('done'));

  await page.fill('#password', 'abc');
  const metAfterShort = await page.locator('.pw-rules li.met').count();
  check('no rules met for "abc"', metAfterShort === 0, String(metAfterShort));
  await page.fill('#password', 'abcdefgh');
  check('length rule met, number/special not', (await page.locator('.pw-rules li.met').count()) === 1);
  await page.fill('#password', 'abcdefg1');
  check('length + number met', (await page.locator('.pw-rules li.met').count()) === 2);
  await page.fill('#password', 'Aircon1!');
  check('all three rules met', (await page.locator('.pw-rules li.met').count()) === 3);
  await page.screenshot({ path: OUT + '/05-password-rules.png' });

  await page.fill('#confirm', 'Different1!');
  await page.click('#submitBtn');
  await page.waitForSelector('[data-field="confirm"].invalid', { timeout: 5000 });
  check('mismatched confirmation blocked', true);

  console.log('\n=== Submit -> auto-login -> dashboard ===');
  await page.fill('#confirm', 'Aircon1!');
  await page.click('#submitBtn');
  await page.waitForURL('**/app/dashboard**', { timeout: 15000 }).catch(() => {});
  check('redirected to customer dashboard', page.url().includes('/app/dashboard'), page.url());

  console.log('\n=== Console errors ===');
  // The signed-in probe on /login and /register returns 401 for anonymous
  // visitors by design; Chrome logs every failed fetch as a console error.
  const real = errors.filter((e) => !/favicon|net::ERR_|401 \(Unauthorized\)/.test(e));
  check('no JS errors during the flow', real.length === 0, real.slice(0, 3).join(' | '));

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  await browser.close();
  if (fail) process.exitCode = 1;
})();
