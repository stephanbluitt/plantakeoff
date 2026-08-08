# PLAN TAKEOFF v1.9.2

**Professional takeoff & estimating tool for landscapers and contractors** — made by Stephan Bluitt · E Landscaping LLC

Measure construction plans and real properties, get instant quantities for estimating. Runs entirely in the browser — one file, no install.

> **Internal company tool.** No login, no password — the app opens straight into the workspace and the projects list loads on its own. Project files and plans live in private, access-controlled cloud storage. Nothing is stored in this repository.

## What it does

- **PDF plans** — open any construction plan, set the scale (presets, custom, or calibrate on a known dimension) and measure linear feet, square feet, and counts directly on the drawing. Per-page scales, multi-page navigation, dark plan inversion.
- **Satellite measuring** — search any address and measure real properties from satellite imagery: lengths, areas, counts. Includes historical imagery with a season filter (leaf-off winter shots for tree work).
- **Categories & materials** — organize measurements into color-coded categories with sub-categories, material depth → automatic cubic-yard volumes, waste %, and notes.
- **Outputs** — copy formatted quantities for estimating software, export CSV, print full reports with plan snapshots.
- **Projects** — save/open project files with the plan embedded, named version snapshots, autosave recovery, 60-step undo/redo.
- **Cloud** — save projects (plan PDF included) to private cloud storage and open them from any computer.

## Using it

Open the page and start measuring — nothing to sign into. Cloud projects connect on their own and the projects list opens a moment after load.

Local project files work the same as always, so a dropped connection never blocks a takeoff.

## Tech

Single self-contained HTML file. PDF rendering via [pdf.js](https://mozilla.github.io/pdf.js/), mapping via [Leaflet](https://leafletjs.com/). No build step and no server code — the page talks directly to private cloud storage over an authenticated API.

---

© E Landscaping LLC. All rights reserved. Not licensed for reuse or redistribution.
