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
    },
    {
      id: "sg-eco-industries",
      name: "SG Eco Industries Inc",
      logo: "assets/images/other/otherbusinesses/SG Eco Logo.webp"
    }
  ],
  testimonials: [
    {
      id: "t1",
      nameDisplay: "A******* L*****",
      clientType: "Residential Client",
      projectType: "Roof Ventilation",
      rating: 5,
      quote: "Everything from customer engagement, delivery, installation, and payment was great!"
    },
    {
      id: "t2",
      nameDisplay: "Villa Escudero Plantation & Resort Inc.",
      clientType: "Resort Client",
      projectType: "Roof Ventilation",
      rating: 5,
      quote: "Very satisfied with product quality, installation service, customer support, and delivery timeliness. Highly likely to recommend Gleamair Enterprises to others."
    },
    {
      id: "t3",
      nameDisplay: "L****** S*******",
      clientType: "Residential Client",
      projectType: "Sky Tunnel Installation",
      rating: 5,
      quote: "The sky tunnel installation brought so much natural daylight into our home. Fantastic and efficient service from the entire team!"
    },
    {
      id: "t4",
      nameDisplay: "J***** D**** C***",
      clientType: "Residential Client",
      projectType: "Roof Access Hatchway",
      rating: 5,
      quote: "Highly satisfied with the roof access hatch installation. It feels very secure, safe, and the workmanship is exactly what we needed."
    },
    {
      id: "t5",
      nameDisplay: "A*** W*****",
      clientType: "Professional Client",
      projectType: "Roof Access Hatchway",
      rating: 5,
      quote: "I always trust Gleamair for safe building access solutions in my architectural projects. The hatchway installation was strictly up to code and perfectly executed."
    },
    {
      id: "t6",
      nameDisplay: "R****** S*****",
      clientType: "Residential Client",
      projectType: "Access Ladder Installation",
      rating: 5,
      quote: "The access ladder installation was done safely and efficiently. The crew was very professional and delivered a sturdy, high-quality final product."
    },
    {
      id: "t7",
      nameDisplay: "G***** C*******",
      clientType: "Residential Client",
      projectType: "Aircon Installation",
      rating: 5,
      quote: "Fast and reliable aircon installation. The technicians were very professional, polite, and left the area spotless!"
    },
    {
      id: "t8",
      nameDisplay: "J***** P****",
      clientType: "Residential Client",
      projectType: "Aircon & Roof Ventilation",
      rating: 5,
      quote: "Getting both our aircon and roof vent sorted by Gleamair was the best decision. Our home feels so much cooler and the airflow is incredible."
    },
    {
      id: "t9",
      nameDisplay: "B*** M*** M****",
      clientType: "Residential Client",
      projectType: "Aircon Services",
      rating: 5,
      quote: "Excellent aircon servicing. The team arrived on time and made sure our cooling unit was running perfectly before they left."
    },
    {
      id: "t10",
      nameDisplay: "J*** I** L**",
      clientType: "Residential Client",
      projectType: "Aircon Services",
      rating: 5,
      quote: "Highly recommend Gleamair for any residential aircon needs. The entire process from quotation to setup was completely smooth and hassle-free."
    },
    {
      id: "t11",
      nameDisplay: "L*** R****",
      clientType: "Residential Client",
      projectType: "Solar Lighting Project",
      rating: 5,
      quote: "The solar lights installed by Gleamair are fantastic. It's great to have our outdoor areas brightly illuminated without worrying about the electric bill."
    },
    {
      id: "t12",
      nameDisplay: "M***** B*********",
      clientType: "Residential Client",
      projectType: "Solar Lighting & Aircon Installation",
      rating: 5,
      quote: "Great experience with Gleamair! They handled both our new aircon setup and solar lighting perfectly. Fantastic customer support from start to finish."
    }
  ],
  projects: [
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
      label: "Newbridge Bacolod",
      folder: "Newbridge Bacolod",
      images: [
        "assets/images/client-photos/Newbridge Bacolod/Copy_of_IMG_1883.jpg"
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
    },
    {
      id: "sg-eco-industries",
      label: "SG Eco Industries Inc",
      folder: "SG Eco Industries Inc",
      images: [
        "assets/images/client-photos/SG Eco Industries Inc/Copy_of_IMG_1915.jpg"
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
        },
        {
          id: "solar-lights",
          name: "Solar Lights",
          category: "Lighting Solutions",
          image: "assets/images/products/Solar_Light.jpg",
          description: "Standalone and integrated solar lighting solutions for pathways, perimeters, and outdoor work areas. Designed for dependable night illumination with low operating cost.",
          badges: [
            "Solar Powered",
            "Outdoor Rated",
            "Low Maintenance"
          ],
          specs: [
            {
              key: "Applications",
              value: "Perimeter, pathways, utility areas"
            },
            {
              key: "Power Source",
              value: "Solar panel + battery"
            },
            {
              key: "Mounting",
              value: "Pole / wall / bracket"
            },
            {
              key: "Operation",
              value: "Automatic dusk-to-dawn"
            }
          ],
          brochure: null
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
              key: "Capacity GVW300 @ 12km/h",
              value: "480 L/s / 1,017 CFM"
            },
            {
              key: "Capacity GVW600 @ 12km/h",
              value: "1,104 L/s / 2,339 CFM"
            },
            {
              key: "Capacity GVW900 @ 12km/h",
              value: "2,700 L/s / 5,721 CFM"
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
              key: "Capacity @ 12km/h",
              value: "240 L/s / 508 CFM"
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
              key: "Capacity @ 12km/h",
              value: "480 L/s / 1,017 CFM"
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
              key: "Capacity @ 12km/h",
              value: "420 L/s / 890 CFM"
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
        },
        {
          id: "ducting-kits",
          name: "Ducting Kits",
          category: "Ventilation Solutions",
          image: "assets/images/products/Ducting_Kits.jpg",
          description: "Complete ducting kits to route and improve extraction flow from roof and attic ventilation systems. Suitable for retrofit and new builds.",
          badges: [
            "Complete Kit",
            "Retrofit Ready",
            "Corrosion Resistant"
          ],
          specs: [
            {
              key: "Use Case",
              value: "Attic and roof ventilation"
            },
            {
              key: "Components",
              value: "Ducts, clamps, connectors"
            },
            {
              key: "Compatibility",
              value: "Multiple vent models"
            },
            {
              key: "Installation",
              value: "Indoor / roof cavity"
            }
          ],
          brochure: null
        },
        {
          id: "under-eave-vents",
          name: "Under Eave Vents",
          category: "Ventilation Solutions",
          image: "assets/images/products/Under_Eave_Vents.png",
          description: "Fresh-air inlet vents installed under roof eaves to support proper air replacement for attic and roof ventilation systems.",
          badges: [
            "Air Inlet",
            "Passive Ventilation",
            "Attic Support"
          ],
          specs: [
            {
              key: "Function",
              value: "Intake air for attic systems"
            },
            {
              key: "Placement",
              value: "Under eaves / soffits"
            },
            {
              key: "Material",
              value: "Weather-resistant polymer/metal"
            },
            {
              key: "Integration",
              value: "Works with wind and solar vents"
            }
          ],
          brochure: null
        },
        {
          id: "wall-louvres",
          name: "Wall Louvres",
          category: "Ventilation Solutions",
          image: "assets/images/products/Wall_Louvres.jpg",
          description: "Wall louvre assemblies for controlled intake and exhaust while helping shield interiors from direct rain ingress.",
          badges: [
            "Intake / Exhaust",
            "Weather Shield",
            "Commercial Grade"
          ],
          specs: [
            {
              key: "Use",
              value: "Natural or mechanical ventilation"
            },
            {
              key: "Mounting",
              value: "Wall-mounted"
            },
            {
              key: "Blade Profile",
              value: "Rain-deflecting"
            },
            {
              key: "Available Sizes",
              value: "Customizable by opening"
            }
          ],
          brochure: null
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
            "24/7 Open Channels",
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
              value: "Our communication channels are 24/7 open"
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
              value: "Residential or Industrial"
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
  // Grid version (products.html)
  var grid = document.getElementById('testimonials-grid');
  if (grid) {
    grid.innerHTML = DB.testimonials.map(function(t) {
      return '<div class="testimonial-card">' +
        '<div class="testimonial-rating">' + _stars(t.rating) + '</div>' +
        '<p class="testimonial-quote">\u201c' + t.quote + '\u201d</p>' +
        '<div class="testimonial-name">' + t.nameDisplay + '</div>' +
        '<div class="testimonial-title">' + t.clientType + ' \u00a0\u2022\u00a0 ' + t.projectType + '</div>' +
        '</div>';
    }).join('');
  }
  // Marquee version (index.html)
  var rowTop = document.getElementById('testi-row-top');
  var rowBot = document.getElementById('testi-row-bot');
  if (rowTop && rowBot) {
    function makeCard(t) {
      return '<div class="testi-card">' +
        '<div class="testi-stars">' + _stars(t.rating) + '</div>' +
        '<p class="testi-quote">\u201c' + t.quote + '\u201d</p>' +
        '<div class="testi-name">' + t.nameDisplay + '</div>' +
        '<div class="testi-type">' + t.clientType + ' \u00a0\u2022\u00a0 ' + t.projectType + '</div>' +
        '</div>';
    }
    var all = DB.testimonials;
    var half = Math.ceil(all.length / 2);
    var topCards = all.slice(0, half);
    var botCards = all.slice(half).length ? all.slice(half) : topCards;
    var topHtml = '', botHtml = '';
    for (var i = 0; i < 4; i++) {
      topCards.forEach(function(t) { topHtml += makeCard(t); });
      botCards.forEach(function(t) { botHtml += makeCard(t); });
    }
    rowTop.innerHTML = topHtml;
    rowBot.innerHTML = botHtml;
  }
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
    ? '<a href="' + p.brochure + '" target="_blank" class="prod-btn-outline" onclick="event.stopPropagation()">View Brochure</a>'
    : '';
  var hasModal = !!document.getElementById('spec-modal');
  return '<div class="prod-card"' + (hasModal ? ' role="button" tabindex="0" onclick="openProductSpecsModal(\'' + p.id + '\')" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();openProductSpecsModal(\'' + p.id + '\');}"' : '') + '>' +
    imgHtml +
    '<div class="prod-body">' +
    '<span class="prod-cat-tag">' + p.category + '</span>' +
    '<div class="prod-name">' + p.name + '</div>' +
    '<p class="prod-desc">' + p.description + '</p>' +
    '<div class="prod-badges">' + badges + '</div>' +
    '<div class="prod-specs">' + specs + '</div>' +
    '<div class="prod-actions">' +
    '<a href="contact.html" class="prod-btn-primary" onclick="event.stopPropagation()">Request Quote</a>' +
    brochureBtn +
    '</div></div></div>';
}

var BROCHURE_LIBRARY = {
  'sky-tunnel-residential': ['assets/brochures/Sky-Tunnel-Brochure-Residential.pdf'],
  'sky-tunnel-commercial': ['assets/brochures/Sky-Tunnel-Brochure-Commercial.pdf'],
  'gvs-15w': ['assets/brochures/GVS 15W.pdf'],
  'gvs-30w': ['assets/brochures/GVS-30W Flyer.pdf'],
  'whirlwind-plus': ['assets/brochures/Whirlwind-Plus-Flyer.pdf'],
  'industrial-exhaust-fan': ['assets/brochures/Copy of GA INDUSTRIAL WALL MOUNTED EXHAUST FAN.pdf'],
  'roof-hatch': ['assets/brochures/Access_Hatches.pdf']
};

function _inferUseCase(p) {
  var preferredKeys = ['Application', 'Use Case', 'Service Type', 'Coverage'];
  for (var i = 0; i < preferredKeys.length; i++) {
    var found = p.specs.find(function(s) { return s.key === preferredKeys[i]; });
    if (found) return found.value;
  }
  return p.category;
}

function _buildBrochureLinks(p) {
  var list = [];
  if (p.brochure) list.push(p.brochure);
  if (BROCHURE_LIBRARY[p.id]) {
    BROCHURE_LIBRARY[p.id].forEach(function(path) {
      if (list.indexOf(path) === -1) list.push(path);
    });
  }
  if (!list.length) {
    return '<p class="spec-modal-note">No dedicated brochure file is currently linked for this product. Contact our team for full technical documentation.</p>';
  }
  return '<div class="spec-modal-list">' + list.map(function(path) {
    var name = path.split('/').pop();
    return '<a href="' + path + '" target="_blank" class="prod-btn-outline">Open ' + name + '</a>';
  }).join('') + '</div>';
}

function renderProductCatalog() {
  DB.categories.forEach(function(cat) {
    var el = document.querySelector('#cat-' + cat.id + ' .products-grid');
    if (!el) return;
    el.innerHTML = cat.products.map(_buildProductCard).join('');
  });
}

function _findProductById(productId) {
  for (var i = 0; i < DB.categories.length; i++) {
    for (var j = 0; j < DB.categories[i].products.length; j++) {
      if (DB.categories[i].products[j].id === productId) return DB.categories[i].products[j];
    }
  }
  return null;
}

function openProductSpecsModal(productId) {
  var modal = document.getElementById('spec-modal');
  var body = document.getElementById('spec-modal-body');
  if (!modal || !body) return;
  var p = _findProductById(productId);
  if (!p) return;

  var imageHtml = p.image
    ? '<img src="' + p.image + '" alt="' + p.name + '" class="spec-modal-img">'
    : '';

  var badgeHtml = p.badges.map(function(b) {
    return '<span class="prod-badge">' + b + '</span>';
  }).join('');

  var specRows = p.specs.map(function(s) {
    return '<div class="prod-spec-row"><span class="prod-spec-key">' + s.key + '</span><span class="prod-spec-val">' + s.value + '</span></div>';
  }).join('');

  var brochureHtml = _buildBrochureLinks(p);
  var useCase = _inferUseCase(p);
  var quickFacts =
    '<div class="spec-modal-facts">' +
      '<div class="spec-modal-fact"><span class="spec-modal-fact-k">Category</span><span class="spec-modal-fact-v">' + p.category + '</span></div>' +
      '<div class="spec-modal-fact"><span class="spec-modal-fact-k">Primary Use</span><span class="spec-modal-fact-v">' + useCase + '</span></div>' +
      '<div class="spec-modal-fact"><span class="spec-modal-fact-k">Model Code</span><span class="spec-modal-fact-v">' + p.id + '</span></div>' +
      '<div class="spec-modal-fact"><span class="spec-modal-fact-k">Spec Lines</span><span class="spec-modal-fact-v">' + p.specs.length + '</span></div>' +
    '</div>';

  body.innerHTML =
    imageHtml +
    '<div class="prod-cat-tag" style="margin-top:1rem;">' + p.category + '</div>' +
    '<div class="prod-name" style="margin-top:0.6rem;">' + p.name + '</div>' +
    '<p class="prod-desc" style="margin-top:0.5rem;">' + p.description + '</p>' +
    '<div class="prod-badges" style="margin-bottom:1rem;">' + badgeHtml + '</div>' +
    quickFacts +
    '<div class="spec-modal-section-title">Detailed Specifications</div>' +
    '<div class="prod-specs">' + specRows + '</div>' +
    '<div class="spec-modal-section-title">Brochure Documents</div>' +
    '<p class="spec-modal-note">Full dimensional drawings and expanded technical information are available in the brochure files below.</p>' +
    brochureHtml;

  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeProductSpecsModal() {
  var modal = document.getElementById('spec-modal');
  if (!modal) return;
  modal.classList.remove('open');
  document.body.style.overflow = '';
}

/* ── AUTO-INIT ── */
document.addEventListener('DOMContentLoaded', function() {
  renderClients();
  renderTestimonials();
  renderProjects();
  renderMissionVision();
  renderProductCatalog();
});
