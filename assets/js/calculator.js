/* ─── Gleamair Calculator ────────────────────────────────────────────────────
   Data is embedded directly so this works with file:// (no server needed).
   To update: edit conf/db/calculator.json then run: python sync-data.py
   ─────────────────────────────────────────────────────────────────────────── */

/* @@CALC_START@@ */

var CALC = {
  ventilator: {
    label: "Ventilator Sizing",
    description: "Estimate recommended ventilator model and quantity using building volume, ACH, and windspeed.",
    sectors: {
      residential: [
        {
          label: "Attic / Ceiling Space (6–8 ACH)",
          value: 7
        },
        {
          label: "Bedrooms / Living Areas (8–10 ACH)",
          value: 9
        },
        {
          label: "Kitchen / Laundry (10–15 ACH)",
          value: 12
        }
      ],
      commercial: [
        {
          label: "Factories & Warehouses (5–10 ACH)",
          value: 7.5
        },
        {
          label: "Gymnasiums (10–15 ACH)",
          value: 12.5
        },
        {
          label: "Assembly Halls (10–15 ACH)",
          value: 12.5
        },
        {
          label: "Toilets (10–15 ACH)",
          value: 12.5
        },
        {
          label: "Laundries (15–20 ACH)",
          value: 17.5
        },
        {
          label: "High Smell (Piggeries etc) (20–30 ACH)",
          value: 25
        }
      ]
    },
    windspeeds: [
      {
        label: "6 km/hr (Low)",
        value: "6"
      },
      {
        label: "12 km/hr (Avg)",
        value: "12"
      },
      {
        label: "16 km/hr (High)",
        value: "16"
      }
    ],
    sizes: [
      {
        label: "Whirlwind",
        lps: {
          6: 135,
          12: 240,
          16: 310
        },
        cfm: {
          6: 286,
          12: 508,
          16: 657
        }
      },
      {
        label: "GVS-15W (Solar)",
        lps: {
          6: 135,
          12: 240,
          16: 310
        },
        cfm: {
          6: 286,
          12: 508,
          16: 657
        }
      },
      {
        label: "Whirlwind Plus",
        lps: {
          6: 210,
          12: 420,
          16: 540
        },
        cfm: {
          6: 445,
          12: 890,
          16: 1144
        }
      },
      {
        label: "GVS-30W (Solar)",
        lps: {
          6: 220,
          12: 480,
          16: 600
        },
        cfm: {
          6: 466,
          12: 1017,
          16: 1271
        }
      },
      {
        label: "GVW300 — 300mm",
        lps: {
          6: 270,
          12: 480,
          16: 620
        },
        cfm: {
          6: 572,
          12: 1017,
          16: 1314
        },
        isResidential: true
      },
      {
        label: "GVW400 — 400mm",
        lps: {
          6: 387,
          12: 688,
          16: 887
        },
        cfm: {
          6: 820,
          12: 1458,
          16: 1880
        },
        isResidential: true
      },
      {
        label: "GVW300 Plus — 300mm+",
        lps: {
          6: 540,
          12: 960,
          16: 1240
        },
        cfm: {
          6: 1144,
          12: 2034,
          16: 2628
        }
      },
      {
        label: "GVW600 — 600mm",
        lps: {
          6: 620,
          12: 1104,
          16: 1420
        },
        cfm: {
          6: 1314,
          12: 2339,
          16: 3009
        },
        isResidential: false
      },
      {
        label: "GVW900 — 900mm",
        lps: {
          6: 1560,
          12: 2700,
          16: 3460
        },
        cfm: {
          6: 3305,
          12: 5721,
          16: 7331
        },
        isResidential: false
      }
    ]
  },
  solar: {
    label: "Solar Attic Fan Sizing",
    description: "Estimate the number of solar attic fan units required for your roof.",
    pitchOptions: [
      {
        label: "Low — up to 18° (4/12)",
        value: "low"
      },
      {
        label: "Medium — up to 33° (8/12)",
        value: "med"
      },
      {
        label: "High — up to 45° (12/12)",
        value: "high"
      }
    ],
    models: [
      {
        label: "GVS-15W (15 Watt)",
        value: "15"
      },
      {
        label: "GVS-30W (30 Watt)",
        value: "30"
      }
    ],
    tables: {
      15: [
        {
          maxArea: 100,
          low: 1,
          med: 1,
          high: 2
        },
        {
          maxArea: 150,
          low: 1,
          med: 1,
          high: 2
        },
        {
          maxArea: 200,
          low: 1,
          med: 2,
          high: 3
        },
        {
          maxArea: 250,
          low: 2,
          med: 2,
          high: 3
        },
        {
          maxArea: 300,
          low: 2,
          med: 3,
          high: 4
        }
      ],
      30: [
        {
          maxArea: 100,
          low: 1,
          med: 1,
          high: 1
        },
        {
          maxArea: 150,
          low: 1,
          med: 1,
          high: 1
        },
        {
          maxArea: 200,
          low: 1,
          med: 1,
          high: 2
        },
        {
          maxArea: 250,
          low: 1,
          med: 1,
          high: 2
        },
        {
          maxArea: 300,
          low: 1,
          med: 1,
          high: 3
        }
      ]
    }
  },
  aircon: {
    label: "Aircon HP",
    description: "Estimate the required aircon horsepower for your room.",
    hpTable: [
      {
        maxArea: 11,
        hp: 0.5
      },
      {
        maxArea: 14,
        hp: 0.75
      },
      {
        maxArea: 21,
        hp: 1.0
      },
      {
        maxArea: 25,
        hp: 1.5
      },
      {
        maxArea: 28,
        hp: 2.0
      },
      {
        maxArea: 48,
        hp: 2.5
      },
      {
        maxArea: 999,
        hp: 3.0
      }
    ],
    adjustments: [
      {
        id: "sun",
        label: "Direct afternoon sun exposure",
        hp: 0.5
      },
      {
        id: "occupancy",
        label: "More than 2 people regularly use the room",
        hp: 0.5
      },
      {
        id: "kitchen",
        label: "Installing in a kitchen",
        hp: 0.5
      }
    ],
    standardHP: [
      0.5,
      0.75,
      1.0,
      1.5,
      2.0,
      2.5,
      3.0
    ]
  }
};

