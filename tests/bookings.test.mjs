import crypto from 'node:crypto';
import { call, check, sessionFrom, summary } from './harness.js';

process.env.PAYMONGO_SECRET_KEY = 'sk_test_fake';
process.env.PAYMONGO_WEBHOOK_SECRET = 'whsk_testsecret';
process.env.PUBLIC_BASE_URL = 'https://www.gleamaire.com';
process.env.BOOTSTRAP_TOKEN = 'boot-token-abc';

let checkoutBody = null;
globalThis.fetch = async (url, init) => {
  if (String(url).includes('/checkout_sessions')) {
    if (init.method === 'GET' || !init.method) {
      return new Response(JSON.stringify({ data: { id: 'cs_fake_1', attributes: {
        payments: [{ attributes: { status: 'paid', amount: 25000, source: { type: 'gcash' } } }],
        payment_intent: { id: 'pi_fake_1' },
      }}}), { status: 200 });
    }
    checkoutBody = JSON.parse(init.body || '{}');
    return new Response(JSON.stringify({
      data: { id: 'cs_fake_1', attributes: { checkout_url: 'https://checkout.paymongo.com/cs_fake_1' } },
    }), { status: 200 });
  }
  return new Response('{}', { status: 200 });
};

const register   = (await import('../api/auth/register.js')).default;
const login      = (await import('../api/auth/login.js')).default;
const me         = (await import('../api/auth/me.js')).default;
const bookings   = (await import('../api/bookings/index.js')).default;
const bookingOne = (await import('../api/bookings/[id].js')).default;
const usersIdx   = (await import('../api/users/index.js')).default;
const userOne    = (await import('../api/users/[id].js')).default;
const webhook    = (await import('../api/webhooks/paymongo.js')).default;
const bootstrap  = (await import('../api/bootstrap.js')).default;

const ADDR = { line1: '12 Domingo St', line2: '', provinceCode: '0308', provinceName: 'Bataan',
  cityCode: '030801', cityName: 'Abucay', barangayCode: '030801001', barangayName: 'Bangkal' };
const sess = (t) => ({ cookies: { gleam_session: t } });
const UNITS = [{ type: 'Split Type', count: 2, horsepower: '1.5' }];

// --- fixtures -------------------------------------------------------------
let r = await call(register, { method: 'POST', body: { firstName: 'Juan', lastName: 'Cruz',
  email: 'juan@example.com', phone: '09171234567', address: ADDR, password: 'Aircon1!' }});
const custTok = sessionFrom(r);
r = await call(register, { method: 'POST', body: { firstName: 'Maria', lastName: 'Santos',
  email: 'maria@example.com', phone: '09171234568', address: ADDR, password: 'Aircon1!' }});
const cust2Tok = sessionFrom(r);

await call(bootstrap, { method: 'POST', body: { token: 'boot-token-abc', firstName: 'Super',
  lastName: 'Admin', email: 'sa@gleamaire.com', phone: '09170000001', password: 'Sup3r!pass' }});
r = await call(login, { method: 'POST', body: { email: 'sa@gleamaire.com', password: 'Sup3r!pass' }});
const superTok = sessionFrom(r);

r = await call(usersIdx, { method: 'POST', ...sess(superTok), body: { role: 'staff', firstName: 'Tech',
  lastName: 'One', email: 'tech1@gleamaire.com', phone: '09170000010', password: 'Tech1!pass' }});
const staffId = r.body.user.id;
r = await call(login, { method: 'POST', body: { email: 'tech1@gleamaire.com', password: 'Tech1!pass' }});
const staffTok = sessionFrom(r);

r = await call(usersIdx, { method: 'POST', ...sess(superTok), body: { role: 'admin', firstName: 'Ad',
  lastName: 'Min', email: 'admin@gleamaire.com', phone: '09170000011', password: 'Adm1n!pass' }});
const adminId = r.body.user.id;
r = await call(login, { method: 'POST', body: { email: 'admin@gleamaire.com', password: 'Adm1n!pass' }});
const adminTok = sessionFrom(r);

