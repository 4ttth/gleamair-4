/* ─── Map helpers (Leaflet + OpenStreetMap) ──────────────────────────────────
   Leaflet is vendored under /assets/vendor/leaflet rather than pulled from a
   CDN: no third-party dependency to go down, and it matches how the rest of
   this site ships its assets. OpenStreetMap needs no API key or billing
   account, unlike Google Maps.

   Every entry point degrades gracefully. A booking must still be completable
   if the map fails for any reason, since the pin is a convenience.
   ────────────────────────────────────────────────────────────────────────── */

import { esc } from './portal.js';

export const OLONGAPO = [14.8292, 120.2828]; // Gleamair's base — last-resort centre
export const PH_CENTER = [12.8797, 121.7740];

const TILES = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export const leafletReady = () => typeof window.L !== 'undefined';

/**
 * Creates a map, or returns null and renders an inline explanation into the
 * container if Leaflet did not load. Callers must handle null.
 */
export function createMap(container, { center = OLONGAPO, zoom = 13 } = {}) {
  const node = typeof container === 'string' ? document.getElementById(container) : container;
  if (!node) return null;

  if (!leafletReady()) {
    node.innerHTML =
      '<div class="empty" style="padding:32px 18px">' +
      '<h3>Map unavailable</h3>' +
      '<p>The map could not be loaded. Everything else on this page still works.</p></div>';
    return null;
  }

  // Self-hosted marker images; Leaflet's own path sniffing assumes a CDN layout.
  window.L.Icon.Default.imagePath = '/assets/vendor/leaflet/images/';

  const map = window.L.map(node).setView(center, zoom);
  window.L.tileLayer(TILES, { maxZoom: 19, attribution: ATTRIBUTION }).addTo(map);

  // Leaflet mis-measures when its container is sized after construction.
  setTimeout(() => map.invalidateSize(), 180);
  return map;
}