/* @@CALC_END@@ */

/* ═══════════════════════════════════════════════════════════════════════════
   INIT
   ═══════════════════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', function() { buildCalcUI(); });

function buildCalcUI() {
  var tabBar = document.getElementById('calc-tab-bar');
  var panels = document.getElementById('calc-panels');
  if (!tabBar || !panels) return;

  var tabs = [
    { key: 'ventilator', label: CALC.ventilator.label },
    { key: 'solar',      label: CALC.solar.label      },
    { key: 'aircon',     label: CALC.aircon.label      }
  ];
  tabBar.innerHTML = tabs.map(function(t, i) {
    return '<button class="calc-tab' + (i === 0 ? ' active' : '') + '" data-tab="' + t.key + '" onclick="switchCalcTab(\'' + t.key + '\',this)">' + t.label + '</button>';
  }).join('');

  panels.innerHTML = buildVentilatorPanel() + buildSolarPanel() + buildAirconPanel();
  setVentSector('residential');
}

/* ── VENTILATOR PANEL ── */
function buildVentilatorPanel() {
  var wsOpts = CALC.ventilator.windspeeds.map(function(w, i) {
    return '<option value="' + w.value + '"' + (i === 1 ? ' selected' : '') + '>' + w.label + '</option>';
  }).join('');

  return '<div class="calc-panel active" id="panel-ventilator">' +
    '<p style="font-size:0.82rem;color:var(--text-mid);margin-bottom:1.25rem;line-height:1.6;">Formula: <strong>TBV = L &times; W &times; H</strong>, <strong>TVR = (TBV &times; ACH) &times; 0.278</strong>, then <strong>No. of Vents = TVR / Model Capacity</strong> (rounded up).</p>' +
    '<div class="calc-row-2" style="margin-bottom:1rem;">' +
    '<button type="button" class="calc-btn" id="v-sector-res" onclick="setVentSector(\'residential\')" style="padding:0.6rem 1rem;background:var(--blue-dark);color:var(--gold);">Residential</button>' +
    '<button type="button" class="calc-btn" id="v-sector-com" onclick="setVentSector(\'commercial\')" style="padding:0.6rem 1rem;background:#dfe6f4;color:var(--blue-dark);">Commercial / Industrial</button>' +
    '</div>' +
    '<div class="calc-grid">' +
    '<div class="form-group"><label>Length (m)</label><input type="number" id="v-length" placeholder="e.g. 25" min="0"></div>' +
    '<div class="form-group"><label>Width (m)</label><input type="number" id="v-width" placeholder="e.g. 30" min="0"></div>' +
    '<div class="form-group"><label>Height (m)</label><input type="number" id="v-height" placeholder="e.g. 6" min="0"></div>' +
    '</div>' +
    '<div class="calc-grid">' +
    '<div class="form-group"><label>Building Type / Usage (ACH)</label><select id="v-usage"></select></div>' +
    '<div class="form-group"><label>Reference Windspeed</label><select id="v-ws">' + wsOpts + '</select></div>' +
    '<div class="form-group"><label>Computation Basis</label><input type="text" value="Auto-recommended model and vent quantity" readonly></div>' +
    '</div>' +
    '<button class="calc-btn" onclick="calcVentilator()">Calculate Requirements</button>' +
    '<div class="calc-result" id="res-ventilator">' +
    '<div class="result-row">' +
    '<div class="result-item"><div class="result-val" id="v-resVol">\u2014</div><div class="result-label">Volume (m\u00b3)</div></div>' +
    '<div class="result-item"><div class="result-val" id="v-resAirflow">\u2014</div><div class="result-label">Total Airflow (m\u00b3/hr)</div></div>' +
    '<div class="result-item"><div class="result-val" id="v-resTVR">\u2014</div><div class="result-label">TVR (L/s)</div></div>' +
    '</div>' +
    '<div class="calc-result-rec" id="v-resRec"></div>' +
    '<p class="result-note">Important: the space or attic should have enough air inlets (e.g., under eave vents, windows, rolling doors, etc.) where air enters to replace the hot air being exhausted.</p>' +
    '</div>' +
    '</div>';
}

