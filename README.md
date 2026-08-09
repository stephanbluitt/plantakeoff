# PLAN TAKEOFF v1.9

**Professional takeoff & estimating tool for landscapers and contractors** — made by Stephan Bluitt · E Landscaping LLC

Measure construction plans and real properties, get instant quantities for estimating. Runs entirely in the browser — one file, no install.

> 🔒 **Private tool.** This is an internal company application. The app requires a password to log in; all project data is stored in a private, access-controlled cloud — nothing is stored in this repository.

## What it does

- **PDF plans** — open any construction plan, set the scale (presets, custom, or calibrate on a known dimension) and measure linear feet, square feet, and counts directly on the drawing. Per-page scales, multi-page navigation, dark plan inversion.
- **Satellite measuring** — search any address and measure real properties from satellite imagery: lengths, areas, counts. Includes historical imagery with season filter (leaf-off winter shots for tree work).
- **Categories & materials** — organize measurements into color-coded categories with sub-categories, material depth → automatic cubic-yard volumes, waste %, and notes.
- **Outputs** — copy formatted quantities for estimating software, export CSV, print full reports with plan snapshots.
- **Projects** — save/open project files with the plan embedded, named version snapshots, autosave recovery, 60-step undo/redo.
- **Cloud** — log in and save projects (plan PDF included) to a private cloud; open them from any computer.

## Tech

Single self-contained HTML file. PDF rendering via pdf.js, mapping via Leaflet. No build step, no server code — the page talks directly to a private Supabase backend for login and storage.

---

© E Landscaping LLC. All rights reserved. Not licensed for reuse or redistribution.
