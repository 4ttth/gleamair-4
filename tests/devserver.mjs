/* Local dev server: serves the static site and runs the REAL API handlers
   against the in-memory database fake, with PayMongo stubbed.

   Run:  node --import ./tests/loader.mjs tests/devserver.mjs
   This is a development aid only — it is never deployed. */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT || 4321);

process.env.PAYMONGO_SECRET_KEY = 'sk_test_devserver';
process.env.PAYMONGO_WEBHOOK_SECRET = 'whsk_devserver';
process.env.PUBLIC_BASE_URL = `http://localhost:${PORT}`;
process.env.BOOTSTRAP_TOKEN = 'dev-bootstrap-token';

// Stand in for PayMongo so no real network call or charge happens locally.
globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  if (u.includes('/checkout_sessions')) {
    if ((init.method || 'GET') === 'GET') {
      return new Response(JSON.stringify({ data: { id: 'cs_dev', attributes: {
        payments: [{ attributes: { status: 'paid', amount: 25000, source: { type: 'gcash' } } }],
        payment_intent: { id: 'pi_dev' },
      }}}), { status: 200 });
    }
    const body = JSON.parse(init.body || '{}');
    const ref = body?.data?.attributes?.reference_number || '';
    // Land on a local page that mimics the hosted PayMongo checkout.
    return new Response(JSON.stringify({ data: { id: 'cs_dev_' + ref, attributes: {
      checkout_url: `http://localhost:${PORT}/__fake-paymongo?ref=${encodeURIComponent(ref)}`,
    }}}), { status: 200 });
  }
  return new Response('{}', { status: 200 });
};

const handlers = {
  'auth/register':    (await import('../api/auth/register.js')).default,
  'auth/login':       (await import('../api/auth/login.js')).default,
  'auth/logout':      (await import('../api/auth/logout.js')).default,
  'auth/me':          (await import('../api/auth/me.js')).default,
  'bookings':         (await import('../api/bookings/index.js')).default,
  'bookings/:id':     (await import('../api/bookings/[id].js')).default,
  'users':            (await import('../api/users/index.js')).default,
  'users/:id':        (await import('../api/users/[id].js')).default,
  'webhooks/paymongo':(await import('../api/webhooks/paymongo.js')).default,
  'bootstrap':        (await import('../api/bootstrap.js')).default,
};

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.JPG': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webp': 'image/webp',
  '.mp4': 'video/mp4', '.pdf': 'application/pdf',
};

function apiRoute(pathname) {
  const parts = pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean);
  if (!parts.length) return null;
  const joined = parts.join('/');
  if (handlers[joined]) return { handler: handlers[joined], query: {} };
  if (parts.length === 2 && handlers[`${parts[0]}/:id`]) {
    return { handler: handlers[`${parts[0]}/:id`], query: { id: parts[1] } };
  }
  return null;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname.startsWith('/api/')) {
    const route = apiRoute(url.pathname);
    if (!route) { res.statusCode = 404; return res.end(JSON.stringify({ ok: false, error: 'No such endpoint.' })); }
    req.query = route.query;
    try { return await route.handler(req, res); }
    catch (err) { res.statusCode = 500; return res.end(JSON.stringify({ ok: false, error: err.message })); }
  }

  // Stand-in for PayMongo's hosted checkout page.
  if (url.pathname === '/__fake-paymongo') {
    const ref = url.searchParams.get('ref') || '';
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end(`<!DOCTYPE html><meta charset="utf-8">
<title>Fake PayMongo Checkout</title>
<body style="font-family:system-ui;max-width:520px;margin:60px auto;padding:24px;border:1px solid #ddd;border-radius:12px">
<h1 style="font-size:20px">Fake PayMongo checkout</h1>
<p>Stand-in for the hosted PayMongo page. Booking <b>${ref}</b>, down payment <b>PHP 250.00</b>.</p>
<p><a id="pay" href="/app/booking-complete?ref=${encodeURIComponent(ref)}">Simulate successful payment</a></p>
<p><a href="/app/dashboard?payment=cancelled&ref=${encodeURIComponent(ref)}">Simulate cancelled payment</a></p>
</body>`);
  }

  // Static files, with Vercel's cleanUrls behaviour.
  let rel = decodeURIComponent(url.pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  let file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT)) { res.statusCode = 403; return res.end('Forbidden'); }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    if (fs.existsSync(file + '.html')) file += '.html';
    else if (fs.existsSync(path.join(file, 'index.html'))) file = path.join(file, 'index.html');
    else { res.statusCode = 404; return res.end('Not found: ' + rel); }
  }
  res.setHeader('Content-Type', MIME[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});

server.listen(PORT, () => console.log(`dev server on http://localhost:${PORT}`));