function setVentSector(sector) {
  var usage = document.getElementById('v-usage');
  var btnRes = document.getElementById('v-sector-res');
  var btnCom = document.getElementById('v-sector-com');
  if (!usage || !btnRes || !btnCom) return;
  var opts = CALC.ventilator.sectors[sector] || CALC.ventilator.sectors.residential;
  usage.innerHTML = opts.map(function(u) {
    return '<option value="' + u.value + '">' + u.label + '</option>';
  }).join('');
  usage.dataset.sector = sector;
  if (sector === 'residential') {
    btnRes.style.background = 'var(--blue-dark)';
    btnRes.style.color = 'var(--gold)';
    btnCom.style.background = '#dfe6f4';
    btnCom.style.color = 'var(--blue-dark)';
  } else {
    btnCom.style.background = 'var(--blue-dark)';
    btnCom.style.color = 'var(--gold)';
    btnRes.style.background = '#dfe6f4';
    btnRes.style.color = 'var(--blue-dark)';
  }
}

/* ── SOLAR PANEL ── */
function buildSolarPanel() {
  var pitchOpts = CALC.solar.pitchOptions.map(function(p) {
    return '<option value="' + p.value + '">' + p.label + '</option>';
  }).join('');
  var modelOpts = CALC.solar.models.map(function(m) {
    return '<option value="' + m.value + '">' + m.label + '</option>';
  }).join('');

  return '<div class="calc-panel" id="panel-solar">' +
    '<div class="calc-row-2">' +
    '<div class="form-group"><label>Attic Floor Length (m)</label><input type="number" id="s-length" placeholder="e.g. 15" min="0"></div>' +
    '<div class="form-group"><label>Attic Floor Width (m)</label><input type="number" id="s-width" placeholder="e.g. 10" min="0"></div>' +
    '</div>' +
    '<div class="calc-row-2">' +
    '<div class="form-group"><label>Roof Pitch</label><select id="s-pitch">' + pitchOpts + '</select></div>' +
    '<div class="form-group"><label>Fan Model</label><select id="s-model">' + modelOpts + '</select></div>' +
    '</div>' +
    '<button class="calc-btn" onclick="calcSolar()">Calculate Requirements</button>' +
    '<div class="calc-result" id="res-solar">' +
    '<div class="result-row">' +
    '<div class="result-item"><div class="result-val" id="s-resArea">—</div><div class="result-label">Attic Floor Area (m²)</div></div>' +
    '<div class="result-item"><div class="result-val" id="s-resFans">—</div><div class="result-label">Fans Required</div></div>' +
    '<div class="result-item"><div class="result-val" id="s-resModel">—</div><div class="result-label">Fan Model</div></div>' +
    '</div>' +
    '</div>' +
    '<div id="s-resCta"></div>' +
    '</div>';
}

