"""
build-psgc.py
─────────────────────────────────────────────────────────────────────────────
Builds the bundled Philippine address dataset used by the registration form.

Source: PSA PSGC data (region / province / city / barangay), fetched once and
cached under tools/psgc-src/. Output is written to assets/data/psgc/ as:

    provinces.json        small index: [{code, name, region}]  (~4 KB)
    p/<province_code>.json  cities + barangays for ONE province (~30-120 KB)

The registration form loads provinces.json up front and lazy-loads a single
province file when the user picks a province, so a customer downloads roughly
50 KB instead of the full 4.8 MB / 42,000-barangay dataset.

Usage (from the repo root):
    python tools/build-psgc.py
─────────────────────────────────────────────────────────────────────────────
"""

import json, os, re, sys, urllib.request

ROOT    = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = os.path.join(ROOT, "tools", "psgc-src")
OUT_DIR = os.path.join(ROOT, "assets", "data", "psgc")

BASE = "https://raw.githubusercontent.com/isaacdarcilla/philippine-addresses/main"
FILES = ["region.json", "province.json", "city.json", "barangay.json"]

# PSGC models Metro Manila as four "districts" plus the City of Manila, and
# ships two rows for code 1339. Give them names a customer will recognise.
NCR_NAMES = {
    "1339": "Metro Manila — City of Manila",
    "1374": "Metro Manila — 2nd District",
    "1375": "Metro Manila — 3rd District",
    "1376": "Metro Manila — 4th District",
}

LOWER_WORDS = {"of", "and", "the", "in", "del", "de", "las", "los", "sa", "ng"}

# Barangay names carry roman numerals ("Tondo I / II", "Poblacion IV") that the
# source data ships as "Ii" / "Iv". Match only the numerals we actually see so
# ordinary words are never touched.
ROMAN = re.compile(r"^(?:i{1,3}|iv|vi{0,3}|ix|xi{0,3}|xiv|xv)$", re.IGNORECASE)


def fetch():
    os.makedirs(SRC_DIR, exist_ok=True)
    for name in FILES:
        path = os.path.join(SRC_DIR, name)
        if os.path.exists(path) and os.path.getsize(path) > 0:
            continue
        print(f"  downloading {name} ...")
        urllib.request.urlretrieve(f"{BASE}/{name}", path)


def load(name):
    with open(os.path.join(SRC_DIR, name), encoding="utf-8") as f:
        return json.load(f)


def titlecase(value):
    """Tidy PSGC's SHOUTY/inconsistent casing without mangling '(Pob.)' etc."""
    words = value.split(" ")
    out = []
    for i, word in enumerate(words):
        low = word.lower()
        if low == "ncr":
            out.append("NCR")
        elif ROMAN.match(word):
            out.append(word.upper())
        elif i > 0 and low.strip(",") in LOWER_WORDS:
            out.append(low)
        else:
            out.append(word)
    return " ".join(out)


def main():
    print("Fetching PSGC source data ...")
    fetch()

    regions    = {r["region_code"]: r["region_name"] for r in load("region.json")}
    provinces  = load("province.json")
    cities     = load("city.json")
    barangays  = load("barangay.json")

    # Deduplicate provinces by code (PSGC ships 1339 twice) and rename NCR rows.
    by_code = {}
    for p in provinces:
        code = p["province_code"]
        name = NCR_NAMES.get(code) or titlecase(p["province_name"])
        # NCR_NAMES wins over whichever duplicate row we happen to see first.
        if code in by_code and code not in NCR_NAMES:
            continue
        by_code[code] = {
            "code": code,
            "name": name,
            "region": regions.get(p["region_code"], p["region_code"]),
        }

    # Bucket barangays by city so each city lookup is O(1).
    brgy_by_city = {}
    for b in barangays:
        brgy_by_city.setdefault(b["city_code"], []).append(
            {"code": b["brgy_code"], "name": titlecase(b["brgy_name"])}
        )

    cities_by_prov = {}
    for c in cities:
        entry = {
            "code": c["city_code"],
            "name": titlecase(c["city_name"]),
            "barangays": sorted(
                brgy_by_city.get(c["city_code"], []), key=lambda x: x["name"]
            ),
        }
        cities_by_prov.setdefault(c["province_code"], []).append(entry)

    os.makedirs(os.path.join(OUT_DIR, "p"), exist_ok=True)

    index, orphans, biggest = [], [], (0, "")
    for code, prov in sorted(by_code.items(), key=lambda kv: kv[1]["name"]):
        city_list = sorted(cities_by_prov.get(code, []), key=lambda x: x["name"])
        if not city_list:
            orphans.append(prov["name"])
            continue
        index.append(prov)
        path = os.path.join(OUT_DIR, "p", f"{code}.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump({**prov, "cities": city_list}, f, ensure_ascii=False, separators=(",", ":"))
        size = os.path.getsize(path)
        if size > biggest[0]:
            biggest = (size, prov["name"])

    with open(os.path.join(OUT_DIR, "provinces.json"), "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, separators=(",", ":"))

    total_brgy = sum(len(v) for v in brgy_by_city.values())
    print(f"\n  provinces written : {len(index)}")
    print(f"  cities            : {len(cities)}")
    print(f"  barangays         : {total_brgy}")
    print(f"  index size        : {os.path.getsize(os.path.join(OUT_DIR, 'provinces.json')) / 1024:.1f} KB")
    print(f"  largest province  : {biggest[1]} ({biggest[0] / 1024:.1f} KB)")
    if orphans:
        print(f"  WARNING skipped (no cities): {orphans}")
    print("\nDone.")


if __name__ == "__main__":
    sys.exit(main())
