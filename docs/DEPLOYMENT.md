# Gleamair Portal — Deployment & Verification

Everything in this guide is done once. Total time is roughly an hour, most of
it waiting for DNS.

Before anything else:

> **Rotate the PayMongo secret key before you deploy.** The live secret key
> was shared in plain text during development, so it must be treated as
> public. A live secret key can create charges, issue refunds and read every
> transaction on the account. Roll it in the PayMongo dashboard
> (Developers → API Keys) and use the new one below. Never paste a secret key
> into chat, email, a screenshot, or any file in this repository.
>
> The publishable key is safe to expose by design — and this build does not
> need it in the browser at all, because checkout sessions are created
> server-side.

---

## 1. MongoDB Atlas

1. Create a free **M0** cluster (choose the region closest to the Philippines,
   e.g. `ap-southeast-1` Singapore).
2. **Database Access** → add a user with **Read and write to any database**.
   Use a generated password.
3. **Network Access** → add `0.0.0.0/0`. Vercel's functions do not have fixed
   egress IPs, so an IP allowlist cannot be used here. The database user
   credentials are the control.
4. **Connect → Drivers** → copy the connection string. It becomes `MONGODB_URI`.

Indexes are created automatically on the first request; there is nothing to
run by hand.

## 2. Deploy to Vercel