/* ── AIRCON PANEL ── */
function buildAirconPanel() {
  var checks = CALC.aircon.adjustments.map(function(a) {
    return '<label class="hp-check"><input type="checkbox" id="a-' + a.id + '"> ' + a.label + ' (+' + a.hp + ' HP)</label>';
  }).join('');

  return '<div class="calc-panel" id="panel-aircon">' +
    '<div class="calc-grid">' +
    '<div class="form-group"><label>Room Length (m)</label><input type="number" id="a-length" placeholder="e.g. 5" min="0"></div>' +
    '<div class="form-group"><label>Room Width (m)</label><input type="number" id="a-width" placeholder="e.g. 4" min="0"></div>' +
    '<div class="form-group"><label>Room Height (m)</label><input type="number" id="a-height" placeholder="e.g. 3" min="0"></div>' +
    '</div>' +
    '<div class="hp-adjustments"><p>Adjustment Factors</p>' + checks + '</div>' +
    '<button class="calc-btn" onclick="calcAircon()">Calculate HP Requirement</button>' +
    '<div class="calc-result" id="res-aircon">' +
    '<div class="result-row">' +
    '<div class="result-item"><div class="result-val" id="a-resArea">—</div><div class="result-label">Floor Area (m²)</div></div>' +
    '<div class="result-item"><div class="result-val" id="a-resVol">—</div><div class="result-label">Room Volume (m³)</div></div>' +
    '<div class="result-item"><div class="result-val" id="a-resHP">—</div><div class="result-label">Recommended HP</div></div>' +
    '</div>' +
    '</div>' +
    '<div id="a-resCta"></div>' +
    '</div>';
}

/* ═══════════════════════════════════════════════════════════════════════════
   TAB SWITCHER
   ═══════════════════════════════════════════════════════════════════════════ */
function switchCalcTab(name, btn) {
  document.querySelectorAll('.calc-tab').forEach(function(t) { t.classList.remove('active'); });
  document.querySelectorAll('.calc-panel').forEach(function(p) { p.classList.remove('active'); });
  btn.classList.add('active');
  var panel = document.getElementById('panel-' + name);
  if (panel) panel.classList.add('active');
  if (name === 'ventilator') setVentSector('residential');
}

