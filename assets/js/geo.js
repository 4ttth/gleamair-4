/* ─── Map helpers (Leaflet + OpenStreetMap) ──────────────────────────────────
   Leaflet is vendored under /assets/vendor/leaflet rather than pulled from a
   CDN: no third-party dependency to go down, and it matches how the rest of
   this site ships its assets. OpenStreetMap needs no API key or billing
   account, unlike Google Maps.

   Every entry point degrades gracefully. A booking must still be completable
   if the map fails for any reason, since the pin is a convenience.
   ────────────────────────────────────────────────────────────────────────── */

export const OLONGAPO = [14.8292, 120.2828]; // Gleamair's base
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
