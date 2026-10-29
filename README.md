# PLAN TAKEOFF v2.9.9

**Professional takeoff & estimating tool for landscapers and contractors** — made by Stephan Bluitt · Made in the USA 🇺🇸

Measure construction plans and real properties, get instant quantities for estimating. Runs entirely in the browser — one file, no install.

> 🔒 **Private tool.** The app requires a password to log in; all project data is stored in a private, access-controlled cloud — nothing is stored in this repository.

## What it does

- **PDF plans** — add one or several plan PDFs to a project, set the scale (presets, custom, or calibrate on a known dimension) and measure lengths and areas — any segment straight or curved, in the same measurement (drag the ◆ in the middle of a segment, or Alt/Option-click on the curve; exact arc math) — and counts directly on the drawing — in US units (LF, SF, CY) or metric (m, m², m³), switched in Settings, with metric 1:100-style scales. Scales per plan and per page, page arrows run through every plan (the page never changes by accident — arrow keys move around the plan), plans menu to switch, rename or remove, dark plan inversion. ⌘Z while drawing takes back the last point or curve.
- **Satellite measuring** — search any address or business (Esri geocoding built in; optional Google Places key for the same results as Google Maps), or paste coordinates / a Google Maps link, then measure real properties from satellite imagery: lengths and areas with straight or curved segments, counts. Includes historical imagery with season filter (leaf-off winter shots for tree work).
- **Categories & materials** — organize measurements into color-coded categories (24 colors plus any custom color) with sub-categories, material depth → automatic volumes (cubic yards or cubic metres), waste %, and notes. Hide any category or item, or everything at once (Hide all / Show all). Plan and map measurements are listed, totaled, copied and printed apart; the This page filter follows you between the plan and the map.
- **Outputs** — Save and Export buttons top right. Copy project measurements for estimating software, export CSV, print full reports with plan snapshots, and Export PDF of any plan (or all plans in one file): with *Include markups* on, every measurement is drawn on it — labels spread out so they never overlap, with leader lines on crowded plans — plus a takeoff summary page; with it off, the plans exactly as they came.
- **Projects** — everything saves to the cloud by itself (a few seconds after you stop, when you switch away, and every 3 minutes), with a Saved / Unsaved label next to the project name. Project versions: your named snapshots with notes, and autosaves (every 10 minutes of work and before big changes) listed apart, each showing its totals and what changed since; restore any of them. 60-step undo/redo.
- **Cloud** — log in and save projects (plan PDFs included) to a private cloud; search, open, rename or delete them from any computer. The app opens on your project list over a fresh, empty project. The password alone reconnects storage on any computer.

