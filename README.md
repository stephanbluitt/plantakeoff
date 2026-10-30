# PLAN TAKEOFF v3.3.3

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
- **Only a quick click measures; Smart scribbles at once (v3.3.3)** — in Line / Area / Count / Cut-out / Calibrate (and on the map) a press held longer than ~½ s never places a point, moved or not; any drag moves the plan. In Smart, pressing starts the scribble straight away (the plan moves with the wheel or Space + drag), and a single click inside a space measures it.
- **Move the plan in any tool (v3.3.2)** — press and hold still a moment, then drag: always moves the plan (never a point or a scribble, Smart included); on touch screens a one-finger drag moves the plan in every tool (a tap still places a point, two fingers zoom).
- **Smart area moves like the other tools (v3.3.1)** — in Smart, a straight drag moves the plan; a zig-zag, a back-and-forth or a loop is a scribble (the app tells them apart and puts the plan back); a measurement's corner or ◆ can be dragged; a loop takes everything it circles, joined across shared lines; a space that runs off the screen is found by reading the whole page.
- **Smart area — beta (v3.3)** — a Smart tool (✨, BETA) in the tool bar: scribble inside a space, or loosely around it, and let go. It finds the space's outline in the plan (as it's on screen, so scans and hidden layers work too): fills up to the plan's lines, bridges hatching and text, puts the edges on the middle of the lines, straightens them and locks the corners onto the plan's own corners. With the bar's ➖ Cut-out switch (or X) the smart areas are cut-outs. The result is a normal area (category, undo, editing). Tested: rooms exact on drawn plans, within ~1% on scans and curves.
- **Only this page's layers (v3.2.3)** — the Layers menu lists just the layers used on the page on screen ("2 / 48"), so a big plan set stays a short list; untick "Only layers on this page" to see all of them. All on / All off work on the layers listed.
- **All layers on / off (v3.2.2)** — "All on" and "All off" at the top of the Layers menu.
- **Layers next to the plan name (v3.2.1)** — the ◫ Layers button sits right after the plan's name at the start of the bottom bar, and shows whenever a plan is open (dimmed when that PDF has no layers).
- **Cut-out tool and PDF layers (v3.2)** — Cut-out is a tool of its own in the tool bar (X): every area drawn with it is subtracted from its category; the ➖ Cut-out button while drawing is clearly a button (dashed outline, filled "✓ Cut-out" when on). Plans with layers get a ◫ Layers button in the bottom bar to show or hide each layer — only what's drawn changes (also when zoomed in, for the Magnet, the print report and exported PDFs, which open with the same layers hidden); the PDF isn't edited, and hidden layers are kept with the project.
- **Corners drag right away, curves can't cross, security (v3.1.2)** — with Line / Area / Count, dragging a corner moves it at once (a click still starts measuring there); bending an edge (◆, ⌒ Curve / U, Alt, on the plan or the map) can no longer make an area cross itself; the page now carries a security policy (only its own script and the named libraries can run), outside libraries are checked by fingerprint, and opened project files are checked before use.
- **Curves drag right away (v3.1.1)** — with Line / Area, pressing a curve ◆ and dragging bends the edge at once (it used to move the plan unless you held it first). Corners are unchanged: click = start measuring there, hold ½ s = move it.
- **Faster everywhere (v3.1)** — the drawing code was rebuilt for speed, with every feature kept: labels on the plan are placed once and remembered (selecting, hovering, dragging and zooming no longer re-place them all — on a crowded page a selection went from ~2.4 s to ~50 ms and a zoom from ~2.3 s to ~20 ms), the measurement list only lays out the rows you can see and doesn't rebuild when you only select, the hidden plan isn't redrawn while you're on the map (and the map isn't redrawn while you're on a plan), one mouse handler instead of three (each move ~7× less work), and the small background timers rest while the tab is hidden.
- **Know where you are (v3.0.1)** — over a corner or a curve ◆ the cursor changes, the corner gets a ring, the ◆ grows, and a tip by the mouse says what click / hold / drag will do.
- **Cut-outs, deep zoom, safer corners (v3.0)** — any measurement can be a cut-out that's subtracted from its category (➖ Cut-out while drawing, right-click, or ➖ in the list; dashed and hatched; one drawn inside an area joins that area's category; minus in all totals, estimates and exports). Zoom up to 6400%. With Line / Area / Count, clicking another measurement's corner starts measuring there; hold a corner ½ s to grab and move it.
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

- **v3.2** — `v3.2.html` → https://stephanbluitt.github.io/plantakeoff/v3.2.html
- **v3.1** — `v3.1.html` → https://stephanbluitt.github.io/plantakeoff/v3.1.html
- **v3.0** — `v3.0.html` → https://stephanbluitt.github.io/plantakeoff/v3.0.html
- **v2.9** — `v2.9.html` → https://stephanbluitt.github.io/plantakeoff/v2.9.html
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
