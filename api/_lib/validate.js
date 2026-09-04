/* Input validation. Every route validates on the server regardless of what the
   browser already checked - client-side rules are a convenience, not a
   control. */

import { badRequest } from './http.js';

export const ROLES = ['customer', 'staff', 'admin', 'superadmin'];
export const ROLE_RANK = { customer: 0, staff: 1, admin: 2, superadmin: 3 };

export const UNIT_TYPES = [
  'Split Type', 'Window Type', 'Cassette Type',
  'Floor Standing', 'Ducted / Centralized', 'Portable',
];
export const HORSEPOWER = ['0.5', '0.75', '1.0', '1.5', '2.0', '2.5', '3.0', '4.0', '5.0+'];

export const BOOKING_STATUSES = [
  'awaiting_payment', 'paid', 'assigned', 'in_progress', 'completed', 'cancelled',
];

// C0 and DEL control characters have no place in a name, address or email.
const CONTROL_CHARS = new RegExp('[\\u0000-\\u001F\\u007F]');

function str(value, field, { min = 1, max = 200, required = true } = {}) {
  if (value == null || value === '') {
    if (required) throw badRequest(`${field} is required.`, { field });
    return '';
  }
  if (typeof value !== 'string') throw badRequest(`${field} must be text.`, { field });
  const trimmed = value.trim();
  if (required && trimmed.length < min) {
    throw badRequest(`${field} must be at least ${min} characters.`, { field });
  }
  if (trimmed.length > max) {
    throw badRequest(`${field} must be ${max} characters or fewer.`, { field });
  }
  if (CONTROL_CHARS.test(trimmed)) throw badRequest(`${field} contains invalid characters.`, { field });
  return trimmed;
}

export { str as string };

export function email(value) {
  const raw = str(value, 'Email address', { max: 254 }).toLowerCase();
  // Deliberately permissive: the definitive test is whether mail arrives.
  if (!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(raw)) {
    throw badRequest('That does not look like a valid email address.', { field: 'email' });
  }
  return raw;
}

/**
 * Normalises Philippine mobile numbers to +639XXXXXXXXX.
 * Accepts 09171234567, 9171234567, 639171234567, +63 917 123 4567, and
 * numbers written with spaces, dashes or parentheses.
 */
export function phone(value) {
  const raw = str(value, 'Phone number', { max: 30 });
  let digits = raw.replace(/[\s\-().]/g, '');

  if (digits.startsWith('+63'))     digits = digits.slice(3);
  else if (digits.startsWith('63') && digits.length === 12) digits = digits.slice(2);
  else if (digits.startsWith('0'))  digits = digits.slice(1);

  if (!/^9\d{9}$/.test(digits)) {
    throw badRequest(
      'Enter a valid Philippine mobile number, e.g. 0917 123 4567.',
      { field: 'phone' }
    );
  }
  return `+63${digits}`;
}

/** 8+ characters, at least one number and at least one special character. */
export function password(value) {
  if (typeof value !== 'string' || !value) {
    throw badRequest('Password is required.', { field: 'password' });
  }
  const failures = [];
  if (value.length < 8)            failures.push('be at least 8 characters long');
  if (!/\d/.test(value))           failures.push('contain at least one number');
  if (!/[^A-Za-z0-9]/.test(value)) failures.push('contain at least one special character');
  if (failures.length) {
    throw badRequest(`Password must ${failures.join(', ')}.`, { field: 'password' });
  }
  // scrypt cost scales with input length; cap it so a huge password cannot
  // be used to tie up a function invocation.
  if (value.length > 200) {
    throw badRequest('Password must be 200 characters or fewer.', { field: 'password' });
  }
  return value;
}

/**
 * A money amount in centavos. Prices are set by hand in an admin form now, so
 * this is the guard between a typo and a real charge: whole centavos only,
 * inside the range the payment provider will accept.
 */
