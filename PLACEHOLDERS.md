# Slot map — what goes where

Every media slot on the page is a **self-resolving placeholder**. The page probes
each `data-src`; the moment a file with that exact name exists, the dashed marker
disappears and your media takes its place. You never touch the HTML to add media —
**just drop the file in with the right name.**

Slots marked *(optional)* can be deleted: remove the whole `<figure class="slot">…</figure>`
block from `index.html`.

---

## A. Active mapping GIFs — `static/gifs/`

Section 02, the top of the page. JEVIS-only rollouts: reconstruction growing, trajectory
drawing itself in, star at start, frustum at the current pose.

| File | Slot | Aspect | Notes |
|---|---|---|---|
| `am_room_featured.gif` | **Hero rollout** | 16:9 | The one clip that carries the page. Most legible room scene. ~1280×720. |
| `am_room_01.gif` | Room 1 | 4:3 | Gibson |
| `am_room_02.gif` | Room 2 | 4:3 | Gibson |
| `am_room_03.gif` | Room 3 | 4:3 | HM3D-small |
| `am_room_04.gif` | Room 4 | 4:3 | HM3D-small |
| `am_room_05.gif` | Room 5 | 4:3 | HM3D-large (20-step) |
| `am_room_06.gif` | Room 6 | 4:3 | HM3D-large — the long-horizon showcase |
| `am_multi_room_01.gif` | Multi-agent 1 | 4:3 | 3 agents, one colour each |
| `am_multi_room_02.gif` | Multi-agent 2 | 4:3 | HM3D-small |
| `am_multi_room_03.gif` | Multi-agent 3 | 4:3 | HM3D-large — biggest multi-agent margin |
| `am_space_01.gif` | Space 1 | 1:1 | Spacecraft orbit |
| `am_space_02.gif` | Space 2 | 1:1 | Second target |
| `am_space_03.gif` | Space 3 | 1:1 | The one indoor space scene |

**MP4 works too.** The loader detects `.mp4` / `.webm` and inserts an autoplaying muted
loop instead of an `<img>` — just change the `data-src` extension in `index.html`.
For anything over ~8 MB, MP4 is strongly preferred: a 20 MB GIF re-downloads on every
visit, an MP4 of the same clip is usually 10–20× smaller.

```bash
# GIF → MP4 (same visual, far smaller)
ffmpeg -i in.gif -movflags faststart -pix_fmt yuv420p \
       -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" out.mp4
```

Scene names and dataset labels are placeholder text in `index.html` — search for
`Scene 1`, `Scene A`, `Spacecraft A` etc. and replace with the real names.

---

## B. Figures — `figs/`

| File | Slot | Source | Notes |
|---|---|---|---|
| `teaser.png` | Section 01 teaser | page 2 of `jevis_figs-cropped.pdf` | The overlap/double-counting figure. ~2:1, export ≥2000px wide. |
| `method.png` | Section 05 pipeline | page 1 of `jevis_figs-cropped.pdf` | Mapping loop + scoring loop. ~3:1, export ≥2400px wide. |
| `multiagent.png` | Section 05 *(optional)* | — | Visual for Alg. 2 if you want one. |
| `qual_am_room.png` | Section 07 qualitative | `8_12_am.png` | Gibson single-agent + HM3D-small multi-agent. |
| `qual_am_space.png` | Section 07 *(optional)* | — | Space equivalent. |
| `social_card.png` | OG / Twitter card | — | 1200×630. Not a visible slot — it's the link preview image. |

---

## C. Entropy / RGB strips — `figs/`

Section 06. Six columns: **Pose dist. → GT RGB → Pred. RGB → GAVIS → JEVIS → GT visibility**,
one row per pose along the candidate trajectory. The column key and the viridis colorbar
are already drawn in HTML above the strips — so crop the column headers and the colorbar
**out** of the image if you like, or leave them in; both read fine.

| File | Slot | Source | Notes |
|---|---|---|---|
| `entropy_room_featured.png` | **Featured indoor** | `barb_entropy.png` | Source is 4168×1789 — downscale to ~2000px wide. |
| `entropy_room_02.png` | Indoor 2 | — | Ideally a trajectory that doubles back. |
| `entropy_room_03.png` | Indoor 3 *(optional)* | — | HM3D-large. |
| `entropy_space.png` | Space | `space_entropy.png` | Orbit revisiting an earlier viewpoint. |

Captions under each strip are placeholder text — search `Caption: what to look at`.

---

## D. Charts — already generated ✅

Nothing to add. `figs/charts/` holds 11 static radar charts and the AUSE bar chart
(SVG + PNG), and the page also renders an **interactive** radar with Single/Multi and
per-dataset toggles.

All of it comes from one file: **`data/results.json`**.

```bash
# after editing any number in data/results.json
python3 tools/make_charts.py
```

That regenerates `static/js/results-data.js` (the interactive chart + the on-page tables)
**and** every SVG/PNG in `figs/charts/`. Never edit `results-data.js` by hand.

Static exports available for slides / supplementary:

```
figs/charts/radar_single_avg.svg      radar_multi_avg.svg
figs/charts/radar_single_gibson.svg   radar_multi_gibson.svg
figs/charts/radar_single_hm3d_small.svg   radar_multi_hm3d_small.svg
figs/charts/radar_single_hm3d_large.svg   radar_multi_hm3d_large.svg
figs/charts/radar_single_space.svg    radar_multi_space.svg
figs/charts/ause_bars.svg
```

---

## E. Text placeholders to replace

Search `index.html` for these:

| Marker | Where | What |
|---|---|---|
| `href="#"` | Hero buttons | Paper / arXiv / Code / Video URLs (4 of them) |
| `TODO` | Hero | Paper ID, and the `TODO` chips on the buttons |
| `Anonymous Authors` | Hero | Author block at camera-ready |
| `anonymous2026jevis` | BibTeX | Real citation |
| `Scene 1` … `Scene 6` | Section 02 | Real scene names |
| `Scene A` / `B` / `C` | Section 02 | Real multi-agent scene names |
| `Spacecraft A` / `B` / `Station interior` | Section 02 | Real space scene names |
| `Caption: what to look at` | Section 06 | Per-strip captions |
| `Caption TODO` | Section 07 | Space reconstruction caption |

The four hero buttons carry a small `TODO` chip so an unfinished link is obvious at a
glance — delete the `<span class="todo">TODO</span>` when you add the real URL.

---

## F. Deploying to GitHub Pages

```bash
cd jevis-site
git init && git add -A
git commit -m "JEVIS project page"
git branch -M main
git remote add origin https://github.com/<user>/<repo>.git
git push -u origin main
```

Then **Settings → Pages → Source: Deploy from a branch → `main` / `(root)`**.
Live at `https://<user>.github.io/<repo>/` in a minute or two.

`.nojekyll` is already present — it stops GitHub from ignoring paths and speeds up the build.

**Preview locally before pushing:**

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

Open it over `http://`, not `file://` — the slot loader and the fonts need a real server.

---

## G. What's vendored (no CDN, nothing to install)

Everything the page needs is committed, so it works offline and never breaks when a CDN
does: Chart.js 4.4.7 (`static/vendor/`), KaTeX 0.16.21 + its fonts
(`static/vendor/katex/`), and Inter / Space Grotesk / JetBrains Mono woff2 subsets
(`static/fonts/`). Total ≈ 1 MB.

If KaTeX or Chart.js fail to load for any reason, the page still works — equations fall
back to readable plain-text and the charts simply don't draw; nothing else breaks.
