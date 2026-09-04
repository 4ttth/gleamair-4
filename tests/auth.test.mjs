import crypto from 'node:crypto';
import { call, check, sessionFrom, summary } from './harness.js';

process.env.PAYMONGO_SECRET_KEY = 'sk_test_fake';
process.env.PAYMONGO_WEBHOOK_SECRET = 'whsk_testsecret';
process.env.PUBLIC_BASE_URL = 'https://www.gleamaire.com';
process.env.BOOTSTRAP_TOKEN = 'boot-token-abc';

// Stub PayMongo's HTTP surface; everything else is the real code path.
let lastCheckoutBody = null;
globalThis.fetch = async (url, init) => {
  lastCheckoutBody = JSON.parse(init.body || '{}');
  if (String(url).includes('/checkout_sessions')) {
    return new Response(JSON.stringify({
      data: { id: 'cs_fake_1', attributes: { checkout_url: 'https://checkout.paymongo.com/cs_fake_1' } },
    }), { status: 200 });
  }
  return new Response('{}', { status: 200 });
};

const register = (await import('../api/auth/register.js')).default;
const login    = (await import('../api/auth/login.js')).default;
const me       = (await import('../api/auth/me.js')).default;
const logout   = (await import('../api/auth/logout.js')).default;
const bookings = (await import('../api/bookings/index.js')).default;
const bookingOne = (await import('../api/bookings/[id].js')).default;
const usersIdx = (await import('../api/users/index.js')).default;
const userOne  = (await import('../api/users/index.js')).default;
const webhook  = (await import('../api/webhooks/paymongo.js')).default;
const bootstrap = (await import('../api/bootstrap.js')).default;

const ADDR = {
  line1: '12 Domingo St', line2: 'Gordon Heights',
  provinceCode: '0308', provinceName: 'Bataan',
  cityCode: '030801', cityName: 'Abucay',
  barangayCode: '030801001', barangayName: 'Bangkal',
};
const sess = (t) => ({ cookies: { gleam_session: t } });

console.log('\n=== 1. Customer registration + auto-login ===');
let r = await call(register, { method: 'POST', body: {
  firstName: 'Juan', lastName: 'Dela Cruz', email: 'juan@example.com',
  phone: '09171234567', address: ADDR, password: 'Aircon1!',
}});
check('register returns 200', r.statusCode === 200, r.body);
check('role forced to customer', r.body?.user?.role === 'customer', r.body?.user);
check('phone normalised to +639', r.body?.user?.phone === '+639171234567', r.body?.user?.phone);
check('auto-login sets session cookie', !!sessionFrom(r));
check('redirects to customer dashboard', r.body?.redirect === '/app/dashboard', r.body);
check('password hash never returned', !JSON.stringify(r.body).includes('scrypt'));
const customerTok = sessionFrom(r);

r = await call(register, { method: 'POST', body: {
  firstName: 'Evil', lastName: 'User', email: 'evil@example.com',
  phone: '09171234500', address: ADDR, password: 'Aircon1!', role: 'superadmin',
}});
check('cannot self-register as superadmin', r.body?.user?.role === 'customer', r.body?.user);

r = await call(register, { method: 'POST', body: {
  firstName: 'Dup', lastName: 'User', email: 'juan@example.com',
  phone: '09171234511', address: ADDR, password: 'Aircon1!',
}});
check('duplicate email rejected (409)', r.statusCode === 409, r.body);

r = await call(register, { method: 'POST', body: {
  firstName: 'Weak', lastName: 'Pw', email: 'weak@example.com',
  phone: '09171234522', address: ADDR, password: 'abcdefgh',
}});
check('weak password rejected', r.statusCode === 400 && /special character/.test(r.body?.error||''), r.body);

console.log('\n=== 2. Login + session ===');
r = await call(login, { method: 'POST', body: { email: 'juan@example.com', password: 'wrongpass1!' }});
check('wrong password -> 401', r.statusCode === 401, r.body);
check('no user enumeration in message', r.body?.error === 'Email or password is incorrect.', r.body);
r = await call(login, { method: 'POST', body: { email: 'nobody@example.com', password: 'whatever1!' }});
check('unknown email gives identical message', r.body?.error === 'Email or password is incorrect.', r.body);