console.log('\n=== 5. PMS booking + PayMongo checkout ===');
r = await call(bookings, { method: 'POST', ...sess(custTok), body: {
  service: 'PMS', units: UNITS, location: { lat: 14.8386, lng: 120.2842, source: 'pin' }, notes: 'Second floor' }});
check('booking created', r.statusCode === 200, r.body);
check('reference is PMS-000001', r.body?.booking?.reference === 'PMS-000001', r.body?.booking?.reference);
check('status awaiting_payment', r.body?.booking?.status === 'awaiting_payment', r.body?.booking?.status);
check('checkout URL returned', r.body?.checkoutUrl === 'https://checkout.paymongo.com/cs_fake_1', r.body);
check('total is PHP 500 (50000c)', r.body?.booking?.amounts?.total === 50000, r.body?.booking?.amounts);
check('downpayment is PHP 250 (25000c)', r.body?.booking?.amounts?.downpayment === 25000, r.body?.booking?.amounts);
const ref = r.body.booking.reference;
const bookingId = r.body.booking.id;

const li = checkoutBody?.data?.attributes?.line_items?.[0];
check('PayMongo charged the DOWN PAYMENT only', li?.amount === 25000, li);
check('PayMongo currency PHP', li?.currency === 'PHP', li);
check('reference_number sent to PayMongo', checkoutBody?.data?.attributes?.reference_number === ref, checkoutBody?.data?.attributes?.reference_number);

r = await call(bookings, { method: 'POST', ...sess(staffTok), body: { service: 'PMS', units: UNITS }});
check('staff CANNOT create a booking (403)', r.statusCode === 403, r.body);
r = await call(bookings, { method: 'POST', ...sess(custTok), body: { service: 'PMS', units: [{ type: 'Nonsense', count: 1, horsepower: '1.5' }] }});
check('invalid unit type rejected', r.statusCode === 400, r.body);
r = await call(bookings, { method: 'POST', ...sess(custTok), body: { service: 'PMS', units: [{ type: 'Split Type', count: 0, horsepower: '1.5' }] }});
check('zero quantity rejected', r.statusCode === 400, r.body);

console.log('\n=== 6. Unpaid bookings are invisible to staff ===');
r = await call(bookings, { method: 'GET', ...sess(staffTok) });
check('staff list excludes unpaid booking', (r.body?.bookings ?? []).length === 0, r.body?.bookings);
r = await call(bookingOne, { method: 'GET', ...sess(staffTok), query: { id: ref } });
check('staff cannot fetch unpaid booking (404)', r.statusCode === 404, r.body);
r = await call(bookingOne, { method: 'GET', ...sess(cust2Tok), query: { id: ref } });
check('other customer cannot see the booking (404)', r.statusCode === 404, r.body);

// Regression: the status filter must be intersected with what the role may
// see. Assigning it directly let a staff caller pass ?status=awaiting_payment
// and replace the role guard entirely, exposing unpaid leads - name, units and
// exact map pin - that the single-booking endpoint already refuses them.
r = await call(bookings, { method: 'GET', ...sess(staffTok), url: '/api/bookings?status=awaiting_payment' });
check('staff cannot filter to unpaid bookings', (r.body?.bookings ?? []).length === 0, r.body?.bookings);
r = await call(bookings, { method: 'GET', ...sess(staffTok), url: '/api/bookings?status=cancelled' });
check('staff cannot filter to cancelled bookings', (r.body?.bookings ?? []).length === 0, r.body?.bookings);
r = await call(bookings, { method: 'GET', ...sess(adminTok), url: '/api/bookings?status=awaiting_payment' });
check('admin CAN still filter to unpaid bookings', (r.body?.bookings ?? []).length === 1, r.body?.bookings);
r = await call(bookings, { method: 'GET', ...sess(custTok), url: '/api/bookings?status=awaiting_payment' });
check('customer filter stays scoped to own bookings',
  (r.body?.bookings ?? []).every((b) => b.reference === ref), r.body?.bookings);

