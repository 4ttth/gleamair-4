/* ─── Gleamair Portal — shared client helpers ────────────────────────────────
   Loaded by every portal page. No build step and no framework, matching how
   the rest of the site is written.
   ────────────────────────────────────────────────────────────────────────── */

/* ── API client ───────────────────────────────────────────────────────────── */

async function request(method, path, body) {
  let response;
  try {
    response = await fetch(path, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'same-origin', // session cookie rides along
    });
  } catch {
    throw new ApiFailure('Network error. Check your connection and try again.');
  }

  let payload = {};
  try { payload = await response.json(); } catch { /* non-JSON error page */ }

  if (!response.ok) {
    throw new ApiFailure(
      payload.error || `Request failed (${response.status}).`,
      response.status,
      payload.details
    );
  }
  return payload;
}

export class ApiFailure extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details || null;
  }
}

export const api = {
  get:   (p)    => request('GET', p),
  post:  (p, b) => request('POST', p, b),
  patch: (p, b) => request('PATCH', p, b),
  del:   (p)    => request('DELETE', p),
};

/* ── Session ──────────────────────────────────────────────────────────────── */

/**
 * Resolves the signed-in user, or sends the browser to /login.
 * Every portal page awaits this before rendering anything.
 */
export async function requireAuth({ roles } = {}) {
  let data;
  try {
    data = await api.get('/api/auth/me');
  } catch (err) {
    if (err.status === 401) {
      const next = encodeURIComponent(location.pathname + location.search);
      location.replace(`/login?next=${next}`);
      return new Promise(() => {}); // never resolves; page is navigating away
    }
    throw err;
  }
  if (roles && !roles.includes(data.user.role)) {
    // Signed in, but on the wrong dashboard for their role.
    location.replace(data.landing);
    return new Promise(() => {});
  }
  return data.user;
}

/**
 * Validates a `?next=` redirect target from the URL.
 *
 * requireAuth only ever writes `pathname + search`, but a value read back out
 * of the address bar is attacker-controlled regardless of who wrote it.
 * Assigning it to location.href would otherwise execute a `javascript:` URL in
 * this origin, or hand the visitor to another site straight off the real login
 * page. Only a single-slash absolute path is accepted, which rejects
 * `javascript:`, `data:`, `//evil.example` and `/\evil.example`.
 */
export function safeNext(value) {
  return typeof value === 'string' && /^\/(?![/\\])/.test(value) ? value : null;
}

export async function signOut() {
  try { await api.post('/api/auth/logout', {}); } catch { /* clear regardless */ }
  location.href = '/login';
}

/* ── Formatting ───────────────────────────────────────────────────────────── */

/** Centavos to a peso string. All money crosses the wire as integer centavos. */
export const peso = (centavos) =>
  ((centavos ?? 0) / 100).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' });

export const initials = (first = '', last = '') =>
  `${(first[0] || '').toUpperCase()}${(last[0] || '').toUpperCase()}` || '?';

export function formatDate(value, { withTime = false } = {}) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric',
    ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  });
}

