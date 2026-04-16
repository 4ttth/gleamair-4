/* ─── Gleamair Data Loader ───────────────────────────────────────────────────
   Data is embedded directly so this works with file:// (no server needed).
   To update content: edit the JSON files in conf/db/, then sync the data
   objects below to match.
   ─────────────────────────────────────────────────────────────────────────── */

/* @@DATA_START@@ */

var DB = {
  clients: [
    {
      id: "villa-escudero",
      name: "Villa Escudero",
      logo: "assets/images/other/otherbusinesses/villa_escudero_logo.png"
    },
    {
      id: "ceva-logistics",
      name: "CEVA Logistics",
      logo: "assets/images/other/otherbusinesses/ceva-logistics_logo.png"
    },
    {
      id: "3r-shane",
      name: "3R Shane Rice Mills",
      logo: "assets/images/other/otherbusinesses/3rshane_logo.png"
    },
    {
      id: "sg-eco",
      name: "SG Eco Industries",
      logo: "assets/images/other/otherbusinesses/SG Eco Logo.webp"
    },
    {
      id: "fujifilm",
      name: "Fujifilm",
      logo: "assets/images/other/otherbusinesses/Fujifilm.png"
    },
    {
      id: "midc",
      name: "MIDC",
      logo: "assets/images/other/otherbusinesses/MIDC.png"
    },
    {
      id: "tannph",
      name: "Tann Philippines",
      logo: "assets/images/other/otherbusinesses/tannph.png"
    },
    {
      id: "treasureislandcebu",
      name: "Treasure Island Industrial Corp",
      logo: "assets/images/other/otherbusinesses/treasureislandcebu.png"
    },
    {
      id: "altoent",
      name: "Alto Enterprises",
      logo: "assets/images/other/otherbusinesses/altoent.png"
    },
    {
      id: "artisan",
      name: "Artisan",
      logo: "assets/images/other/otherbusinesses/artisan.jpg"
    },
    {
      id: "eurobelmarketing",
      name: "Eurobel Marketing",
      logo: "assets/images/other/otherbusinesses/eurobelmarketing.png"
    },
    {
      id: "hapimi",
      name: "Hapimi",
      logo: "assets/images/other/otherbusinesses/hapimi.png"
    },
    {
      id: "jocfabrication",
      name: "JOC Fabrication & Construction",
      logo: "assets/images/other/otherbusinesses/jocfabrication&construction.png"
    },
    {
      id: "nbelectrical",
      name: "NB Electrical",
      logo: "assets/images/other/otherbusinesses/nbelectrical.png"
    },
    {
      id: "trinav",
      name: "Trinav",
      logo: "assets/images/other/otherbusinesses/trinav.png"
    }
  ],
  testimonials: [
    {
      id: "t1",
      nameDisplay: "A******* L*****",
      clientType: "Residential Client",
      projectType: "Sky Tunnel Installation",
      rating: 5,
      quote: "Everything from customer engagement, delivery, installation, and payment was great!"
    },
    {
      id: "t2",
      nameDisplay: "Villa Escudero Plantation & Resort Inc.",
      clientType: "Resort Client",
      projectType: "Solar Lighting Project",
      rating: 5,
      quote: "Very satisfied with product quality, installation service, customer support, and delivery timeliness. Highly likely to recommend Gleamair Enterprises to others."
    }
  ],
  projects: [
    {
      id: "sg-eco-industries",
      label: "SG Eco Industries Inc",
      folder: "SG Eco Industries Inc",
      images: [
        "assets/images/client-photos/SG Eco Industries Inc/Copy_of_IMG_1915.jpg"
      ]
    },
    {
      id: "ceva-logistics",
      label: "CEVA Logistics",
      folder: "CEVA Logistics",
      images: [
        "assets/images/client-photos/CEVA Logistics/Copy of 33a5533f40e3fbc51e7e54edb28bd2cf.jpeg"
      ]
    },
    {
      id: "residential-bulacan",
      label: "Residential - Bulacan",
      folder: "Residential - Bulacan",
      images: [
        "assets/images/client-photos/Residential - Bulacan/Copy_of_IMG_1251.jpg"
      ]
    },
    {
      id: "anthony-lozado-residential-2025",
      label: "Residential - Manila",
      folder: "Residential - Manila",
      images: [
        "assets/images/client-photos/Residential - Manila/Copy of viber_image_2025-09-12_13-32-19-759.jpg",
        "assets/images/client-photos/Residential - Manila/Copy of viber_image_2025-09-12_13-32-28-879.jpg",
        "assets/images/client-photos/Residential - Manila/Copy of viber_image_2025-09-12_13-32-38-560.jpg",
        "assets/images/client-photos/Residential - Manila/Copy of viber_image_2025-09-12_13-32-50-578.jpg",
        "assets/images/client-photos/Residential - Manila/Copy of viber_image_2025-09-12_13-32-58-578.jpg"
      ]
    },
    {
      id: "newbridge-cebu",
      label: "Newbridge Cebu",
      folder: "Newbridge Cebu",
      images: [
        "assets/images/client-photos/Newbridge Cebu/Copy_of_IMG_1883.jpg"
      ]
    },
    {
      id: "residential-mabalacat",
      label: "Residential - Mabalacat",
      folder: "Residential - Mabalacat",
      images: [
        "assets/images/client-photos/Residential - Mabalacat/Copy of 629c53801f5feaf754f25cefcc062951.jpeg",
        "assets/images/client-photos/Residential - Mabalacat/Copy of b44c4705d4fcf5a93429b4b91dc40340.jpeg"
      ]
    },
    {
      id: "leandro-santiago-valenzuela",
      label: "Residential - Valenzuela",
      folder: "Residential - Valenzuela",
      images: [
        "assets/images/client-photos/Residential - Valenzuela/Copy of IMG_2077.JPG"
      ]
    },
    {
      id: "3r-shane-ricemills",
      label: "3R Shane RiceMills",
      folder: "3R Shane RiceMills",
      images: [
        "assets/images/client-photos/3R Shane RiceMills/Copy of Copy of IMG_2019.JPG",
        "assets/images/client-photos/3R Shane RiceMills/Copy of Copy of IMG_2020.JPG",
        "assets/images/client-photos/3R Shane RiceMills/Copy of Copy of IMG_2021.JPG",
        "assets/images/client-photos/3R Shane RiceMills/Copy of Copy of IMG_2022.JPG"
      ]
    },
    {
      id: "residential-bamban",
      label: "Residential - Bamban",
      folder: "Residential Bamban",
      images: [
        "assets/images/client-photos/Residential - Bamban/Copy_of_IMG_1913.jpg"
      ]
    }
  ],
  mission: {
    heading: "Our Mission",
    body: "At Gleamair Enterprises, we simplify the way homes and businesses achieve comfort, efficiency, and sustainability by offering a complete range of solutions under one trusted partner. From lighting and cooling systems to advanced ventilation, solar energy technologies, and building enhancements, we provide end-to-end services—from supply and installation to maintenance and repair. We are committed to delivering reliable, high-quality solutions that optimize performance, reduce energy costs, and elevate everyday living through innovation and expertise."
  },
  vision: {
    heading: "Our Vision",
    body: "To be the leading integrated solutions provider for modern buildings—delivering innovative lighting, cooling, ventilation, energy, and building systems that create smarter, more efficient, and sustainable spaces."
  },
  categories: [
    {
      id: "lighting",
      label: "Lighting Solutions",
      description: "Natural daylighting systems that bring free sunlight into any interior space — residential or commercial.",
      products: [
        {
          id: "sky-tunnel-residential",
          name: "Sky Tunnel XL2 — Residential",
          category: "Lighting Solutions",
          image: "assets/images/products/Sky Tunnel XL2 — Residential.jpg",
          description: "Natural daylighting system for homes. Channels sunlight from rooftop into bathrooms, kitchens, hallways and living areas. Double-glazed diffuser standard. 7-year manufacturer's warranty.",
          badges: [
            "Australian Technology",
            "7-Year Warranty",
            "Zero Energy"
          ],
          specs: [
            {
              key: "Sizes Available",
              value: "343mm, 457mm, 535mm"
            },
            {
              key: "Tubing Options",
              value: "Flexi-tube / Rigid98"
            },
            {
              key: "Max Flexi Length",
              value: "3m"
            },
            {
              key: "Dome Material",
              value: "Acrylic or Polycarbonate"
            }
          ],
          brochure: "assets/brochures/Sky-Tunnel-Brochure-Residential.pdf"
        },
        {
          id: "sky-tunnel-commercial",
          name: "Sky Tunnel XL2 — Commercial / Industrial",
          category: "Lighting Solutions",
          image: "assets/images/products/Sky Tunnel XL2 — Commercial .JPG",
          description: "High-performance daylighting for warehouses, factories, offices and retail spaces. Rigid98 Miro-Silver tubing with 98% total reflectivity. Proven 20+ year track record in demanding environments.",
          badges: [
            "Rigid98 Tubing",
            "98% Reflectivity",
            "7-Year Warranty"
          ],
          specs: [
            {
              key: "Sizes Available",
              value: "343mm, 457mm, 535mm"
            },
            {
              key: "Tubing",
              value: "Rigid98 (Miro-Silver)"
            },
            {
              key: "Coverage (535mm)",
              value: "Up to 36m² per unit"
            },
            {
              key: "Standards",
              value: "BBA & AS4285"
            }
          ],
          brochure: "assets/brochures/Sky-Tunnel-Brochure-Commercial.pdf"
        }
      ]
    },
    {
      id: "ventilation",
      label: "Ventilation Solutions",
      description: "Wind-driven, solar-powered, and electric ventilation systems for every building type and climate condition.",
      products: [
        {
          id: "green-vent-wind",
          name: "Green-Vent Wind — Wind Driven Roof Ventilator",
          category: "Ventilation Solutions",
          image: "assets/images/products/Green-Vent Wind — Wind Driven Roof Ventilator.jpg",
          description: "Premium wind-driven roof ventilator using Australian Vertical Vane Technology. Up to 3× the exhaust capacity of conventional round ventilators. Zero electricity, zero running cost. 15-year manufacturer's warranty.",
          badges: [
            "Australian Technology",
            "15-Year Warranty",
            "Zero Energy"
          ],
          specs: [
            {
              key: "Models",
              value: "GVW300, GVW600, GVW900"
            },
            {
              key: "Max Capacity (GVW900)",
              value: "3,460 L/s @ 16 km/h"
            },
            {
              key: "Material",
              value: "Aluminium 5005 H34"
            },
            {
              key: "Shaft",
              value: "304 Stainless Steel"
            }
          ],
          brochure: null
        },
        {
          id: "gvs-15w",
          name: "Green-Vent Solar 15W (GVS-15W)",
          category: "Ventilation Solutions",
          image: "assets/images/products/Green-Vent Solar 15W (GVS-15W).jpg",
          description: "Solar-powered attic extraction fan with a 15W 36-cell polycrystalline panel. Fully adjustable panel tilts and rotates. Thermostat included. Optional Environment Control System (ECS) for temperature and humidity automation.",
          badges: [
            "Solar Powered",
            "Thermostat Included",
            "ECS Optional"
          ],
          specs: [
            {
              key: "Solar Panel",
              value: "15W Polycrystalline"
            },
            {
              key: "Motor",
              value: "High Efficiency 38V DC"
            },
            {
              key: "Flashing",
              value: "0.55mm (24 Gauge) Steel"
            },
            {
              key: "ECS Temp Trigger",
              value: "ON 27°C / OFF 25°C"
            }
          ],
          brochure: "assets/brochures/GVS 15W.pdf"
        },
        {
          id: "gvs-30w",
          name: "Green-Vent Solar 30W (GVS-30W)",
          category: "Ventilation Solutions",
          image: "assets/images/products/Green-Vent Solar 30W (GVS-30W).jpg",
          description: "High-power 30W solar attic extraction fan with ECS included as standard. Wider 350mm throat for better air exchange. Mains power backup transformer included — works even at night when conditions demand it.",
          badges: [
            "30W Solar Panel",
            "ECS Included",
            "Mains Backup",
            "Works at Night"
          ],
          specs: [
            {
              key: "Solar Panel",
              value: "30W Polycrystalline"
            },
            {
              key: "Throat Size",
              value: "350mm"
            },
            {
              key: "Motor",
              value: "38V DC"
            },
            {
              key: "Mains Runtime",
              value: "8 min every 30 min"
            }
          ],
          brochure: "assets/brochures/GVS-30W Flyer.pdf"
        },
        {
          id: "whirlwind-plus",
          name: "Whirlwind Plus — Solar Wind Roof Ventilator",
          category: "Ventilation Solutions",
          image: "assets/images/products/Whirlwind-Plus.jpg",
          description: "The Whirlwind Plus is an add-on to the standard Whirlwind Roof Ventilator combining solar power with wind to increase exhaust flow rate by up to 100%. Wind and solar driven by day when you need it most — wind driven at night when heat load is reduced. Fewer units required than wind-powered alone.",
          badges: [
            "Solar + Wind",
            "Up to 100% More Flow",
            "Day & Night Operation"
          ],
          specs: [
            {
              key: "Solar Panel",
              value: "15W"
            },
            {
              key: "Motor",
              value: "36V High Performance"
            },
            {
              key: "Includes",
              value: "Fan Blade, Collar, 2m Cable & Fixings"
            },
            {
              key: "Finish",
              value: "Mill Finish or Coloured Powdercoat"
            }
          ],
          brochure: "assets/brochures/Whirlwind-Plus-Flyer.pdf"
        },
        {
          id: "industrial-exhaust-fan",
          name: "GA Industrial Wall Mounted Exhaust Fan",
          category: "Ventilation Solutions",
          image: "assets/images/products/GA Industrial Wall Mounted Exhaust Fan.png",
          description: "Heavy-duty wall-mounted industrial exhaust fan engineered for high-performance ventilation in manufacturing plants, warehouses, and commercial facilities. Designed for continuous operation in demanding environments.",
          badges: [
            "Industrial Grade",
            "Wall Mounted",
            "High Performance"
          ],
          specs: [
            {
              key: "Application",
              value: "Industrial / Commercial"
            },
            {
              key: "Mount Type",
              value: "Wall Mounted"
            },
            {
              key: "Full Specs",
              value: "See Brochure"
            }
          ],
          brochure: "assets/brochures/Copy of GA INDUSTRIAL WALL MOUNTED EXHAUST FAN.pdf"
        }
      ]
    },
    {
      id: "cooling",
      label: "Cooling Solutions",
      description: "Professional air conditioning supply, installation, and maintenance services for residential and commercial clients.",
      products: [
        {
          id: "aircon-installation",
          name: "Aircon Supply & Installation",
          category: "Cooling Solutions",
          image: "assets/images/products/Aircon Supply & Installation.jpg",
          description: "Complete air conditioning supply and professional installation service for residential and commercial spaces. We handle unit selection, proper sizing, and full installation by certified HVAC technicians.",
          badges: [
            "Certified Technicians",
            "Residential",
            "Commercial"
          ],
          specs: [
            {
              key: "Service Type",
              value: "Supply & Installation"
            },
            {
              key: "Unit Types",
              value: "Split, Window, Cassette"
            },
            {
              key: "Coverage",
              value: "Residential & Commercial"
            }
          ],
          brochure: null
        },
        {
          id: "aircon-maintenance",
          name: "Aircon Preventive Maintenance",
          category: "Cooling Solutions",
          image: "assets/images/products/Aircon Preventive Maintenance.jpeg",
          description: "Scheduled preventive maintenance programs to keep your air conditioning units running at peak efficiency. Includes cleaning, inspection, refrigerant check, and performance testing. Emergency repair response available.",
          badges: [
            "Preventive Maintenance",
            "24/7 Emergency",
            "All Brands"
          ],
          specs: [
            {
              key: "Service Type",
              value: "Maintenance & Repair"
            },
            {
              key: "Schedule",
              value: "Quarterly / Annual"
            },
            {
              key: "Emergency",
              value: "24/7 Response"
            },
            {
              key: "Coverage",
              value: "All Unit Types & Brands"
            }
          ],
          brochure: null
        }
      ]
    },
    {
      id: "building",
      label: "Building Solutions",
      description: "Engineered access and structural solutions for safe, compliant, and weatherproof building performance.",
      products: [
        {
          id: "roof-hatch",
          name: "Roof Hatch Access Solutions",
          category: "Building Solutions",
          image: "assets/images/products/Roof Hatch.jpg",
          description: "Safe, secure, and weatherproof roof access solutions engineered for all roof pitch angles. Features pad-lockable latches for enhanced security and full safety compliance. Ideal for facilities requiring regular rooftop maintenance access.",
          badges: [
            "Weatherproof",
            "All Pitch Angles",
            "Safety Compliant"
          ],
          specs: [
            {
              key: "Application",
              value: "Commercial & Industrial"
            },
            {
              key: "Locking",
              value: "Pad-lockable Latch"
            },
            {
              key: "Pitch Compatibility",
              value: "All Roof Angles"
            },
            {
              key: "Compliance",
              value: "Safety Standards Met"
            }
          ],
          brochure: "assets/brochures/Access_Hatches.pdf"
        }
      ]
    }
  ]
};

