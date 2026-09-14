# JEVIS — project page

Single-page site for **JEVIS: Joint Entropy Estimation in 3DGS via Visibility Field for
Long-Horizon and Multi-Agent Active Mapping**. Static, dependency-free, ready for GitHub Pages.

**Start here → [`PLACEHOLDERS.md`](PLACEHOLDERS.md)** — the slot map. It lists every
media file to drop in, with its exact filename, aspect ratio and what belongs there.

---

## Layout

```
01 Overview        TL;DR + teaser figure
02 Active Mapping  ← the GIFs (room-heavy: 1 hero + 6 rooms + 3 multi-agent + 3 space)
03 Insights        why joint entropy, in three beats
04 Abstract
05 Method          pipeline figure, 3 steps, 2 equations, the algorithm, multi-agent
06 Uncertainty     ← the entropy/RGB strips (room-heavy: 3 indoor + 1 space)
07 Results         stat tiles, interactive radar, AUSE bars, qualitative figures
08 BibTeX
```

Scroll-spy nav: a floating **Contents** card at ≥1560px, a sticky top bar below that.

## Adding media

Drop a correctly-named file into `static/gifs/` or `figs/` and reload. The page probes
each slot and swaps the dashed placeholder for the real thing automatically — no HTML
editing. Filenames are in `PLACEHOLDERS.md`.

## Editing the numbers

`data/results.json` is the single source of truth — all 40 measurements from Tab. I/II/III.
After any edit:

```bash
python3 tools/make_charts.py
```

This regenerates the interactive chart's data (`static/js/results-data.js`), the on-page
results tables, and all 11 static radar SVGs + the AUSE bars in `figs/charts/`.

## Files

```
index.html              the page
data/results.json       all result numbers  ← edit here
tools/make_charts.py    regenerates every chart from that JSON
static/css/style.css    stylesheet
static/js/main.js       slot loader, radar chart, tables, nav
static/js/results-data.js   GENERATED — do not edit
static/vendor/          Chart.js + KaTeX (vendored, no CDN)
static/fonts/           Inter, Space Grotesk, JetBrains Mono (woff2)
figs/charts/            generated radar + AUSE charts (SVG & PNG)
figs/                   ← your figures and entropy strips go here
static/gifs/            ← your active-mapping GIFs go here
```

## Local preview

```bash
python3 -m http.server 8000    # then open http://localhost:8000
```

Serve over HTTP, not `file://`.

## Notes

- Verified at 1440px and 390px: no horizontal overflow, no console errors.
- Colours are checked for colourblind separation — JEVIS blue, GAVIS orange, MAGICIAN
  aqua and COVER violet are distinguishable under deuteranopia/tritanopia; the three
  weakest baselines are deliberately recessive grey and separated by line style.
- No external network requests at runtime. Everything is vendored.
