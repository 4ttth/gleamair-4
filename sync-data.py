"""
sync-data.py
─────────────────────────────────────────────────────────────────────────────
Reads all JSON files from conf/db/ and regenerates the DB data block inside
assets/js/data-loader.js.

Usage (run from the gleamair-4 folder):
    python sync-data.py

Run this every time you edit any .json file in conf/db/.
─────────────────────────────────────────────────────────────────────────────
"""

import json, re, os, sys

ROOT       = os.path.dirname(os.path.abspath(__file__))
DB_DIR     = os.path.join(ROOT, "conf", "db")
LOADER     = os.path.join(ROOT, "assets", "js", "data-loader.js")
CALC_JS    = os.path.join(ROOT, "assets", "js", "calculator.js")
MARKER_START = "/* @@DATA_START@@ */"
MARKER_END   = "/* @@DATA_END@@ */"
CALC_START   = "/* @@CALC_START@@ */"
CALC_END     = "/* @@CALC_END@@ */"

def load(filename):
    path = os.path.join(DB_DIR, filename)
    with open(path, encoding="utf-8") as f:
        return json.load(f)

def to_js(obj, indent=2):
    """Convert a Python object to a pretty JS literal (not JSON — no quotes on keys)."""
    return _convert(obj, indent, 0)

def _convert(obj, indent, depth):
    pad  = " " * (indent * depth)
    pad1 = " " * (indent * (depth + 1))

    if obj is None:
        return "null"
    if isinstance(obj, bool):
        return "true" if obj else "false"
    if isinstance(obj, (int, float)):
        return str(obj)
    if isinstance(obj, str):
        escaped = obj.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")
        return '"' + escaped + '"'
    if isinstance(obj, list):
        if not obj:
            return "[]"
        items = [pad1 + _convert(v, indent, depth + 1) for v in obj]
        return "[\n" + ",\n".join(items) + "\n" + pad + "]"
    if isinstance(obj, dict):
        if not obj:
            return "{}"
        items = []
        for k, v in obj.items():
            items.append(pad1 + k + ": " + _convert(v, indent, depth + 1))
        return "{\n" + ",\n".join(items) + "\n" + pad + "}"
    return '"' + str(obj) + '"'

def build_data_block():
    mv      = load("mission-vision.json")
    clients = load("clients.json")
    testi   = load("testimonials.json")
    projs   = load("recent-projs.json")
    catalog = load("product-catalog.json")

    merged = {
        "clients":      clients["clients"],
        "testimonials": testi["testimonials"],
        "projects":     projs["projects"],
        "mission":      mv["mission"],
        "vision":       mv["vision"],
        "categories":   catalog["categories"]
    }

    lines = [MARKER_START, "", "var DB = " + to_js(merged, 2) + ";", "", MARKER_END]
    return "\n".join(lines)

def sync_calculator():
    calc = load("calculator.json")

    # Build JS object string
    lines = [CALC_START, "", "var CALC = " + to_js(calc, 2) + ";", "", CALC_END]
    new_block = "\n".join(lines)

    with open(CALC_JS, encoding="utf-8") as f:
        content = f.read()

    pattern = re.compile(
        re.escape(CALC_START) + r".*?" + re.escape(CALC_END),
        re.DOTALL
    )
    if pattern.search(content):
        updated = pattern.sub(new_block, content)
    else:
        updated = new_block + "\n\n" + content

    with open(CALC_JS, "w", encoding="utf-8") as f:
        f.write(updated)

    print("  OK conf/db/calculator.json")
    print("  -> assets/js/calculator.js updated")


def sync():
    with open(LOADER, encoding="utf-8") as f:
        content = f.read()

    pattern = re.compile(
        re.escape(MARKER_START) + r".*?" + re.escape(MARKER_END),
        re.DOTALL
    )

    new_block = build_data_block()

    if pattern.search(content):
        updated = pattern.sub(new_block, content)
    else:
        # Markers not found — prepend the block before the first renderer comment
        updated = content.replace(
            "/* \u2550\u2550\u2550 RENDERERS",
            new_block + "\n\n/* \u2550\u2550\u2550 RENDERERS"
        )

    with open(LOADER, "w", encoding="utf-8") as f:
        f.write(updated)

    print("Synced successfully:")
    for fname in ["mission-vision.json", "clients.json", "testimonials.json",
                  "recent-projs.json", "product-catalog.json"]:
        print("  OK conf/db/" + fname)
    print("  -> assets/js/data-loader.js updated")

if __name__ == "__main__":
    try:
        sync()
        sync_calculator()
    except FileNotFoundError as e:
        print("Error: " + str(e))
        sys.exit(1)