/* @@DATA_END@@ */

/* ═══════════════════════════════════════════════════════════════════════════
   RENDERERS
   ═══════════════════════════════════════════════════════════════════════════ */

function _stars(n) {
  var s = '';
  for (var i = 0; i < n; i++) s += '<span>&#9733;</span>';
  return s;
}

function _placeholder(label) {
  return '<div class="prod-img-placeholder">' +
    '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/>' +
    '<line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>' +
    '<line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>' +
    '<line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>' +
    '<line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>' +
    '<line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>' +
    '<line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>' +
    '<span class="ph-label">Image Coming Soon</span>' +
    '<span class="ph-name">' + label + '</span>' +
    '</div>';
}

function renderClients() {
  var el = document.getElementById('clients-grid');
  if (!el) return;
  el.innerHTML = DB.clients.map(function(c) {
    return '<div class="client-card">' +
      '<img src="' + c.logo + '" alt="' + c.name + '" class="client-logo">' +
      '</div>';
  }).join('');
}

function renderTestimonials() {
  var el = document.getElementById('testimonials-grid');
  if (!el) return;
  el.innerHTML = DB.testimonials.map(function(t) {
    return '<div class="testimonial-card">' +
      '<div class="testimonial-rating">' + _stars(t.rating) + '</div>' +
      '<p class="testimonial-quote">\u201c' + t.quote + '\u201d</p>' +
      '<div class="testimonial-name">' + t.nameDisplay + '</div>' +
      '<div class="testimonial-title">' + t.clientType + ' \u00a0\u2022\u00a0 ' + t.projectType + '</div>' +
      '</div>';
  }).join('');
}