export function centavos(value, field, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (value === null) return null;
  if (value === '' || value === undefined) {
    throw badRequest(`${field} is required.`, { field });
  }
  // A string of digits is what an <input> gives us; anything else is a mistake.
  const n = typeof value === 'string' ? Number(value.trim()) : value;
  if (typeof n !== 'number' || !Number.isFinite(n)) {
    throw badRequest(`${field} must be a number.`, { field });
  }
  if (!Number.isInteger(n)) {
    throw badRequest(`${field} must be a whole number of centavos.`, { field });
  }
  const peso = (c) => (c / 100).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' });
  if (n < min) throw badRequest(`${field} must be at least ${peso(min)}.`, { field });
  if (n > max) throw badRequest(`${field} must be ${peso(max)} or less.`, { field });
  return n;
}

export function role(value, { allowed = ROLES } = {}) {
  const raw = str(value, 'Role', { max: 20 }).toLowerCase();
  if (!allowed.includes(raw)) {
    throw badRequest(`Role must be one of: ${allowed.join(', ')}.`, { field: 'role' });
  }
  return raw;
}

/**
 * PSGC-shaped address. Codes are checked for shape only, not looked up against
 * the bundled dataset: a customer's own address grants no privilege, and a
 * filesystem lookup inside a serverless function is a needless failure mode.
 */
export function address(value) {
  if (!value || typeof value !== 'object') throw badRequest('Address is required.', { field: 'address' });

  const code = (v, field, len) => {
    const raw = str(v, field, { max: 12 });
    if (!new RegExp(`^\\d{${len}}$`).test(raw)) {
      throw badRequest(`${field} is invalid. Please re-select it from the list.`, { field });
    }
    return raw;
  };

  return {
    line1:        str(value.line1, 'Address Line 1', { max: 160 }),
    line2:        str(value.line2, 'Address Line 2', { max: 160, required: false }),
    provinceCode: code(value.provinceCode, 'Province', 4),
    provinceName: str(value.provinceName, 'Province', { max: 120 }),
    cityCode:     code(value.cityCode, 'City / Municipality', 6),
    cityName:     str(value.cityName, 'City / Municipality', { max: 120 }),
    barangayCode: code(value.barangayCode, 'Barangay', 9),
    barangayName: str(value.barangayName, 'Barangay', { max: 120 }),
  };
}

export function units(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw badRequest('Add at least one air conditioning unit.', { field: 'units' });
  }
  if (value.length > 20) {
    throw badRequest('You can list up to 20 unit entries per booking.', { field: 'units' });
  }
  return value.map((u, i) => {
    if (!u || typeof u !== 'object') throw badRequest(`Unit ${i + 1} is invalid.`, { field: 'units' });

    const type = str(u.type, `Unit ${i + 1} type`, { max: 40 });
    if (!UNIT_TYPES.includes(type)) {
      throw badRequest(`Unit ${i + 1}: choose a unit type from the list.`, { field: 'units' });
    }
    const hp = str(u.horsepower, `Unit ${i + 1} horsepower`, { max: 8 });
    if (!HORSEPOWER.includes(hp)) {
      throw badRequest(`Unit ${i + 1}: choose a horsepower from the list.`, { field: 'units' });
    }
    const count = Number(u.count);
    if (!Number.isInteger(count) || count < 1 || count > 50) {
      throw badRequest(`Unit ${i + 1}: quantity must be a whole number between 1 and 50.`, { field: 'units' });
    }
    return { type, horsepower: hp, count };
  });
}

/* Where a booking's pin came from. 'address' is the one the customer did not
   place by hand - it is the barangay their account is registered in, dropped
   for them when the map opened - so it is worth telling apart from a pin they
   dragged and from a GPS fix. */
const PIN_SOURCES = ['gps', 'address', 'pin'];

/** Optional map pin, dropped for or by the customer during booking. */
export function location(value) {
  if (value == null) return null;
  if (typeof value !== 'object') throw badRequest('Location is invalid.', { field: 'location' });

  const lat = Number(value.lat);
  const lng = Number(value.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw badRequest('Location is invalid.', { field: 'location' });
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw badRequest('Location is out of range.', { field: 'location' });
  }
  const source = PIN_SOURCES.includes(value.source) ? value.source : 'pin';
  return { lat: Math.round(lat * 1e6) / 1e6, lng: Math.round(lng * 1e6) / 1e6, source };
}