- **Material estimates (v2.5)** — give a category an estimate type and get the order list as you measure: bulk material by depth with presets (topsoil, mulch, gravel, crushed stone, sand, decomposed granite, road base, asphalt…) in cubic yards, tons and bags; concrete slabs and footings (CY, order amount, 40/60/80 lb bags, rebar, wire mesh, gravel base); pavers (pieces, pallets, base); sod (pallets, rolls); seed, fertilizer or lime (lb, bags); edging and fence pieces with posts; wall blocks (blocks, courses, caps, drain gravel); and any amount per counted item. Waste included; shows in the list, reports, copies, CSV and PDFs.
- **Units your way (v2.5)** — US lengths as decimal feet (5.5 LF), feet and inches (5'-6") or inches (66"), optionally with metric shown alongside (or US alongside metric); sizes can be typed any way — 4, 4in, 10cm, 3'6", 3 1/2 — including the calibrate length.
- **Curves button and auto-update (v2.9.9)** — a Curves on/off button in the tool bar (◆ handles on every edge); when a new version is published, an open tab shows "A new version is ready — Update now" (work is kept).
- **Drag to move the plan in any tool (v2.9.8)** — with Line / Area / Count a drag moves the plan (even mid-shape) and a click places a point; in Select a drag on a shape that isn't selected moves the plan, a click selects it.
- **New / Open in the top bar (v2.9.6)** — ＋ New and 📂 Open on the right, next to Save (v2.9.7).
- **Curves in any tool (v2.9.5)** — the ◆ of the selected line or area can be dragged with the Line / Area tools too, like corners.
- **Magnet (v2.9.2)** — off by default; Magnet button on the left, M key, right-click menu or Settings. Points snap onto the plan's own lines: line ends and crossings first, otherwise the nearest line (read from the PDF's line work; on scanned plans, the nearest dark line). Works while drawing, calibrating and dragging corners. Hold ⌘ / Ctrl to place a point freely. Holding Shift for a straight line wins over it (v2.9.4). Its ring is green (v2.9.3) — red is kept for real problems only.
- **Right-click fixed (v2.9.1)** — the right button never grabs the plan or starts a measurement; Mac Ctrl+click opens the menu; clicking away to close the menu does nothing else.
- **Easier drawing (v2.9)** — right-click anywhere for a menu (finish, take back a point, curve, add or delete a corner, rename, duplicate, hide, move to a category, tools, scale, export); corners can be dragged with any tool, no need to switch to Select; area edges can't cross (the preview turns red); points snap onto nearby corners (hold Alt to place freely) and clicking an area's first corner closes it; curve handles (◆) are off by default (⌒ Curve / U while drawing, or turn them on in Settings); the scroll wheel zooms the plan (Settings can switch it to moving), and the map zooms smoothly around the mouse like Google Maps; every measurement saves to the cloud within seconds; plans stay sharp while zooming and panning, and nearby pages are prepared ahead so they open at once; labelled tools with Scale and Help buttons, a tip for the tool in use and a getting-started list.
- **Safer PDF opening (v2.8)** — plan PDFs open with pdf.js script evaluation turned off, so a crafted PDF can't run code in the app (CVE-2024-4367).
- **Readable PDFs on crowded plans (v2.7)** — numbered tags never overlap: each stays on its shape where it covers nothing else, the rest fan out from the crowd into clear paper with leader lines that don't cross, and very dense sheets get slightly smaller tags. Also for locked/secured plans, with a key page after each sheet.
- **Collapse all / show a whole category (v2.6)** — one click folds or unfolds every category in the list; a category's 👁 hides it or brings back everything inside it, including items hidden one by one.
- **Labels on screen (v2.5)** — measurement labels on the plan are spread out together so they never sit on top of each other, with a thin leader line when one has to move.
- **Cleaner marked-up PDFs (v2.5)** — crowded sheets get numbered tags in each category's color plus a key page after the sheet (Export → Labels: Auto / Name and quantity / Numbers + key page).

## Versions

The live app is always `index.html`. Earlier versions are kept as full working copies:

- **v2.8** — `v2.8.html` → https://stephanbluitt.github.io/plantakeoff/v2.8.html
- **v2.7** — `v2.7.html` → https://stephanbluitt.github.io/plantakeoff/v2.7.html
- **v2.6** — `v2.6.html` → https://stephanbluitt.github.io/plantakeoff/v2.6.html
- **v2.5** — `v2.5.html` → https://stephanbluitt.github.io/plantakeoff/v2.5.html
- **v2.4** — `v2.4.html` → https://stephanbluitt.github.io/plantakeoff/v2.4.html
- **v2.3** — `v2.3.html` → https://stephanbluitt.github.io/plantakeoff/v2.3.html
- **v2.2** — `v2.2.html` → https://stephanbluitt.github.io/plantakeoff/v2.2.html
- **v2.1** — `v2.1.html` → https://stephanbluitt.github.io/plantakeoff/v2.1.html
- **v2.0** — `v2.0.html` → https://stephanbluitt.github.io/plantakeoff/v2.0.html
- **v1.9** — `v1.9.html` → https://stephanbluitt.github.io/plantakeoff/v1.9.html

All versions share the same login and cloud projects. Jobs with several PDFs open with only their first plan in v1.9.

## Tech

Single self-contained HTML file. PDF rendering via pdf.js, mapping via Leaflet, marked-up PDF export via pdf-lib (loaded only when used). `access.enc` is created by the app: the storage access code, locked with the app password — don't delete it. No build step, no server code — the page talks directly to a private GitHub repository for login and storage.

---

© Stephan Bluitt. All rights reserved. Not licensed for reuse or redistribution.