console.log('\n=== 7. PayMongo webhook ===');
const evt = (type, sessionId) => Buffer.from(JSON.stringify({ data: { attributes: {
  type, data: { id: sessionId, attributes: { reference_number: ref,
    payments: [{ attributes: { status: 'paid', amount: 25000, source: { type: 'gcash' } } }],
    payment_intent: { id: 'pi_fake_1' } } } } } }));
const signed = (raw) => { const t = Math.floor(Date.now()/1000);
  return { 'paymongo-signature': `t=${t},li=${crypto.createHmac('sha256','whsk_testsecret').update(t+'.'+raw.toString('utf8')).digest('hex')}` }; };

let raw = evt('checkout_session.payment.paid', 'cs_fake_1');

const forged = await call(webhook, { method: 'POST', rawBody: raw, headers: { 'paymongo-signature': 't=' + Math.floor(Date.now()/1000) + ',li=deadbeef' } });
check('forged signature -> 401', forged.statusCode === 401, forged.body);
check('no signature header -> 401', (await call(webhook, { method: 'POST', rawBody: raw, headers: {} })).statusCode === 401);

r = await call(bookingOne, { method: 'GET', ...sess(custTok), query: { id: ref } });
check('booking still unpaid after forged webhook', r.body?.booking?.payment?.status !== 'paid', r.body?.booking?.payment);

r = await call(webhook, { method: 'POST', rawBody: raw, headers: signed(raw) });
check('signed webhook accepted (200)', r.statusCode === 200, r.body);

r = await call(bookingOne, { method: 'GET', ...sess(custTok), query: { id: ref } });
check('booking marked PAID by webhook', r.body?.booking?.payment?.status === 'paid', r.body?.booking?.payment);
check('booking status promoted to paid', r.body?.booking?.status === 'paid', r.body?.booking?.status);
check('payment method recorded', r.body?.booking?.payment?.method === 'gcash', r.body?.booking?.payment);

r = await call(webhook, { method: 'POST', rawBody: raw, headers: signed(raw) });
check('replayed paid webhook is idempotent', r.statusCode === 200, r.body);
r = await call(bookingOne, { method: 'GET', ...sess(custTok), query: { id: ref } });
check('still exactly one paid state', r.body?.booking?.payment?.status === 'paid');

const tampered = Buffer.from(raw.toString('utf8').replace('25000', '1'));
check('tampered body fails verification', (await call(webhook, { method: 'POST', rawBody: tampered, headers: signed(raw) })).statusCode === 401);

console.log('\n=== 8. Staff field scoping (name + units + map only) ===');
r = await call(bookings, { method: 'GET', ...sess(staffTok) });
const sv = r.body?.bookings?.[0];
check('staff now sees the paid job', !!sv, r.body);
check('staff sees customer name', sv?.customerName === 'Juan Cruz', sv);
check('staff sees unit details', sv?.units?.[0]?.type === 'Split Type', sv?.units);
check('staff sees map pin', sv?.location?.lat === 14.8386, sv?.location);
check('staff does NOT see email', sv?.customerEmail === undefined, sv);
check('staff does NOT see phone', sv?.customerPhone === undefined, sv);
check('staff does NOT see street address', sv?.address === undefined, sv);
r = await call(bookings, { method: 'GET', ...sess(adminTok) });
const av = r.body?.bookings?.[0];
check('admin DOES see email', av?.customerEmail === 'juan@example.com', av);
check('admin DOES see address', av?.address?.line1 === '12 Domingo St', av?.address);

console.log('\n=== 9. Assignment + scheduling ===');
r = await call(bookingOne, { method: 'PATCH', ...sess(staffTok), query: { id: ref }, body: { assignedStaffId: staffId }});
check('staff cannot self-assign', r.statusCode === 403, r.body);
r = await call(bookingOne, { method: 'PATCH', ...sess(adminTok), query: { id: ref },
  body: { assignedStaffId: staffId, scheduledAt: '2026-10-01T09:00:00.000Z' }});
