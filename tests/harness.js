/* Drives the real route handlers with fake req/res objects. */
import { EventEmitter } from 'node:events';

export function makeReq({ method = 'GET', url = '/', body, rawBody, cookies = {}, query = {}, headers = {} } = {}) {
  const req = new EventEmitter();
  req.method = method;
  req.url = url;
  req.query = query;
  req.headers = { ...headers };
  if (Object.keys(cookies).length) {
    req.headers.cookie = Object.entries(cookies).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('; ');
  }
  if (body !== undefined) req.body = body;
  if (rawBody !== undefined) req.rawBody = rawBody;
  req.socket = { remoteAddress: '203.0.113.9' };
  return req;
}

export function makeRes() {
  const res = {
    statusCode: 200,
    _headers: {},
    body: null,
    setHeader(k, v) { this._headers[k.toLowerCase()] = v; },
    getHeader(k) { return this._headers[k.toLowerCase()]; },
    end(payload) { this.body = payload ? JSON.parse(payload) : null; },
  };
  return res;
}

/** Extracts the session cookie value a route just set. */
export function sessionFrom(res) {
  const raw = res.getHeader('set-cookie');
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  for (const c of list) {
    const m = /^gleam_session=([^;]*)/.exec(c);
    if (m && m[1]) return decodeURIComponent(m[1]);
  }
  return null;
}

export async function call(handler, opts) {
  const req = makeReq(opts);
  const res = makeRes();
  await handler(req, res);
  return res;
}

let passed = 0, failed = 0;
export function check(label, cond, extra) {
  if (cond) { passed++; console.log('  PASS  ' + label); }
  else { failed++; console.log('  FAIL  ' + label + (extra ? '  -> ' + JSON.stringify(extra).slice(0, 300) : '')); }
}
export function summary() {
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed) process.exitCode = 1;
}