export const STATUS_LABELS = {
  awaiting_payment: 'Awaiting payment',
  paid: 'Paid — unassigned',
  assigned: 'Technician assigned',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const STATUS_TONE = {
  awaiting_payment: 'warn',
  paid: 'info',
  assigned: 'info',
  in_progress: 'gold',
  completed: 'ok',
  cancelled: 'grey',
};

export const ROLE_LABELS = {
  customer: 'Customer', staff: 'Staff',
  admin: 'Admin', superadmin: 'Superadmin',
};

/** Summarises a booking's units, e.g. "2x Split Type 1.5HP, 1x Window 1.0HP". */
export const unitSummary = (units = []) =>
  units.map((u) => `${u.count}x ${u.type} ${u.horsepower}HP`).join(', ') || '—';

/* ── Safe DOM ─────────────────────────────────────────────────────────────── */

/** Escapes text destined for innerHTML. Customer names and notes are attacker
    -controlled, so every interpolation into markup goes through this. */
export function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function el(id) { return document.getElementById(id); }

/* ── Feedback ─────────────────────────────────────────────────────────────── */

const ICONS = {
  error:   '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
  success: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
  info:    '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
  warn:    '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
};

export function showAlert(node, message, tone = 'error') {
  if (!node) return;
  node.className = `alert ${tone}`;
  node.innerHTML =
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ` +
    `stroke-linecap="round" stroke-linejoin="round">${ICONS[tone] || ICONS.info}</svg>` +
    `<div>${esc(message)}</div>`;
  node.hidden = false;
}

export function hideAlert(node) { if (node) node.hidden = true; }

/** Marks the field named in an API error's details, so the message lands next
    to the input that caused it rather than only at the top of the form. */
export function markFieldError(form, details, message) {
  if (!form || !details?.field) return false;
  const field = form.querySelector(`[data-field="${CSS.escape(details.field)}"]`);
  if (!field) return false;
  field.classList.add('invalid');
  const err = field.querySelector('.err');
  if (err) err.textContent = message;
  field.querySelector('input, select, textarea')?.focus();
  return true;
}

export function clearFieldErrors(form) {
  form?.querySelectorAll('.field.invalid').forEach((f) => f.classList.remove('invalid'));
}

/** Swaps a submit button into a loading state and returns a restore function. */
export function busy(button, label = 'Working…') {
  if (!button) return () => {};
  const original = button.innerHTML;
  button.disabled = true;
  button.innerHTML = `<span class="spinner"></span> ${esc(label)}`;
  return () => { button.disabled = false; button.innerHTML = original; };
}

/* ── Phone input ──────────────────────────────────────────────────────────── */

/**
 * Live-formats a PH mobile number as the customer types.
 *
 * The brief asks for '09...' to become '+639...'. Because the field already
 * shows a fixed '+63' prefix, typing a leading 0 (as most Filipinos do) would
 * otherwise produce '+630917...'. So a leading 0 is dropped as it is typed,
 * turning '09171234567' into '+63 917 123 4567'. Pasting '+639...' or
 * '639...' is handled too.
 */
export function attachPhoneInput(input) {
  if (!input) return;
  const format = (digits) => {
    const d = digits.slice(0, 10);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
    return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
  };

  const normalise = (raw) => {
    let d = raw.replace(/\D/g, '');
    if (d.startsWith('63')) d = d.slice(2);   // pasted +63 / 63
    if (d.startsWith('0'))  d = d.slice(1);   // the 09 -> +639 translation
    return d;
  };

  input.addEventListener('input', () => {
    const atEnd = input.selectionStart === input.value.length;
    input.value = format(normalise(input.value));
    if (atEnd) input.setSelectionRange(input.value.length, input.value.length);
  });

  input.addEventListener('blur', () => { input.value = format(normalise(input.value)); });
}

/** The E.164 value to submit for a formatted phone field. */
export const phoneValue = (input) => {
  const d = (input?.value || '').replace(/\D/g, '');
  return d ? `+63${d}` : '';
};

/* ── Password rules ───────────────────────────────────────────────────────── */

export const PASSWORD_RULES = [
  { id: 'len',     label: 'At least 8 characters',        test: (v) => v.length >= 8 },
  { id: 'num',     label: 'At least one number',          test: (v) => /\d/.test(v) },
  { id: 'special', label: 'At least one special character (! ? @ # $ …)', test: (v) => /[^A-Za-z0-9]/.test(v) },
];

export const passwordValid = (value) => PASSWORD_RULES.every((r) => r.test(value));

/** Wires a password box to a live checklist. Mirrors the server-side policy. */
export function attachPasswordRules(input, listNode) {
  if (!input || !listNode) return;
  listNode.innerHTML = PASSWORD_RULES
    .map((r) => `<li data-rule="${r.id}">${esc(r.label)}</li>`)
    .join('');

  const update = () => {
    const value = input.value;
    for (const rule of PASSWORD_RULES) {
      listNode.querySelector(`[data-rule="${rule.id}"]`)
        ?.classList.toggle('met', rule.test(value));
    }
  };
  input.addEventListener('input', update);
  update();
}

/** Adds a show/hide toggle to a password input wrapped in .pw-wrap. */
export function attachPasswordToggle(input) {
  const wrap = input?.closest('.pw-wrap');
  if (!wrap || wrap.querySelector('.pw-toggle')) return;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'pw-toggle';
  button.textContent = 'Show';
  button.setAttribute('aria-label', 'Show password');
  button.addEventListener('click', () => {
    const shown = input.type === 'text';
    input.type = shown ? 'password' : 'text';
    button.textContent = shown ? 'Show' : 'Hide';
    button.setAttribute('aria-label', shown ? 'Show password' : 'Hide password');
  });
  wrap.appendChild(button);
}
