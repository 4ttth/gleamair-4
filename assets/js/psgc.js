/* ─── Cascading Philippine address selector ──────────────────────────────────
   Province -> City/Municipality -> Barangay, from the bundled PSGC dataset.

   Only the 6.5 KB province index is fetched up front. Picking a province pulls
   that one province's file (30-80 KB) and everything after that is in memory,
   so a customer never downloads the full 42,000-barangay dataset.
   ────────────────────────────────────────────────────────────────────────── */

const BASE = '/assets/data/psgc';
const cache = new Map();

async function loadJson(url) {
  if (cache.has(url)) return cache.get(url);
  const promise = fetch(url).then((r) => {
    if (!r.ok) throw new Error(`Could not load address data (${r.status})`);
    return r.json();
  });
  cache.set(url, promise);
  try {
    return await promise;
  } catch (err) {
    cache.delete(url); // let a later attempt retry rather than caching failure
    throw err;
  }
}

const reset = (select, placeholder) => {
  select.innerHTML = `<option value="">${placeholder}</option>`;
  select.disabled = true;
};

/**
 * Wires three <select> elements together.
 * Returns { value(), setEnabled(), ready } - value() yields the codes AND the
 * names, because the booking snapshot stores both.
 */
export function attachAddressSelects({ province, city, barangay, onError }) {
  let provinces = [];
  let cities = [];

  reset(city, 'Select a province first');
  reset(barangay, 'Select a city or municipality first');
  province.innerHTML = '<option value="">Loading provinces…</option>';
  province.disabled = true;

  const fail = (err) => {
    province.innerHTML = '<option value="">Could not load address data</option>';
    onError?.(err.message || 'Could not load address data.');
  };

  const ready = loadJson(`${BASE}/provinces.json`)
    .then((data) => {
      provinces = data;

      // Group by region so a long flat list of 87 entries stays navigable.
      const byRegion = new Map();
      for (const p of provinces) {
        if (!byRegion.has(p.region)) byRegion.set(p.region, []);
        byRegion.get(p.region).push(p);
      }

      const groups = [...byRegion.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([region, list]) => {
          const options = list
            .map((p) => `<option value="${p.code}">${p.name}</option>`)
            .join('');
          return `<optgroup label="${region}">${options}</optgroup>`;
        })
        .join('');

      province.innerHTML = `<option value="">Select province</option>${groups}`;
      province.disabled = false;
    })
    .catch(fail);

  province.addEventListener('change', async () => {
    reset(city, 'Loading…');
    reset(barangay, 'Select a city or municipality first');
    if (!province.value) { reset(city, 'Select a province first'); return; }

    try {
      const data = await loadJson(`${BASE}/p/${province.value}.json`);
      cities = data.cities || [];
      city.innerHTML =
        '<option value="">Select city / municipality</option>' +
        cities.map((c) => `<option value="${c.code}">${c.name}</option>`).join('');
      city.disabled = false;
    } catch (err) {
      reset(city, 'Could not load cities');
      onError?.(err.message);
    }
  });

  city.addEventListener('change', () => {
    reset(barangay, 'Select barangay');
    if (!city.value) { reset(barangay, 'Select a city or municipality first'); return; }

    const found = cities.find((c) => c.code === city.value);
    const list = found?.barangays || [];
    barangay.innerHTML =
      '<option value="">Select barangay</option>' +
      list.map((b) => `<option value="${b.code}">${b.name}</option>`).join('');
    barangay.disabled = false;
  });

  const labelOf = (select) => select.options[select.selectedIndex]?.text || '';

  return {
    ready,
    value() {
      return {
        provinceCode: province.value,
        provinceName: labelOf(province),
        cityCode: city.value,
        cityName: labelOf(city),
        barangayCode: barangay.value,
        barangayName: labelOf(barangay),
      };
    },
    complete() {
      return Boolean(province.value && city.value && barangay.value);
    },
  };
}