/* ═══════════════════════════════════════════════════════════════════════════
   CALCULATIONS
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── VENTILATOR: TBV, airflow, TVR, then model quantity ── */
function calcVentilator() {
  var l  = parseFloat(document.getElementById('v-length').value) || 0;
  var w  = parseFloat(document.getElementById('v-width').value)  || 0;
  var h  = parseFloat(document.getElementById('v-height').value) || 0;
  var usageEl = document.getElementById('v-usage');
  var ac = parseFloat(usageEl.value);
  var sector = usageEl.dataset.sector || 'residential';
  var ws = document.getElementById('v-ws').value;
  if (!l || !w || !h) return;

  var vol = l * w * h;
  var airflowHr = vol * ac;
  var tvr = airflowHr * 0.278;

  document.getElementById('v-resVol').textContent = vol.toFixed(0);
  document.getElementById('v-resAirflow').textContent = airflowHr.toFixed(0);
  document.getElementById('v-resTVR').textContent = tvr.toFixed(0);

  var allSizes = CALC.ventilator.sizes.slice();
  var commercialSizes = allSizes.filter(function(s) {
    return s.label.indexOf('Whirlwind') === -1 && s.label.indexOf('Solar') === -1 && s.label.indexOf('Plus') === -1;
  });
  var residentialChoices = allSizes.filter(function(s) {
    return s.label === 'Whirlwind' || s.label.indexOf('GVW300') === 0;
  });
  var sizingSet = sector === 'residential' ? residentialChoices : commercialSizes;

  function unitsFor(size) {
    var cap = size.lps[ws] || 1;
    return Math.max(1, Math.ceil(tvr / cap));
  }

  var sorted = sizingSet.slice().sort(function(a, b) {
    return (a.lps[ws] || 0) - (b.lps[ws] || 0);
  });

  var preferred = sorted[0];
  for (var i = 0; i < sorted.length; i++) {
    if (unitsFor(sorted[i]) <= 8) {
      preferred = sorted[i];
      break;
    }
    preferred = sorted[i];
  }

  var preferredUnits = unitsFor(preferred);
  var rec = document.getElementById('v-resRec');

  if (sector === 'residential') {
    var residentialHtml = residentialChoices.map(function(opt) {
      return '<div class="result-rec-detail" style="margin-bottom:0.45rem;">' +
        '<strong>' + opt.label + ':</strong> ' + unitsFor(opt) + ' unit' + (unitsFor(opt) > 1 ? 's' : '') +
        ' <span style="opacity:0.8;">(' + opt.lps[ws] + ' L/s each at ' + ws + ' km/hr)</span></div>';
    }).join('');

    rec.innerHTML =
      '<div class="result-bottom-grid">' +
      '<div class="result-rec-box">' +
      '<div class="result-rec-label">Recommended for Residential</div>' +
      '<div class="result-rec-name">Whirlwind or GVW300</div>' +
      residentialHtml +
      '<div class="result-rec-detail">Total Ventilation Rate: <strong>' + tvr.toFixed(0) + ' L/s</strong></div>' +
      '</div>' +
      '<div class="result-rec-cta">' +
      '<div class="result-rec-cta-title">Need a More Detailed Assessment?</div>' +
      '<p>Every facility is different. Our team can conduct a full ventilation assessment to give you the most accurate specification.</p>' +
      '<a href="contact.html" class="result-cta-btn">Contact Us for a Site Assessment &rarr;</a>' +
      '</div>' +
      '</div>';
  } else {
    rec.innerHTML =
      '<div class="result-bottom-grid">' +
      '<div class="result-rec-box">' +
      '<div class="result-rec-label">Recommended Ventilator</div>' +
      '<div class="result-rec-name">' + preferred.label + '</div>' +
      '<div class="result-rec-detail">Capacity at ' + ws + ' km/hr: <strong>' + preferred.lps[ws] + ' L/s</strong> &nbsp;/&nbsp; <strong>' + preferred.cfm[ws] + ' CFM</strong></div>' +
      '<div class="result-rec-detail">Suggested Quantity: <strong>' + preferredUnits + ' unit' + (preferredUnits > 1 ? 's' : '') + '</strong></div>' +
      '<div class="result-rec-detail">TVR Basis: <strong>' + tvr.toFixed(0) + ' L/s</strong></div>' +
      '</div>' +
      '<div class="result-rec-cta">' +
      '<div class="result-rec-cta-title">Need a More Detailed Assessment?</div>' +
      '<p>Every facility is different. Our team can conduct a full ventilation assessment to give you the most accurate specification.</p>' +
      '<a href="contact.html" class="result-cta-btn">Contact Us for a Site Assessment &rarr;</a>' +
      '</div>' +
      '</div>';
  }

  document.getElementById('res-ventilator').classList.add('show');
}

