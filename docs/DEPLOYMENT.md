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
| `PUBLIC_BASE_URL` | Your **canonical** origin (see step 4) — no trailing slash |
| `BOOTSTRAP_TOKEN` | `openssl rand -hex 32`. Delete after step 6. |
| `PAYMONGO_MIN_AMOUNT` | Optional. Lowest price an admin may set, in centavos (default `100` = PHP 1.00). |
| `PAYMONGO_MAX_AMOUNT` | Optional. Highest price an admin may set, in centavos (default `100000000`). |
| `GEOCODER_CONTACT` | Optional but recommended. Site URL or ops email; identifies you to OpenStreetMap's geocoder. |
| `GEOCODER_URL` | Optional. Only if you move off the public Nominatim service. |

> **`PAYMONGO_METHODS` matters.** Every method listed must already be
> *activated* on your PayMongo account, or creating a checkout session fails
> and customers cannot pay. Start with `card`, confirm a payment works, then
> add `gcash` and `paymaya` once PayMongo has approved them.

Redeploy after adding variables — Vercel only injects them at build time.

## 4. Domain

**Settings → Domains** → add `gleamaire.com` and `www.gleamaire.com`, then
point your DNS at Vercel as instructed there.

Vercel serves **one** of the two as the canonical domain and answers the other
with a `308` redirect to it. Note which one it marked as the primary — that is
the origin every URL below must use.

This matters more than it looks. A redirect is only followed by clients that
choose to follow it, and the two most important non-browser callers do not:

- `curl` does not follow redirects unless you pass `-L`, so a `POST` to the
  redirecting host does nothing and prints `Redirecting...`.
- PayMongo does not follow redirects when delivering webhooks, so a webhook
  registered on the redirecting host is **never delivered** and no payment is
  ever confirmed.

Check which host is canonical before continuing:

```bash
curl -sI https://www.gleamaire.com/ | head -n 3
```

A `200` means that host is canonical. A `301`/`308` plus a `location:` header
means it is not — use the host in `location:` for `PUBLIC_BASE_URL`, for the
PayMongo webhook URL, and for the bootstrap call.

Serving the site and the API from one origin is deliberate: the session cookie
is `HttpOnly; Secure; SameSite=Strict`, which means it is never exposed to
JavaScript and never sent cross-site. Splitting the API onto a subdomain would
force a weaker cookie policy.

## 5. PayMongo webhook

The webhook is what actually marks a booking paid. Without it, customers are
charged and their booking sits unconfirmed until someone opens the return page.

Create it with your **rotated** secret key. The `url` must be your canonical
domain from step 4 — PayMongo does not follow redirects, so registering the
redirecting host means no payment is ever confirmed:

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

Use your canonical domain from step 4. `-i` shows the status code and `-L`
follows a redirect if you got the host wrong — `--post308` keeps it a `POST`
rather than silently retrying as a `GET`:

```bash
curl -i -L --post301 --post302 --post303 --post307 --post308 \
  -X POST https://gleamaire.com/api/bootstrap \
  -H "Content-Type: application/json" \
  -d '{
    "token": "YOUR_BOOTSTRAP_TOKEN",
    "firstName": "Your", "lastName": "Name",
    "email": "you@gleamaire.com",
    "phone": "09171234567",
    "password": "choose-a-strong-one-1!"
  }'
```

Read the response before moving on — the route reports every failure as JSON,
and a silent one means it never ran:

| Response | Meaning |
|---|---|
| `200` with `"ok": true` | The superadmin was created. |
| `Redirecting...` / `308` | You used the non-canonical host. See step 4. |
| `403 Invalid bootstrap token.` | `token` does not match `BOOTSTRAP_TOKEN`. |
| `404 Not found.` | `BOOTSTRAP_TOKEN` is unset, or you did not redeploy after adding it. |
| `409 A superadmin already exists.` | Already done. Sign in instead. |
| `400 Password must ...` | 8+ characters, one number, one special character. |

If the account does not appear in the `users` collection in Atlas, the request
never reached the function — signing in will report *Email or password is
incorrect*, because there is no such user.

Then **delete `BOOTSTRAP_TOKEN`** from Vercel and redeploy. With the variable
absent the route returns 404.

Sign in at `/login` and create your staff and admin accounts from
**User Management**.

