# Browser tests

End-to-end checks driven through a real browser against `tests/devserver.mjs`,
which runs the actual API handlers against an in-memory database with PayMongo
stubbed. No keys, database or network access are needed.

Playwright is deliberately **not** a dependency in `package.json` — its
postinstall downloads ~150 MB of browsers, which would slow every Vercel build
for no benefit. Install it only when you want to run these:

```bash
npm install --no-save playwright
npx playwright install chromium

# terminal 1
node --import ./tests/loader.mjs tests/devserver.mjs

# terminal 2
node tests/browser/flow.test.cjs        # registration: address, phone, password
node tests/browser/customer.test.cjs    # dashboard, booking, map pin, payment
node tests/browser/admin.test.cjs       # roles, assignment, dispatch map
node tests/browser/redirect.test.cjs   # ?next= cannot become XSS or open redirect
node tests/browser/pricing.test.cjs     # admin re-prices a service; customer sees it
```

`pricing.test.cjs` is standalone — it creates its own accounts and does not
need the other suites. It changes the PMS price, so run it **last**: the other
suites assert the seeded PHP 500.00.

`redirect.test.cjs` only needs the customer from `flow.test.cjs`. It is a
genuine regression test: reverting `safeNext()` in `assets/js/portal.js` makes
it fail with the payload actually executing.

`admin.test.cjs` expects `flow` and `customer` to have run first (they create
the customer and the paid booking), plus a superadmin:

```bash
curl -X POST http://localhost:4321/api/bootstrap -H 'Content-Type: application/json' \
  -d '{"token":"dev-bootstrap-token","firstName":"Ana","lastName":"Reyes",
       "email":"ana@gleamaire.com","phone":"09170000001","password":"Sup3r!pass"}'
```

The suites are **not** idempotent — the dev server holds state in memory, so
restart it before a full run.

Set `SHOTS=/some/dir` to keep screenshots, and `CHROMIUM_PATH` to use a
system Chromium instead of Playwright's own build.
