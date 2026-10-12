# PLAN TAKEOFF v2.3

**Professional takeoff & estimating tool for landscapers and contractors** — made by Stephan Bluitt · Made in the USA 🇺🇸

Measure construction plans and real properties, get instant quantities for estimating. Runs entirely in the browser — one file, no install.

> 🔒 **Private tool.** The app requires a password to log in; all project data is stored in a private, access-controlled cloud — nothing is stored in this repository.

## What it does

- **PDF plans** — add one or several plan PDFs to a project, set the scale (presets, custom, or calibrate on a known dimension) and measure lengths and areas — any segment straight or curved, in the same measurement (drag the ◆ in the middle of a segment, or Alt/Option-click on the curve; exact arc math) — and counts directly on the drawing — in US units (LF, SF, CY) or metric (m, m², m³), switched in Settings, with metric 1:100-style scales. Scales per plan and per page, page arrows run through every plan (the page never changes by accident — arrow keys move around the plan), plans menu to switch, rename or remove, dark plan inversion. ⌘Z while drawing takes back the last point or curve.
- **Satellite measuring** — search any address or business (Esri geocoding built in; optional Google Places key for the same results as Google Maps), or paste coordinates / a Google Maps link, then measure real properties from satellite imagery: lengths and areas with straight or curved segments, counts. Includes historical imagery with season filter (leaf-off winter shots for tree work).
- **Categories & materials** — organize measurements into color-coded categories with sub-categories, material depth → automatic volumes (cubic yards or cubic metres), waste %, and notes. Hide any category or item, or everything at once (Hide all / Show all). Plan and map measurements are listed, totaled, copied and printed apart; the This page filter follows you between the plan and the map.
- **Outputs** — Save and Export buttons top right. Copy project measurements for estimating software, export CSV, print full reports with plan snapshots, and Export PDF of any plan (or all plans in one file): with *Include markups* on, every measurement is drawn on it — labels spread out so they never overlap, with leader lines on crowded plans — plus a takeoff summary page; with it off, the plans exactly as they came.
- **Projects** — everything saves to the cloud by itself (a few seconds after you stop, when you switch away, and every 3 minutes), with a Saved / Unsaved label next to the project name. Project versions: your named snapshots with notes, and autosaves (every 10 minutes of work and before big changes) listed apart, each showing its totals and what changed since; restore any of them. 60-step undo/redo.
- **Cloud** — log in and save projects (plan PDFs included) to a private cloud; search, open, rename or delete them from any computer. The app opens on your project list over a fresh, empty project. The password alone reconnects storage on any computer.

## Versions

The live app is always `index.html`. Earlier versions are kept as full working copies:

- **v2.2** — `v2.2.html` → https://stephanbluitt.github.io/plantakeoff/v2.2.html
- **v2.1** — `v2.1.html` → https://stephanbluitt.github.io/plantakeoff/v2.1.html
- **v2.0** — `v2.0.html` → https://stephanbluitt.github.io/plantakeoff/v2.0.html
- **v1.9** — `v1.9.html` → https://stephanbluitt.github.io/plantakeoff/v1.9.html

All versions share the same login and cloud projects. Jobs with several PDFs open with only their first plan in v1.9.

## Tech

Single self-contained HTML file. PDF rendering via pdf.js, mapping via Leaflet, marked-up PDF export via pdf-lib (loaded only when used). `access.enc` is created by the app: the storage access code, locked with the app password — don't delete it. No build step, no server code — the page talks directly to a private Supabase backend for login and storage.

---

© Stephan Bluitt. All rights reserved. Not licensed for reuse or redistribution.