check('admin assigns technician', r.statusCode === 200, r.body);
check('status becomes assigned', r.body?.booking?.status === 'assigned', r.body?.booking?.status);
check('technician name recorded', r.body?.booking?.assignedStaffName === 'Tech One', r.body?.booking);
check('schedule recorded', !!r.body?.booking?.scheduledAt, r.body?.booking?.scheduledAt);

// Regression: the management form always submits the status it was opened
// with. Assigning a technician while that stale 'paid' rides along must not
// leave the job showing "Paid - Unassigned" with a technician on it.
r = await call(bookingOne, { method: 'PATCH', ...sess(adminTok), query: { id: ref },
  body: { assignedStaffId: staffId, status: 'paid' }});
check('stale status does not undo the assignment', r.body?.booking?.status === 'assigned', r.body?.booking);
check('technician still attached', r.body?.booking?.assignedStaffName === 'Tech One', r.body?.booking);

// Unassigning should walk it back the other way.
r = await call(bookingOne, { method: 'PATCH', ...sess(adminTok), query: { id: ref },
  body: { assignedStaffId: null, status: 'assigned' }});
check('unassigning reverts status to paid', r.body?.booking?.status === 'paid', r.body?.booking);
check('technician cleared', r.body?.booking?.assignedStaffId === null, r.body?.booking);

// An explicit non-assignment status from an admin still wins.
r = await call(bookingOne, { method: 'PATCH', ...sess(adminTok), query: { id: ref },
  body: { assignedStaffId: staffId, status: 'completed' }});
check('explicit completed status is respected', r.body?.booking?.status === 'completed', r.body?.booking);

// Put it back to assigned for the staff checks below.
await call(bookingOne, { method: 'PATCH', ...sess(adminTok), query: { id: ref },
  body: { assignedStaffId: staffId, status: 'assigned' }});

r = await call(bookingOne, { method: 'PATCH', ...sess(staffTok), query: { id: ref }, body: { status: 'in_progress' }});
check('assigned staff can start the job', r.statusCode === 200 && r.body?.booking?.status === 'in_progress', r.body);
r = await call(bookingOne, { method: 'PATCH', ...sess(staffTok), query: { id: ref }, body: { status: 'cancelled' }});
check('staff cannot cancel', r.statusCode === 400, r.body);
r = await call(bookingOne, { method: 'PATCH', ...sess(custTok), query: { id: ref }, body: { status: 'cancelled' }});
check('customer cannot cancel a PAID booking', r.statusCode === 400, r.body);

console.log('\n=== 10. Superadmin guards ===');
const superId = (await call(me, { method: 'GET', ...sess(superTok) })).body.user.id;
r = await call(userOne, { method: 'DELETE', ...sess(superTok), query: { id: superId }});
check('superadmin cannot delete SELF', r.statusCode === 403, r.body);
r = await call(userOne, { method: 'PATCH', ...sess(superTok), query: { id: superId }, body: { role: 'customer' }});
check('superadmin cannot demote SELF', r.statusCode === 403, r.body);
r = await call(userOne, { method: 'PATCH', ...sess(superTok), query: { id: superId }, body: { active: false }});
check('superadmin cannot deactivate SELF', r.statusCode === 403, r.body);
r = await call(userOne, { method: 'DELETE', ...sess(adminTok), query: { id: staffId }});
check('admin cannot delete users', r.statusCode === 403, r.body);

r = await call(userOne, { method: 'PATCH', ...sess(superTok), query: { id: adminId }, body: { active: false }});
check('superadmin CAN deactivate another admin', r.statusCode === 200, r.body);
r = await call(me, { method: 'GET', ...sess(adminTok) });
check('deactivated admin session revoked immediately', r.statusCode === 401, r.body);

r = await call(userOne, { method: 'DELETE', ...sess(superTok), query: { id: staffId }});
check('superadmin CAN delete staff', r.statusCode === 200, r.body);
r = await call(bookings, { method: 'GET', ...sess(superTok) });
check('booking survives technician deletion', (r.body?.bookings ?? []).length === 1, r.body);
check('assignment detached, not cascaded', r.body?.bookings?.[0]?.assignedStaffId === null, r.body?.bookings?.[0]);

summary();