## 7. Service pricing

Prices are **not** in the code. They live in the `services` collection and are
edited from **Service Pricing** in the ops dashboard by any admin or superadmin.
On first run the collection is seeded with the values the site previously had
hardcoded (PMS at PHP 500.00 total, PHP 250.00 to reserve); after that the
database is authoritative and a redeploy never overwrites what you have set.

A change takes effect on the **next** booking — the customer dashboard, the
booking page and the amount sent to PayMongo all read the same live figure.

What a change does *not* do is re-price anything that already exists. Every
booking stores the amounts it was quoted, so:

- a booking awaiting payment still owes the amount its customer agreed to, and
  its PayMongo checkout link keeps charging that;
- a paid booking's history stays truthful;
- the balance a technician collects on site is the one on the job card.

Two guards are worth knowing about:

- **Concurrent edits.** Saving sends the version you were looking at. If
  someone else changed the price meanwhile, your save is refused rather than
  silently overwriting theirs — reload and reapply.
- **Price range.** Prices may be set from PHP 1.00 to PHP 1,000,000.00, and
  anything outside that is refused when you save it. PayMongo enforces its own
  per-transaction minimum on top of this, which varies by payment method and
  account — a price below it is refused at the customer's checkout with
  *"priced below the minimum our payment provider accepts"*, and the fix is to
  raise the price. If you know your account's real floor, set
  `PAYMONGO_MIN_AMOUNT` (in centavos) to it so the admin form catches it
  instead. `PAYMONGO_MAX_AMOUNT` sets the ceiling the same way.

Prices can also be read and set over the API:

```bash
# Read the catalogue (public)
curl -s https://gleamaire.com/api/services

# Change a price (admin session cookie required; version comes from the read)
curl -X PATCH https://gleamaire.com/api/services/PMS \
  -H "Content-Type: application/json" -b "gleam_session=..." \
  -d '{"total": 75000, "downpayment": 40000, "version": 1}'
```

Amounts are in **centavos** — PHP 750.00 is `75000`.

### "Online payment is not configured yet"

A customer sees this when a booking cannot reach PayMongo at all. It means one
of two environment variables is missing from the deployment:

| Missing | Effect |
|---|---|
| `PAYMONGO_SECRET_KEY` | No checkout session can be created. |
| `PUBLIC_BASE_URL` | No return URLs can be built, so no session is created. |

Both produce the same message to the customer, on purpose. To see **which** one
it is, open **Service Pricing** in the ops dashboard as an admin — a banner
there names the missing variable. Add it under **Settings → Environment
Variables** and **redeploy**: Vercel only injects environment variables at build
time, so adding one without redeploying changes nothing.

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

**Booking map**
- [ ] The booking map opens on the customer's own barangay, not on Olongapo
      (test with an account registered outside Zambales)
- [ ] The readout under the map names that barangay
- [ ] **Use my current location** moves the pin and zooms in
- [ ] Searching a landmark lists results and choosing one moves the pin
- [ ] After the first booking from a barangay, the `geocache` collection in
      Atlas holds a row for it and the next booking from there is instant

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

**Booking map pins.** The map on `/app/book` opens where the customer is:
`GET /api/geocode` turns the barangay on their account into coordinates, and
the browser's own position takes over if they have already granted permission.
Lookups go to OpenStreetMap's Nominatim, whose usage policy asks for an
identifying User-Agent (`GEOCODER_CONTACT`) and for results to be cached —
they are, in the `geocache` collection, keyed by PSGC code with a TTL, so a
barangay is looked up once and every later booking from it is served from
Atlas. If the geocoder is unreachable the route still answers `200` with
`location: null`; the map falls back to Olongapo, claims no pin, and the
customer drops one themselves. A booking is never blocked by any of this.
To force a re-lookup after a bad result, delete that row from `geocache`.

The same route answers `?q=` for the search box on both maps. Searches are
cached in `geocache` under a `q:` key and quota'd per user in `apiLimits`
(40 per 5 minutes, then `429`), because a search box is the one part of this
that a person can hold down. If Nominatim ever rate-limits the deployment,
those are the two knobs — `SEARCH_QUOTA` and `SEARCH_WINDOW_MS` in
`api/_lib/geocode.js` — before considering `GEOCODER_URL` and a provider of
your own.

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
