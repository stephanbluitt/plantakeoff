# PLAN TAKEOFF v2.1

**Professional takeoff & estimating tool for landscapers and contractors** — made by Stephan Bluitt · E Landscaping LLC

Measure construction plans and real properties, get instant quantities for estimating. Runs entirely in the browser — one file, no install.

> 🔒 **Private tool.** This is an internal company application. The app requires a password to log in; all project data is stored in a private, access-controlled cloud — nothing is stored in this repository.

## What it does

- **PDF plans** — add one or several plan PDFs to a project, set the scale (presets, custom, or calibrate on a known dimension) and measure lengths, areas, and counts directly on the drawing — in US units (LF, SF, CY) or metric (m, m², m³), switched in Settings, with metric 1:100-style scales. Scales per plan and per page, page arrows run through every plan, plans menu to switch, rename or remove, dark plan inversion.
- **Satellite measuring** — search any address or business (Esri geocoding built in; optional Google Places key for the same results as Google Maps), or paste coordinates / a Google Maps link, then measure real properties from satellite imagery: lengths, areas, counts. Includes historical imagery with season filter (leaf-off winter shots for tree work).
- **Categories & materials** — organize measurements into color-coded categories with sub-categories, material depth → automatic volumes (cubic yards or cubic metres), waste %, and notes.
- **Outputs** — copy formatted quantities for estimating software, export CSV, print full reports with plan snapshots, and download any plan (or all plans in one file) as a marked-up PDF with every measurement drawn on it — labels spread out so they never overlap, with leader lines on crowded plans — plus a takeoff summary page.
- **Projects** — save/open project files with the plans embedded, named version snapshots, autosave recovery, 60-step undo/redo.
- **Cloud** — log in and save projects (plan PDFs included) to a private cloud; search, open, rename or delete them from any computer. The password alone reconnects storage on any computer.

## Versions

The live app is always `index.html`. Earlier versions are kept as full working copies:

- **v2.0** — `v2.0.html` → https://stephanbluitt.github.io/plantakeoff/v2.0.html
- **v1.9** — `v1.9.html` → https://stephanbluitt.github.io/plantakeoff/v1.9.html

All versions share the same login and cloud projects. Jobs with several PDFs open with only their first plan in v1.9.

## Tech

Single self-contained HTML file. PDF rendering via pdf.js, mapping via Leaflet, marked-up PDF export via pdf-lib (loaded only when used). `access.enc` is created by the app: the storage access code, locked with the app password — don't delete it. No build step, no server code — the page talks directly to a private Supabase backend for login and storage.

---

© E Landscaping LLC. All rights reserved. Not licensed for reuse or redistribution.
