# SSECKA IT Solutions — Proposal for Gleamair Enterprises

Formal technical proposal covering the modernisation of the Gleamair Enterprises website.
Ref. `SSECKA-GLM-2026-001`, revision 1.0.

Nothing in this folder is part of the published site. It is not linked from any page and is not
listed in `sitemap.xml`.

## Files

| File | Purpose |
| --- | --- |
| `SSECKA-Proposal-Gleamair-Enterprises.pdf` | The deliverable — 19 pages, A4 |
| `ssecka-gleamair-proposal.html` | Source document; edit this, not the PDF |
| `build.py` | Renders the source to PDF and stamps the running footer |

## Rebuilding

From the repository root:

```
pip install pypdf reportlab
python3 docs/proposal/build.py
```

Headless Chromium renders `ssecka-gleamair-proposal.html` to A4, then `reportlab` draws the
running footer (rule, document reference, page *x* of *y*) onto every page except the cover and
`pypdf` merges it in. `build.py` looks for Chromium in a short list of locations; add yours to
`CHROME_CANDIDATES` if it is not found.

## Editing notes

- Page geometry lives in the `@page` rule at the top of the HTML. The footer overlay in
  `build.py` uses the same 18 mm side margin, so change both together.
- Each numbered section opens a new page via `.sheet`; `.subsheet` does the same within a section.
- The layout is tuned to avoid near-empty spill pages. After any change to the prose or tables,
  rebuild and check the page count and the last line of each page before issuing the document.
- Every figure quoted in the proposal is recorded in Appendix A with the method used to measure
  it, so the numbers can be re-derived from the repository if the site changes.