/** Small coloured dot used to plot jobs by status on the dispatch map. */
export function statusMarker(lat, lng, colour) {
  return window.L.marker([lat, lng], {
    icon: window.L.divIcon({
      className: '',
      html:
        `<span style="display:block;width:16px;height:16px;border-radius:50%;` +
        `background:${colour};border:2.5px solid #fff;box-shadow:0 0 0 1.5px rgba(13,47,94,.35)"></span>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    }),
  });
}

export const STATUS_COLOUR = {
  paid: '#1a4a8a',
  assigned: '#c9a227',
  in_progress: '#0f8a5f',
  completed: '#7c8aa5',
};

/* ─── Working out where the customer is ──────────────────────────────────────
   Three sources, best first, none of them required:

     gps      the browser's own position — metres
     address  the barangay or city on their account, geocoded server-side
     office   Gleamair's base, which is only ever right by coincidence

   The point of the cascade is that the map opens somewhere the customer
   recognises, so the pin needs nudging rather than dragging across a province.
   ────────────────────────────────────────────────────────────────────────── */

export const FALLBACK_LOCATION = {
  lat: OLONGAPO[0], lng: OLONGAPO[1], source: 'office', zoom: 13, label: 'Olongapo City',
};

/**
 * The browser's position. Resolves to null instead of rejecting - a refused
 * or unavailable location is an ordinary outcome here, not an error.
 *
 * `silent` skips the request entirely unless permission was granted earlier,
 * so page load does not throw a permission prompt at someone who never asked
 * for one; the button on the page passes silent: false and does prompt.
 */
export async function browserLocation({ timeout = 10000, silent = false } = {}) {
  if (!navigator.geolocation) return null;

  if (silent) {
    try {
      const status = await navigator.permissions?.query({ name: 'geolocation' });
      if (status && status.state !== 'granted') return null;
    } catch {
      // Safari and older browsers have no Permissions API for geolocation.
      // Without a way to check, staying silent is the polite reading.
      return null;
    }
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({
        lat: coords.latitude,
        lng: coords.longitude,
        accuracy: coords.accuracy,
        source: 'gps',
        zoom: 17,
      }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout, maximumAge: 60_000 }
    );
  });
}

/**
 * The coordinates of the address on the customer's account, from /api/geocode.
 * Resolves to null if they have no address, it could not be placed, or the
 * request failed.
 */
export async function addressLocation(api) {
  try {
    const { location } = await api.get('/api/geocode');
    if (!location) return null;
    return { ...location, source: 'address', zoom: location.zoom || 14 };
  } catch {
    return null;
  }
}

/**
 * Whether a location is precise enough to stand as the customer's pin without
 * them confirming it. A province centroid is not: it can be 50 km from the
 * house, and a technician navigating to it would be sent to the wrong town.
 * It is still worth centring the map on, which is a different question.
 */
export const isPinnable = (found) =>
  !!found && (found.source === 'gps' || (found.source === 'address' && found.precision !== 'province'));

/**
 * Best available starting point, applied as each source answers rather than
 * when the slowest one does: the saved address moves the map off the office
 * within a few hundred milliseconds, and GPS sharpens it if the browser
 * offers one.
 *
 * `onLocation` is called on each improvement and never with something worse
 * than what it was already given, so a slow address lookup landing after GPS
 * cannot demote a good pin. Resolves to the best location found, which is
 * FALLBACK_LOCATION if nothing answered.
 */
export async function resolveLocation(api, { onLocation } = {}) {
  const RANK = { office: 0, address: 1, gps: 2 };
  let best = FALLBACK_LOCATION;

  const offer = (found) => {
    if (!found || RANK[found.source] <= RANK[best.source]) return;
    best = found;
    onLocation?.(found);
  };

  await Promise.all([
    addressLocation(api).then(offer),
    // Silent: a permission prompt the moment the page opens is a good way to
    // be refused for good. If the customer has already granted it, use it.
    browserLocation({ silent: true }).then(offer),
  ]);

  // Nothing usable: an address that resolved no finer than its province, one
  // that could not be placed at all, or no address on file. The map would
  // otherwise open somewhere the customer has to drag the marker a long way
  // from, so this is the one case where the permission prompt is worth
  // spending.
  if (!isPinnable(best)) {
    offer(await browserLocation({ silent: false }));
  }
  return best;
}

/* ─── Searching the map ──────────────────────────────────────────────────────
   Dragging a marker is fine for a nudge and miserable for a journey. A search
   box moves the map to a landmark, a subdivision or a street in one step —
   useful to a customer pinning a house the pin cascade could not place, and to
   staff finding a job's neighbourhood.

   Searching happens on submit, never per keystroke: the geocoder's usage
   policy forbids autocomplete-style traffic, and the server caches and quotas
   what does get through.
   ────────────────────────────────────────────────────────────────────────── */

/** Place search against /api/geocode. Throws whatever the API threw, so a
    quota message reaches the person who caused it. */
export async function searchPlaces(api, query) {
  const { results } = await api.get(`/api/geocode?q=${encodeURIComponent(query)}`);
  return results || [];
}

/**
 * Wires a search box and a result list to a map.
 *
 *   attachMapSearch(map, { api, input, button, results, onPick })
 *
 * `onPick` receives { lat, lng, label } when a result is chosen; the map has
 * already been moved by then. Returns a function that clears the result list.
 */
export function attachMapSearch(map, { api, input, button, results, onPick, zoom = 17 } = {}) {
  // No map to move: a search box that cannot do anything is worse than none,
  // so it is taken out of the tab order rather than left to disappoint.
  if (!map) {
    if (input) { input.disabled = true; input.placeholder = 'Search needs the map'; }
    if (button) button.disabled = true;
    return () => {};
  }
  if (!input || !results) return () => {};

  const clear = () => { results.innerHTML = ''; results.hidden = true; };
  const note = (text) => {
    results.innerHTML = `<p class="map-results-note">${esc(text)}</p>`;
    results.hidden = false;
  };

  let inFlight = 0;

  async function run() {
    const query = input.value.trim();
    if (query.length < 3) return note('Type at least three characters to search.');

    const ticket = ++inFlight;
    note('Searching…');
    let found;
    try {
      found = await searchPlaces(api, query);
    } catch (err) {
      if (ticket === inFlight) note(err.message || 'Search is unavailable right now.');
      return;
    }
    // A slower earlier search must not overwrite a later one's results.
    if (ticket !== inFlight) return;
    if (!found.length) return note(`Nothing found for "${query}". Try a nearby landmark or barangay.`);

    results.innerHTML = found
      .map((r, i) => `<button type="button" data-i="${i}">${esc(r.label)}</button>`)
      .join('');
    results.hidden = false;

    results.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', () => {
        const place = found[Number(btn.dataset.i)];
        map.setView([place.lat, place.lng], zoom);
        clear();
        onPick?.(place);
      });
    });
  }

  button?.addEventListener('click', run);
  input.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault(); // the box may live inside a form; searching is not submitting
    run();
  });
  input.addEventListener('search', () => { if (!input.value.trim()) clear(); });

  return clear;
}
