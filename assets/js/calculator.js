/* ─── Gleamair Calculator ────────────────────────────────────────────────────
   Data is embedded directly so this works with file:// (no server needed).
   To update: edit conf/db/calculator.json then run: python sync-data.py
   ─────────────────────────────────────────────────────────────────────────── */

/* @@CALC_START@@ */

var CALC = {
  ventilator: {
    label: "Ventilator Sizing",
    description: "Estimate the required ventilator size and quantity for your building using the industrial specification formula.",
    usageTypes: [
      {
        label: "Workshops (5–10 ACH)",
        value: 7.5
      },
      {
        label: "Factories with Welding (10–15 ACH)",
        value: 12.5
      },
      {
        label: "Warehouses / Storage (5–8 ACH)",
        value: 6.5
      },
      {
        label: "Gymnasiums (5–10 ACH)",
        value: 7.5
      },
      {
        label: "Assembly Halls (10–15 ACH)",
        value: 12.5
      },
      {
        label: "Garages (10–15 ACH)",
        value: 12.5
      },
      {
        label: "Toilets (12–15 ACH)",
        value: 13.5
      },
      {
        label: "Laundries (12–20 ACH)",
        value: 16.0
      },
      {
        label: "High Smell — Poultry / Piggeries (10–50 ACH)",
        value: 30.0
      }
    ],
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
        }
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
        }
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
        }
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
}

/* ── VENTILATOR PANEL ── */
function buildVentilatorPanel() {
  var usageOpts = CALC.ventilator.usageTypes.map(function(u) {
    return '<option value="' + u.value + '">' + u.label + '</option>';
  }).join('');

  var wsOpts = CALC.ventilator.windspeeds.map(function(w, i) {
    return '<option value="' + w.value + '"' + (i === 1 ? ' selected' : '') + '>' + w.label + '</option>';
  }).join('');

  return '<div class="calc-panel active" id="panel-ventilator">' +
    '<p style="font-size:0.82rem;color:var(--text-mid);margin-bottom:1.25rem;line-height:1.6;">Formula: <strong>E = (VOL &times; A/C &times; 0.278) / N</strong> &mdash; where E is the required exhaust capacity per vent (L/s).</p>' +
    '<div class="calc-grid">' +
    '<div class="form-group"><label>Length (m)</label><input type="number" id="v-length" placeholder="e.g. 25" min="0"></div>' +
    '<div class="form-group"><label>Width (m)</label><input type="number" id="v-width" placeholder="e.g. 30" min="0"></div>' +
    '<div class="form-group"><label>Height (m)</label><input type="number" id="v-height" placeholder="e.g. 6" min="0"></div>' +
    '</div>' +
    '<div class="calc-grid">' +
    '<div class="form-group"><label>Building Type (A/C)</label><select id="v-usage">' + usageOpts + '</select></div>' +
    '<div class="form-group"><label>No. of Vents (N)</label><input type="number" id="v-n" placeholder="e.g. 6" min="1" value="1"></div>' +
    '<div class="form-group"><label>Reference Windspeed</label><select id="v-ws">' + wsOpts + '</select></div>' +
    '</div>' +
    '<button class="calc-btn" onclick="calcVentilator()">Calculate Requirements</button>' +
    '<div class="calc-result" id="res-ventilator">' +
    '<div class="result-row">' +
    '<div class="result-item"><div class="result-val" id="v-resVol">\u2014</div><div class="result-label">Volume (m\u00b3)</div></div>' +
    '<div class="result-item"><div class="result-val" id="v-resE">\u2014</div><div class="result-label">Required E per Vent (L/s)</div></div>' +
    '<div class="result-item"><div class="result-val" id="v-resCFM">\u2014</div><div class="result-label">Required E per Vent (CFM)</div></div>' +
    '</div>' +
    '<div class="calc-result-rec" id="v-resRec"></div>' +
    '<p class="result-note">Based on E = (VOL \u00d7 A/C \u00d7 0.278) / N. Contact us for a detailed site assessment.</p>' +
    '</div>' +
    '</div>';
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
    '<div class="result-row-2">' +
    '<div class="result-item"><div class="result-val" id="s-resArea">\u2014</div><div class="result-label">Attic Floor Area (m\u00b2)</div></div>' +
    '<div class="result-item"><div class="result-val" id="s-resUnits">\u2014</div><div class="result-label">Fans Required</div></div>' +
    '</div>' +
    '<p class="result-note" id="s-resNote"></p>' +
    '</div>' +
    '</div>';
}

