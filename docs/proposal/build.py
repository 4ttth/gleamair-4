#!/usr/bin/env python3
"""
build.py — renders the SSECKA IT Solutions proposal to PDF.

Two stages:
  1. Headless Chromium renders ssecka-gleamair-proposal.html to an unpaginated PDF.
  2. reportlab draws a running footer (rule, document reference, page x of y) onto
     every page except the cover, and pypdf merges the overlay in.

Usage (from the repository root):
    python3 docs/proposal/build.py
"""

import io
import os
import shutil
import subprocess
import sys

from pypdf import PdfReader, PdfWriter
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "ssecka-gleamair-proposal.html")
OUT = os.path.join(HERE, "SSECKA-Proposal-Gleamair-Enterprises.pdf")

DOC_REF = "SSECKA-GLM-2026-001  ·  Website Modernisation & Digital Enablement Programme"
FIRM = "SSECKA IT Solutions"
CONFIDENTIAL = "Confidential"

RULE = HexColor("#ccd4de")
MUTED = HexColor("#5f6d80")
INK = HexColor("#16233a")

CHROME_CANDIDATES = [
    "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
    "/opt/pw-browsers/chromium/chrome-linux/chrome",
    shutil.which("chromium"),
    shutil.which("chromium-browser"),
    shutil.which("google-chrome"),
]


def find_chrome():
    for path in CHROME_CANDIDATES:
        if path and os.path.exists(path):
            return path
    sys.exit("No Chromium binary found; set one in CHROME_CANDIDATES.")


def render(raw_pdf):
    subprocess.run(
        [
            find_chrome(),
            "--headless",
            "--disable-gpu",
            "--no-sandbox",
            "--no-pdf-header-footer",
            "--run-all-compositor-stages-before-draw",
            "--virtual-time-budget=10000",
            f"--print-to-pdf={raw_pdf}",
            SRC,
        ],
        check=True,
        capture_output=True,
    )


def footer_overlay(page_no, total):
    """One page of overlay: hairline rule, firm mark, and page numbering."""
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    width, _ = A4
    margin = 18 * 2.8346457  # 18mm, matching the @page margin in the stylesheet
    y = 13 * 2.8346457

    c.setStrokeColor(RULE)
    c.setLineWidth(0.5)
    c.line(margin, y + 9, width - margin, y + 9)

    mark = FIRM.upper()
    c.setFont("Helvetica-Bold", 6.6)
    c.setFillColor(INK)
    c.drawString(margin, y, mark)

    c.setFont("Helvetica", 6.6)
    c.setFillColor(MUTED)
    gap = c.stringWidth(mark, "Helvetica-Bold", 6.6) + 6
    c.drawString(margin + gap, y, "·  " + DOC_REF + "  ·  " + CONFIDENTIAL)

    c.setFont("Helvetica-Bold", 6.6)
    c.setFillColor(INK)
    c.drawRightString(width - margin, y, f"Page {page_no} of {total}")

    c.save()
    buf.seek(0)
    return PdfReader(buf).pages[0]


def main():
    raw_pdf = os.path.join(HERE, "_raw.pdf")
    render(raw_pdf)

    reader = PdfReader(raw_pdf)
    total = len(reader.pages)
    writer = PdfWriter()

    for index, page in enumerate(reader.pages):
        if index > 0:  # the cover carries no running footer
            page.merge_page(footer_overlay(index + 1, total))
        writer.add_page(page)

    writer.add_metadata(
        {
            "/Title": "Website Modernisation & Digital Enablement Programme "
                      "— Technical Proposal for Gleamair Enterprises",
            "/Author": "SSECKA IT Solutions",
            "/Subject": "Technical proposal, ref. SSECKA-GLM-2026-001, revision 1.0",
            "/Keywords": "proposal, Gleamair Enterprises, website modernisation, "
                         "performance, SSECKA IT Solutions",
            "/Creator": "SSECKA IT Solutions",
        }
    )

    with open(OUT, "wb") as fh:
        writer.write(fh)

    os.remove(raw_pdf)
    print(f"{OUT}  ({total} pages, {os.path.getsize(OUT) / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
