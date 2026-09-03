/* Small HTTP helpers shared by every route: JSON responses, body/cookie
   parsing, method dispatch, and a consistent error envelope. */

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const badRequest   = (msg, details) => new ApiError(400, msg, details);
export const unauthorized = (msg = 'You are not signed in.') => new ApiError(401, msg);
export const forbidden    = (msg = 'You do not have access to this.') => new ApiError(403, msg);
export const notFound     = (msg = 'Not found.') => new ApiError(404, msg);
export const conflict     = (msg, details) => new ApiError(409, msg, details);

export function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

export const ok = (res, payload = {}) => json(res, 200, { ok: true, ...payload });

/** Reads and JSON-parses the request body, tolerating Vercel's pre-parse. */
export async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const raw = await readRaw(req);
  if (!raw.length) return {};
  try {
    return JSON.parse(raw.toString('utf8'));
  } catch {
    throw badRequest('Request body was not valid JSON.');
  }
}

/** Raw bytes — required for PayMongo webhook signature verification, which
    signs the exact payload received. Re-serialising a parsed object would
    change whitespace and break the HMAC. */
export function readRaw(req) {
  if (req.rawBody) return Promise.resolve(Buffer.from(req.rawBody));
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > 1_000_000) {
        reject(badRequest('Request body too large.'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export function parseCookies(req) {
  const header = req.headers.cookie;
  if (!header) return {};
  const out = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    const k = part.slice(0, idx).trim();
    if (k) out[k] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}

export function setCookie(res, name, value, { maxAge, expires } = {}) {
  const bits = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',            // unreadable from JavaScript, so XSS cannot steal it
    'SameSite=Strict',     // browser will not attach it to cross-site requests
    'Secure',
  ];
  if (maxAge != null) bits.push(`Max-Age=${maxAge}`);
  if (expires) bits.push(`Expires=${expires.toUTCString()}`);

  const existing = res.getHeader('Set-Cookie');
  const list = existing ? (Array.isArray(existing) ? existing : [existing]) : [];
  res.setHeader('Set-Cookie', [...list, bits.join('; ')]);
}

export function clearCookie(res, name) {
  const existing = res.getHeader('Set-Cookie');
  const list = existing ? (Array.isArray(existing) ? existing : [existing]) : [];
  res.setHeader('Set-Cookie', [
    ...list,
    `${name}=; Path=/; HttpOnly; SameSite=Strict; Secure; Max-Age=0`,
  ]);
}

export function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd) return fwd.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

/**
 * Wraps a per-method handler map with method dispatch and error translation,
 * so no route has to repeat try/catch or 405 handling.
 *
 *   export default route({ GET: listThings, POST: createThing });
 */
export function route(handlers) {
  const allowed = Object.keys(handlers);
  return async function handler(req, res) {
    try {
      const method = (req.method || 'GET').toUpperCase();
      const fn = handlers[method];
      if (!fn) {
        res.setHeader('Allow', allowed.join(', '));
        throw new ApiError(405, `${method} is not supported here.`);
      }
      await fn(req, res);
    } catch (err) {
      if (err instanceof ApiError) {
        return json(res, err.status, {
          ok: false,
          error: err.message,
          ...(err.details ? { details: err.details } : {}),
        });
      }
      // Never leak stack traces or driver messages to the browser.
      console.error('[api] unhandled error:', err);
      return json(res, 500, { ok: false, error: 'Something went wrong on our side. Please try again.' });
    }
  };
}
