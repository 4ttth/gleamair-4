/* ─── Portal app shell ───────────────────────────────────────────────────────
   Renders the sidebar + topbar shared by the customer and staff dashboards,
   and handles the mobile drawer and sign-out.
   ────────────────────────────────────────────────────────────────────────── */

import { esc, initials, ROLE_LABELS, signOut } from './portal.js';

/* Inline 24px stroke icons (feather-style) so the shell needs no icon font. */
export const ICON = {
  grid:     '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  map:      '<polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>',
  users:    '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  wrench:   '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  chart:    '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
  heart:    '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
  wallet:   '<path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"/><path d="M4 6v12c0 1.1.9 2 2 2h14v-4"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>',
  megaphone:'<polygon points="3 11 3 13 7 13 12 17 12 7 7 11 3 11"/><path d="M16 8a5 5 0 0 1 0 8"/><path d="M19 5a9 9 0 0 1 0 14"/>',
  clock:    '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  logout:   '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
  menu:     '<line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>',
  plus:     '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
};

const svg = (paths) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ` +
  `stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;

export const icon = svg;

/**
 * Renders the shell into <body> and returns the element pages should fill.
 *
 * items: [{ id, label, icon, href?, soon?, section? }]
 *   - section: renders a heading above the item
 *   - soon:    renders a dimmed, non-interactive "Soon" row
 *   - no href: emits a 'shell:navigate' event with the id (tabbed pages)
 */
export function mountShell({ user, items, active, title, subtitle, actions = '' }) {
  const nav = items.map((item) => {
    const heading = item.section
      ? `<div class="nav-section">${esc(item.section)}</div>` : '';

    if (item.soon) {
      return `${heading}<div class="nav-item is-soon" aria-disabled="true">
        ${svg(ICON[item.icon] || ICON.grid)}<span>${esc(item.label)}</span>
        <span class="soon-tag">Soon</span></div>`;
    }

    const tag = item.href ? 'a' : 'button';
    const attrs = item.href
      ? `href="${esc(item.href)}"`
      : `type="button" data-nav="${esc(item.id)}"`;

    return `${heading}<${tag} class="nav-item${item.id === active ? ' active' : ''}" ${attrs}>
      ${svg(ICON[item.icon] || ICON.grid)}<span>${esc(item.label)}</span></${tag}>`;
  }).join('');

  document.body.innerHTML = `
    <div class="shell">
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-brand">
          <a href="/index.html"><img src="/assets/images/other/horizontal_logo.png" alt="Gleamair Enterprises"></a>
        </div>
        <div class="sidebar-scroll">${nav}</div>
        <div class="sidebar-foot">
          <button class="nav-item" type="button" id="signOutBtn">
            ${svg(ICON.logout)}<span>Sign out</span>
          </button>
        </div>
      </aside>

      <div class="scrim" id="scrim"></div>

      <div class="main">
        <header class="topbar">
          <button class="sidebar-toggle" id="sidebarToggle" aria-label="Open menu">${svg(ICON.menu)}</button>
          <div class="topbar-titles">
            <div class="page-title" id="pageTitle">${esc(title || '')}</div>
            <div class="page-sub" id="pageSub">${esc(subtitle || '')}</div>
          </div>
          <div class="user-chip">
            ${actions}
            <div class="user-meta">
              <div class="nm">${esc(user.fullName)}</div>
              <div class="rl">${esc(ROLE_LABELS[user.role] || user.role)}</div>
            </div>
            <div class="avatar${user.role === 'customer' ? '' : ' gold'}">${esc(initials(user.firstName, user.lastName))}</div>
          </div>
        </header>
        <main class="content" id="content"></main>
      </div>
    </div>`;

  document.getElementById('signOutBtn').addEventListener('click', signOut);

  const sidebar = document.getElementById('sidebar');
  const scrim = document.getElementById('scrim');
  const close = () => { sidebar.classList.remove('open'); scrim.classList.remove('show'); };

  document.getElementById('sidebarToggle').addEventListener('click', () => {
    sidebar.classList.add('open');
    scrim.classList.add('show');
  });
  scrim.addEventListener('click', close);

  document.querySelectorAll('[data-nav]').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach((n) => n.classList.remove('active'));
      button.classList.add('active');
      close();
      window.dispatchEvent(new CustomEvent('shell:navigate', { detail: button.dataset.nav }));
    });
  });

  return document.getElementById('content');
}

export function setHeading(title, subtitle = '') {
  const t = document.getElementById('pageTitle');
  const s = document.getElementById('pageSub');
  if (t) t.textContent = title;
  if (s) s.textContent = subtitle;
}
