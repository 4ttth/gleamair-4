# Gleamair Enterprises — Website & Customer/Staff Portal

The public marketing site plus a customer and operations portal for booking
Preventive Maintenance Service (PMS).

## Layout

```
*.html                    Marketing pages (unchanged design, now with a Login link)
login.html, register.html Portal entry: sign in, customer self-registration
app/                      Signed-in area
  dashboard.html            Customer: services, bookings
  book.html                 Customer: PMS booking + map pin -> PayMongo
  booking-complete.html     Customer: payment return / confirmation
  admin.html                Staff, admin and superadmin operations
api/                      Vercel serverless functions
  _lib/                     db, http, auth, validation, paymongo, bookings, services
  auth/, bookings/, services/, users/, webhooks/, bootstrap.js, geocode.js
assets/
  css/app.css               Portal design system
  js/                       portal.js, shell.js, psgc.js, geo.js, data-loader.js
  data/psgc/                Bundled Philippine address data (87 provinces)
  vendor/leaflet/           Self-hosted Leaflet (no CDN dependency)
conf/db/                  Marketing content JSON (see "Content" below)
tests/                    API tests against an in-memory MongoDB fake
tools/build-psgc.py       Regenerates assets/data/psgc/
docs/DEPLOYMENT.md        Deployment and verification runbook
```

## Running locally

```bash
npm install
node --import ./tests/loader.mjs tests/devserver.mjs   # http://localhost:4321
```

The dev server runs the real API handlers against an in-memory database with
PayMongo stubbed, so no keys, database or network are needed. Checkout lands on
a local stand-in page with "simulate payment" links.

To run against real services instead, use `vercel dev` with the environment
variables from `.env.example`.

```bash
npm test          # 191 API tests, no network or database required
```

## How it works

- **Roles.** `customer` < `staff` < `admin` < `superadmin`. Self-registration
  only ever creates a customer; every other role is created by a superadmin.
- **Sessions** are records in MongoDB. The cookie holds a random token and only
  its SHA-256 hash is stored, so a database leak yields no usable sessions and
  revocation is immediate. Cookies are `HttpOnly; Secure; SameSite=Strict`.
- **Passwords** use scrypt from Node's standard library — memory-hard, no
  native build step, no third-party dependency.
- **Payments.** The PayMongo secret key lives only in the server environment.
  Checkout sessions are created server-side and the customer is redirected to
  PayMongo's hosted page, so no key is needed in the browser. Payment is
  confirmed by a signature-verified webhook, with the return page able to
  reconcile directly if that webhook is delayed.
- **Money** is handled as integer centavos throughout. Prices are set at runtime
  by an admin from **Service Pricing** in the ops dashboard, stored in the
  `services` collection and read fresh on every booking — see
  `api/_lib/services.js`. A change applies to the next booking; existing
  bookings keep the amounts their customer was quoted.
- **Staff visibility** is deliberately narrow: customer name, unit details and
  map pin only. Widen it with `STAFF_SEES_CONTACT` in `api/_lib/bookings.js`.
- **Maps** use Leaflet and OpenStreetMap — no API key, no billing account.
  Every map degrades gracefully; a booking is still completable without one.
- **The booking map opens on the customer**, not on the office. Two sources
  race on page load: the barangay registered on their account, geocoded
  server-side by `GET /api/geocode`, and the browser's own position if they
  have already granted permission. The better of the two drops the pin and the
  customer nudges it onto their gate. If neither answers, the map falls back to
  Olongapo with no pin claimed, and the customer places one themselves.
  Geocoded localities are cached in `geocache` with a TTL, so one lookup serves
  every customer in that barangay and OpenStreetMap's usage policy is
  respected — see `api/_lib/geocode.js`.
- **Both maps can be searched.** Customers jump the booking map to a landmark
  or subdivision instead of dragging the marker across a province; staff use
  the same box to find a job's neighbourhood. Searches run on submit rather
  than per keystroke, are cached, and are quota'd per user — all three are what
  the geocoder's usage policy asks for.

The schema reserves `odooPartnerId`, `odooUserId`, `odooTaskId` and
`odooSaleOrderId` so the data can later be merged into Odoo as a sync rather
than a migration. See the end of `docs/DEPLOYMENT.md`.

## Deployment

See **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** for the full runbook: MongoDB
Atlas, Vercel, environment variables, the PayMongo webhook, creating the first
superadmin, and a verification checklist.

Never commit real keys. `.env.example` lists the variable names only.

## Content

Marketing page content lives in `conf/db/*.json`. After editing any of them:

```bash
python sync-data.py
```

Philippine address data is generated, not hand-edited:

```bash
python tools/build-psgc.py
```