/* ── SOLAR ── */
function calcSolar() {
  var l     = parseFloat(document.getElementById('s-length').value) || 0;
  var w     = parseFloat(document.getElementById('s-width').value)  || 0;
  var pitch = document.getElementById('s-pitch').value;
  var model = document.getElementById('s-model').value;
  if (!l || !w) return;
  var area  = l * w;
  var table = CALC.solar.tables[model];
  var fans  = null;
  for (var i = 0; i < table.length; i++) {
    if (area <= table[i].maxArea) { fans = table[i][pitch]; break; }
  }
  if (fans === null) fans = table[table.length - 1][pitch];
  var summary = area.toFixed(0) + ' m\u00b2 attic &nbsp;&bull;&nbsp; ' + pitch + ' pitch &nbsp;&bull;&nbsp; GVS-' + model + 'W';
  document.getElementById('s-resArea').textContent  = area.toFixed(0);
  document.getElementById('s-resFans').textContent  = fans;
  document.getElementById('s-resModel').textContent = 'GVS-' + model + 'W';
  document.getElementById('res-solar').classList.add('show');
  document.getElementById('s-resCta').innerHTML =
    '<div class="result-bottom-grid">' +
    '<div class="result-rec-box">' +
    '<div class="result-rec-label">Fans Required</div>' +
    '<div class="result-rec-name">' + fans + ' Unit' + (fans > 1 ? 's' : '') + '</div>' +
    '<div class="result-rec-detail">Model: <strong>GVS-' + model + 'W</strong></div>' +
    '<div class="result-rec-detail">Attic Area: <strong>' + area.toFixed(0) + ' m\u00b2</strong> &nbsp;|&nbsp; Pitch: <strong>' + pitch + '</strong></div>' +
    '</div>' +
    '<div class="result-rec-cta">' +
    '<div class="result-rec-cta-title">Need a More Detailed Assessment?</div>' +
    '<p>Roof conditions vary. Our team can assess your specific roof type and recommend the optimal solar fan configuration.</p>' +
    '<a href="contact.html" class="result-cta-btn">Contact Us for a Site Assessment &rarr;</a>' +
    '</div>' +
    '</div>';
}

/* ── AIRCON ── */
function calcAircon() {
  var l = parseFloat(document.getElementById('a-length').value) || 0;
  var w = parseFloat(document.getElementById('a-width').value)  || 0;
  var h = parseFloat(document.getElementById('a-height').value) || 0;
  if (!l || !w) return;
  var area    = l * w;
  var vol     = h > 0 ? (area * h).toFixed(1) : null;
  var ceilAdj = (h > 3) ? 0.5 : 0;
  var baseHP  = 3.0;
  var tbl     = CALC.aircon.hpTable;
  for (var i = 0; i < tbl.length; i++) {
    if (area <= tbl[i].maxArea) { baseHP = tbl[i].hp; break; }
  }
  var adj = ceilAdj;
  CALC.aircon.adjustments.forEach(function(a) {
    var el = document.getElementById('a-' + a.id);
    if (el && el.checked) adj += a.hp;
  });
  var totalHP = baseHP + adj;
  var std     = CALC.aircon.standardHP;
  var finalHP = std.reduce(function(prev, curr) {
    return Math.abs(curr - totalHP) < Math.abs(prev - totalHP) ? curr : prev;
  });
  if (totalHP > finalHP) finalHP = std[Math.min(std.indexOf(finalHP) + 1, std.length - 1)];
  var noteAdj = adj > 0 ? ' + <strong>' + adj.toFixed(1) + ' HP</strong> adjustments' + (ceilAdj > 0 ? ' (incl. high ceiling)' : '') : '';
  document.getElementById('a-resCta').innerHTML =
    '<div class="result-bottom-grid">' +
    '<div class="result-rec-box">' +
    '<div class="result-rec-label">Recommended HP</div>' +
    '<div class="result-rec-name">' + finalHP + ' HP</div>' +
    '<div class="result-rec-detail">Floor Area: <strong>' + area.toFixed(1) + ' m\u00b2</strong>' + (vol ? ' &nbsp;|&nbsp; Volume: <strong>' + vol + ' m\u00b3</strong>' : '') + '</div>' +
    '<div class="result-rec-detail">Base: <strong>' + baseHP + ' HP</strong>' + (adj > 0 ? ' + <strong>' + adj.toFixed(1) + ' HP</strong> adjustments' : '') + '</div>' +
    '</div>' +
    '<div class="result-rec-cta">' +
    '<div class="result-rec-cta-title">Get the Right Unit for Your Space</div>' +
    '<p>For the most accurate sizing, have one of our accredited installers survey your space before purchasing a unit.</p>' +
    '<a href="contact.html" class="result-cta-btn">Request a Free Site Assessment &rarr;</a>' +
    '</div>' +
    '</div>';
}
