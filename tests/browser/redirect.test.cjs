/* Regression: the ?next= login redirect must never become a javascript: sink
   or an open redirect. See safeNext() in assets/js/portal.js. */
const { chromium } = require('playwright');
const EXE = process.env.CHROMIUM_PATH || undefined;
const BASE = 'http://localhost:4321';
let pass = 0, fail = 0;
const check = (l, c, x) => { c ? (pass++, console.log('  PASS  ' + l)) : (fail++, console.log('  FAIL  ' + l + (x ? ' -> ' + x : ''))); };

const offlinePage = async (browser, opts) => {
  const p = await browser.newPage(opts);
  await p.route('**', (route) => {
    const u = route.request().url();
    return (u.startsWith(BASE) || u.startsWith('data:')) ? route.continue() : route.abort();
  });
  return p;
};

(async () => {
  const browser = await chromium.launch({ ...(EXE ? { executablePath: EXE } : {}), args: ['--no-sandbox'] });
  const page = await offlinePage(browser, {});

  // Signed in, so the auto-redirect on /login fires without any interaction.
  await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded' });
  await page.fill('#email', 'juan.delacruz@example.com');
  await page.fill('#password', 'Aircon1!');
  await Promise.all([page.waitForURL(/\/app\//, { timeout: 20000 }), page.click('#submitBtn')]);
  check('signed in', page.url().includes('/app/dashboard'));

  // Any dialog would mean the payload executed.
  let executed = false;
  page.on('dialog', async (d) => { executed = true; await d.dismiss(); });
  await page.exposeFunction('__pwned', () => { executed = true; });

  const hostile = [
    ['javascript: window.__pwned && window.__pwned()', 'javascript: URL'],
    ['javascript:alert(1)', 'javascript:alert'],
    ['https://evil.example/login', 'absolute off-site URL'],
    ['//evil.example/login', 'protocol-relative URL'],
    ['/\\evil.example/login', 'backslash-smuggled URL'],
    ['data:text/html,<script>alert(1)</script>', 'data: URL'],
  ];

  for (const [payload, label] of hostile) {
    executed = false;
    await page.goto(BASE + '/login?next=' + encodeURIComponent(payload), { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    const url = page.url();
    const onOwnOrigin = url.startsWith(BASE);
    const landedSafely = url.includes('/app/dashboard');
    check(`${label}: no script executed`, !executed, payload);
    check(`${label}: stayed on our origin`, onOwnOrigin, url);
    check(`${label}: fell back to the real landing page`, landedSafely, url);
  }

  // A legitimate same-origin path must still work, or the fix broke the feature.
  await page.goto(BASE + '/login?next=' + encodeURIComponent('/app/book?service=PMS'), { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  check('legitimate relative next= still honoured', page.url().includes('/app/book'), page.url());

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  await browser.close();
  if (fail) process.exitCode = 1;
})();