1. Import the GitHub repository at [vercel.com/new](https://vercel.com/new).
2. Framework preset: **Other**. There is no build step — the HTML is served as
   static files and `api/` becomes serverless functions.
3. Deploy. You will get a `*.vercel.app` URL to test against before switching
   DNS.

## 3. Environment variables

**Settings → Environment Variables.** Add each to *Production* (and *Preview*
if you use preview deploys). Names are listed in `.env.example`.

| Name | Value |
|---|---|
| `MONGODB_URI` | The Atlas connection string from step 1 |
| `MONGODB_DB` | `gleamair` |
| `PAYMONGO_SECRET_KEY` | Your **newly rotated** live secret key |
| `PAYMONGO_WEBHOOK_SECRET` | Set in step 5 below (`whsk_...`) |
| `PAYMONGO_METHODS` | Start with `card`. See the warning below. |
| `PUBLIC_BASE_URL` | `https://www.gleamaire.com` — no trailing slash |
| `BOOTSTRAP_TOKEN` | `openssl rand -hex 32`. Delete after step 6. |

> **`PAYMONGO_METHODS` matters.** Every method listed must already be
> *activated* on your PayMongo account, or creating a checkout session fails
> and customers cannot pay. Start with `card`, confirm a payment works, then
> add `gcash` and `paymaya` once PayMongo has approved them.

Redeploy after adding variables — Vercel only injects them at build time.

## 4. Domain

**Settings → Domains** → add `gleamaire.com` and `www.gleamaire.com`, then
point your DNS at Vercel as instructed there.

Serving the site and the API from one origin is deliberate: the session cookie
is `HttpOnly; Secure; SameSite=Strict`, which means it is never exposed to
JavaScript and never sent cross-site. Splitting the API onto a subdomain would
force a weaker cookie policy.

## 5. PayMongo webhook

The webhook is what actually marks a booking paid. Without it, customers are
charged and their booking sits unconfirmed until someone opens the return page.

Create it with your **rotated** secret key:

```bash
export PAYMONGO_SECRET_KEY='your-rotated-secret-key'

curl -X POST https://api.paymongo.com/v1/webhooks \
  -u "$PAYMONGO_SECRET_KEY:" \
  -H "Content-Type: application/json" \
  -d '{
    "data": { "attributes": {
      "url": "https://www.gleamaire.com/api/webhooks/paymongo",
      "events": ["checkout_session.payment.paid", "payment.paid", "payment.failed"]
    }}
  }'
```

The response contains `data.attributes.secret_key`, starting with `whsk_`.
Put that in `PAYMONGO_WEBHOOK_SECRET` and redeploy.

Requests whose signature does not verify are rejected with 401, so an
unconfigured or wrong secret means **no payment is ever confirmed** — it does
not silently accept them.

## 6. Create the first superadmin

A fresh database has no accounts, and only a superadmin can create staff. This
route exists solely to break that deadlock, and refuses to run once any
superadmin exists.

```bash
curl -X POST https://www.gleamaire.com/api/bootstrap \
  -H "Content-Type: application/json" \
  -d '{
    "token": "YOUR_BOOTSTRAP_TOKEN",
    "firstName": "Your", "lastName": "Name",
    "email": "you@gleamaire.com",
    "phone": "09171234567",
    "password": "choose-a-strong-one-1!"
  }'
```

Then **delete `BOOTSTRAP_TOKEN`** from Vercel and redeploy. With the variable
absent the route returns 404.

Sign in at `/login` and create your staff and admin accounts from
**User Management**.

---

## Verification checklist

Work through this on the real deployment. Items marked **(!)** could not be
tested during development, because this environment has no network access to
PayMongo — they need a real transaction.

**Accounts**
- [ ] `/register` completes and lands on `/app/dashboard` already signed in
- [ ] Province → city → barangay dropdowns populate
- [ ] Typing `09171234567` in the phone field shows `917 123 4567` after `+63`
- [ ] A weak password is rejected with a specific reason
- [ ] Signing out and back in works; `/app/admin` bounces a customer away

**Payments (!)**
- [ ] Booking PMS redirects to a real PayMongo checkout page
- [ ] The amount charged is **PHP 250.00**, not 500.00
- [ ] Paying returns to `/app/booking-complete` showing "Your slot is reserved"
- [ ] The booking shows **Paid** on the customer dashboard
- [ ] In PayMongo's dashboard, the webhook delivery shows **200**
- [ ] Cancelling at checkout returns to the dashboard with the booking unpaid
      and a working **Pay now** button

Refund your own test payment afterwards — these are live charges.

**Operations**
- [ ] The paid job appears on `/app/admin` under *Awaiting assignment*
- [ ] The job's pin appears on the Job Map
- [ ] Assigning a technician moves it to *Technician assigned*
- [ ] Signing in as that staff member shows the job, with **no** customer phone,
      email or street address
- [ ] Staff can move the job to *In progress* and *Completed*
- [ ] A superadmin cannot delete or demote their own account

---

## Operating notes

**Webhook failures.** PayMongo retries failed deliveries. If a booking is
stuck unpaid but the customer was charged, opening
`/app/booking-complete?ref=PMS-000123` asks PayMongo directly and reconciles
it. Check the Vercel function logs for `[webhook]` lines.

Signature verification needs the *exact* bytes PayMongo signed, so
`api/webhooks/paymongo.js` disables body parsing via its `config` export. That
directive is best known from Next.js API routes; if Vercel's Node runtime ever
parses the body anyway, the raw bytes are gone and the HMAC cannot be
recomputed from a re-serialised object. The code fails closed and logs
`Could not read the raw request body for signature verification` rather than
hanging, and PayMongo will retry — but payments would then only confirm via the
return page. **Confirm on your first live payment that the webhook delivery
shows 200 in the PayMongo dashboard.** If it does not, the fix is to read the
body from the request stream in a runtime that leaves it untouched (for
example, moving just this one route to a Vercel Edge function, where `request`
exposes `.text()`).

**Login redirects.** `/login?next=…` accepts only same-origin paths, enforced
by `safeNext()` in `assets/js/portal.js`. Do not loosen it: the value is read
from the address bar, so anything else turns the login page into a
`javascript:` execution sink or an open redirect. `tests/browser/redirect.test.cjs`
covers this.

**Staff visibility.** Staff deliberately see only the customer's name, unit
details and map pin. If technicians need to phone customers, set
`STAFF_SEES_CONTACT = true` in `api/_lib/bookings.js` — that is the only change
required.

**Pricing.** PHP 500.00 total and PHP 250.00 down payment are placeholders, set
in `PRICING` in `api/_lib/paymongo.js`. Amounts are integer centavos
(`50_000` = PHP 500.00); never use floats for money.

**Address data.** Regenerate with `python tools/build-psgc.py` if the PSA
updates the PSGC. The raw source is not committed; the script re-downloads it.

**Tests.** `npm test` runs 79 API tests against an in-memory database fake. It
needs no network and no database, so it is safe to run in CI.

---

## Later: merging into Odoo

The schema was built for this. Every user carries `odooPartnerId` and
`odooUserId`; every booking carries `odooTaskId` and `odooSaleOrderId`. All are
`null` today.

A sync script would authenticate to Odoo's External API with an API key, then:

- push customers to `res.partner`, storing the returned id in `odooPartnerId`
- push paid bookings to a sale order (you have Sales) and a project or Field
  Service task, storing ids in `odooSaleOrderId` / `odooTaskId`
- skip any record whose Odoo id is already set, so the sync is re-runnable

Because Odoo is also PostgreSQL-backed and relational, this is a field mapping
rather than a data migration. Add `ODOO_URL`, `ODOO_DB`, `ODOO_USERNAME` and
`ODOO_API_KEY` as Vercel environment variables when you get there — the names
are already reserved in `.env.example`.

Note that Odoo Online (`*.odoo.com`) does not allow custom Python modules, and
its API does not send CORS headers, so the browser can never call Odoo
directly. The sync belongs in a serverless function alongside the existing API.