function renderProjects() {
  var el = document.getElementById('projects-grid');
  if (!el) return;
  var withImages = DB.projects.filter(function(p) { return p.images.length > 0; });
  el.innerHTML = withImages.map(function(p) {
    var img = p.images[0];
    var fb = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%230d2f5e' width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' font-size='16' fill='%23c9a227' text-anchor='middle' dominant-baseline='middle'%3E" + encodeURIComponent(p.label) + "%3C/text%3E%3C/svg%3E";
    return '<div class="project-card">' +
      '<img src="' + img + '" alt="' + p.label + '" class="project-img" onerror="this.src=\'' + fb + '\'">' +
      '<div class="project-overlay"><div class="project-label">' + p.label + '</div></div>' +
      '</div>';
  }).join('');
}

function renderMissionVision() {
  var mEl = document.getElementById('mission-block');
  var vEl = document.getElementById('vision-block');
  if (mEl) {
    mEl.querySelector('h3').textContent = DB.mission.heading;
    mEl.querySelector('p').textContent = DB.mission.body;
  }
  if (vEl) {
    vEl.querySelector('h3').textContent = DB.vision.heading;
    vEl.querySelector('p').textContent = DB.vision.body;
  }
}

function _buildProductCard(p) {
  var imgHtml = p.image
    ? '<img src="' + p.image + '" alt="' + p.name + '" class="prod-img">'
    : _placeholder(p.name);
  var badges = p.badges.map(function(b) {
    return '<span class="prod-badge">' + b + '</span>';
  }).join('');
  var specs = p.specs.map(function(s) {
    return '<div class="prod-spec-row"><span class="prod-spec-key">' + s.key + '</span><span class="prod-spec-val">' + s.value + '</span></div>';
  }).join('');
  var brochureBtn = p.brochure
    ? '<a href="' + p.brochure + '" target="_blank" class="prod-btn-outline">View Brochure</a>'
    : '';
  return '<div class="prod-card">' +
    imgHtml +
    '<div class="prod-body">' +
    '<span class="prod-cat-tag">' + p.category + '</span>' +
    '<div class="prod-name">' + p.name + '</div>' +
    '<p class="prod-desc">' + p.description + '</p>' +
    '<div class="prod-badges">' + badges + '</div>' +
    '<div class="prod-specs">' + specs + '</div>' +
    '<div class="prod-actions">' +
    '<a href="contact.html" class="prod-btn-primary">Request Quote</a>' +
    brochureBtn +
    '</div></div></div>';
}

function renderProductCatalog() {
  DB.categories.forEach(function(cat) {
    var el = document.querySelector('#cat-' + cat.id + ' .products-grid');
    if (!el) return;
    el.innerHTML = cat.products.map(_buildProductCard).join('');
  });
}

/* ── AUTO-INIT ── */
document.addEventListener('DOMContentLoaded', function() {
  renderClients();
  renderTestimonials();
  renderProjects();
  renderMissionVision();
  renderProductCatalog();
});