r = await call(login, { method: 'POST', body: { email: 'juan@example.com', password: 'Aircon1!' }});
check('correct password -> 200', r.statusCode === 200, r.body);
check('cookie is HttpOnly+Secure+SameSite=Strict',
  /HttpOnly/.test(String(r.getHeader('set-cookie'))) &&
  /Secure/.test(String(r.getHeader('set-cookie'))) &&
  /SameSite=Strict/.test(String(r.getHeader('set-cookie'))), r.getHeader('set-cookie'));

r = await call(me, { method: 'GET', ...sess(customerTok) });
check('me works with session', r.statusCode === 200 && r.body?.user?.email === 'juan@example.com', r.body);
r = await call(me, { method: 'GET' });
check('me without session -> 401', r.statusCode === 401, r.body);
r = await call(me, { method: 'GET', ...sess('forged-token') });
check('forged cookie -> 401', r.statusCode === 401, r.body);

console.log('\n=== 3. Bootstrap superadmin ===');
r = await call(bootstrap, { method: 'POST', body: { token: 'wrong', firstName: 'A', lastName: 'B', email: 'sa@gleamaire.com', phone: '09170000001', password: 'Sup3r!pass' }});
check('bad bootstrap token -> 403', r.statusCode === 403, r.body);
r = await call(bootstrap, { method: 'POST', body: { token: 'boot-token-abc', firstName: 'Super', lastName: 'Admin', email: 'sa@gleamaire.com', phone: '09170000001', password: 'Sup3r!pass' }});
check('bootstrap creates superadmin', r.statusCode === 200 && r.body?.user?.role === 'superadmin', r.body);
r = await call(bootstrap, { method: 'POST', body: { token: 'boot-token-abc', firstName: 'Second', lastName: 'Admin', email: 'sa2@gleamaire.com', phone: '09170000002', password: 'Sup3r!pass' }});
check('bootstrap refuses a second run', r.statusCode === 409, r.body);

r = await call(login, { method: 'POST', body: { email: 'sa@gleamaire.com', password: 'Sup3r!pass' }});
const superTok = sessionFrom(r);
check('superadmin lands on /app/admin', r.body?.redirect === '/app/admin', r.body);

console.log('\n=== 4. Superadmin creates staff + admin ===');
r = await call(usersIdx, { method: 'POST', ...sess(superTok), body: {
  role: 'staff', firstName: 'Tech', lastName: 'One', email: 'tech1@gleamaire.com',
  phone: '09170000010', password: 'Tech1!pass',
}});
check('superadmin can create staff', r.statusCode === 200 && r.body?.user?.role === 'staff', r.body);
const staffId = r.body?.user?.id;

r = await call(usersIdx, { method: 'POST', ...sess(superTok), body: {
  role: 'admin', firstName: 'Ad', lastName: 'Min', email: 'admin@gleamaire.com',
  phone: '09170000011', password: 'Adm1n!pass',
}});
check('superadmin can create admin', r.body?.user?.role === 'admin', r.body);

r = await call(usersIdx, { method: 'POST', ...sess(customerTok), body: {
  role: 'staff', firstName: 'X', lastName: 'Y', email: 'x@y.com', phone: '09170000012', password: 'Xx1!xxxx',
}});
check('customer CANNOT create staff (403)', r.statusCode === 403, r.body);

r = await call(usersIdx, { method: 'GET', ...sess(customerTok) });
check('customer CANNOT list users (403)', r.statusCode === 403, r.body);

r = await call(login, { method: 'POST', body: { email: 'tech1@gleamaire.com', password: 'Tech1!pass' }});
const staffTok = sessionFrom(r);
r = await call(usersIdx, { method: 'POST', ...sess(staffTok), body: {
  role: 'superadmin', firstName: 'Esc', lastName: 'Alate', email: 'esc@y.com', phone: '09170000013', password: 'Xx1!xxxx',
}});
check('staff CANNOT create superadmin (403)', r.statusCode === 403, r.body);

r = await call(login, { method: 'POST', body: { email: 'admin@gleamaire.com', password: 'Adm1n!pass' }});
const adminTok = sessionFrom(r);
r = await call(usersIdx, { method: 'POST', ...sess(adminTok), body: {
  role: 'superadmin', firstName: 'Esc', lastName: 'Alate', email: 'esc2@y.com', phone: '09170000014', password: 'Xx1!xxxx',
}});
check('admin CANNOT create users (403)', r.statusCode === 403, r.body);
r = await call(usersIdx, { method: 'GET', ...sess(adminTok) });
check('admin CAN list users', r.statusCode === 200, r.body);

summary();