/* ── AIRCON PANEL ── */
function buildAirconPanel() {
  var checks = CALC.aircon.adjustments.map(function(a) {
    return '<label class="hp-check"><input type="checkbox" id="a-' + a.id + '"> ' + a.label + ' (+' + a.hp + ' HP)</label>';
  }).join('');

  return '<div class="calc-panel" id="panel-aircon">' +
    '<div class="calc-row-2">' +
    '<div class="form-group"><label>Room Length (m)</label><input type="number" id="a-length" placeholder="e.g. 5" min="0"></div>' +
    '<div class="form-group"><label>Room Width (m)</label><input type="number" id="a-width" placeholder="e.g. 4" min="0"></div>' +
    '</div>' +
    '<div class="hp-adjustments"><p>Adjustment Factors</p>' + checks + '</div>' +
    '<button class="calc-btn" onclick="calcAircon()">Calculate HP Requirement</button>' +
    '<div class="calc-result" id="res-aircon">' +
    '<div class="result-row-2">' +
    '<div class="result-item"><div class="result-val" id="a-resArea">\u2014</div><div class="result-label">Room Area (m\u00b2)</div></div>' +
    '<div class="result-item"><div class="result-hp" id="a-resHP">\u2014</div><div class="result-label">Recommended HP</div></div>' +
    '</div>' +
    '<p class="result-note" id="a-resNote"></p>' +
    '</div>' +
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
}

/* ═══════════════════════════════════════════════════════════════════════════
   CALCULATIONS
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── VENTILATOR: E = (VOL * A/C * 0.278) / N ── */
function calcVentilator() {
  var l  = parseFloat(document.getElementById('v-length').value) || 0;
  var w  = parseFloat(document.getElementById('v-width').value)  || 0;
  var h  = parseFloat(document.getElementById('v-height').value) || 0;
  var ac = parseFloat(document.getElementById('v-usage').value);
  var n  = parseInt(document.getElementById('v-n').value)        || 1;
  var ws = document.getElementById('v-ws').value;
  if (!l || !w || !h) return;

  var vol = l * w * h;
  var E   = (vol * ac * 0.278) / n;
  var Ecfm = E * 2.119; // L/s to CFM

  document.getElementById('v-resVol').textContent = vol.toFixed(0);
  document.getElementById('v-resE').textContent   = E.toFixed(1);
  document.getElementById('v-resCFM').textContent = Ecfm.toFixed(0);

  // Sort sizes ascending by lps at selected windspeed, then find smallest >= E
  var sizes = CALC.ventilator.sizes.slice().sort(function(a, b) { return a.lps[ws] - b.lps[ws]; });
  var match = null;
  for (var i = 0; i < sizes.length; i++) {
    if (sizes[i].lps[ws] >= E) { match = sizes[i]; break; }
  }
  // If none match, recommend the highest-capacity size
  if (!match) match = sizes[sizes.length - 1];

  var rec = document.getElementById('v-resRec');
  rec.innerHTML =
    '<div class="result-rec-box">' +
    '<div class="result-rec-label">Recommended Ventilator</div>' +
    '<div class="result-rec-name">' + match.label + '</div>' +
    '<div class="result-rec-detail">' +
      'Capacity at ' + ws + ' km/hr: <strong>' + match.lps[ws] + ' L/s</strong> &nbsp;/&nbsp; <strong>' + match.cfm[ws] + ' CFM</strong>' +
    '</div>' +
    '<div class="result-rec-detail">Quantity: <strong>' + n + ' unit' + (n > 1 ? 's' : '') + '</strong></div>' +
    '</div>';

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
  document.getElementById('s-resArea').textContent  = area.toFixed(0);
  document.getElementById('s-resUnits').textContent = fans;
  document.getElementById('s-resNote').textContent  =
    'Minimum recommended fans for a ' + area.toFixed(0) + ' m\u00b2 attic with ' +
    pitch + ' pitch roof using GVS-' + model + 'W. Contact us for a site assessment.';
  document.getElementById('res-solar').classList.add('show');
}

/* ── AIRCON ── */
function calcAircon() {
  var l = parseFloat(document.getElementById('a-length').value) || 0;
  var w = parseFloat(document.getElementById('a-width').value)  || 0;
  if (!l || !w) return;
  var area   = l * w;
  var baseHP = 3.0;
  var tbl    = CALC.aircon.hpTable;
  for (var i = 0; i < tbl.length; i++) {
    if (area <= tbl[i].maxArea) { baseHP = tbl[i].hp; break; }
  }
  var adj = 0;
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
  document.getElementById('a-resArea').textContent = area.toFixed(1);
  document.getElementById('a-resHP').textContent   = finalHP + ' HP';
  var noteAdj = adj > 0 ? ' Includes +' + adj + ' HP adjustment for selected factors.' : '';
  document.getElementById('a-resNote').textContent =
    'Base recommendation for ' + area.toFixed(1) + ' m\u00b2 is ' + baseHP + ' HP.' + noteAdj +
    ' Final recommendation: ' + finalHP + ' HP. Consult our team for a full assessment.';
  document.getElementById('res-aircon').classList.add('show');
}
