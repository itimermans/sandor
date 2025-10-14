# Copilot Instructions for sandor

## Overview
Sandor is a Data Analysis package that provides visualization, analysis and export tools for tabular format from different sources. 

## Structure instructions
- This package will use a src layout
- This package should be installable via pip, but should also provide compatibility for future usage of Poetry or uv. Therefore, the pyproject.toml file should be standard PEP 621 compliant.
- If possible, there should also be an environment.yml file for conda users.
- Assume that if installing from this package, it will be done for development purposes
- This repo will use pinax, which is in github (git@github.com:itimermans/pinax.git), but for development, it will be installed as editable from its development folder 

## Backend general instructions

- Use FastAPI as the main backend framework (async, OpenAPI support, high-throughput).
- Keep API layer (routing, auth, request handling) separate from compute layer (heavy data processing).
- Consider Ray or Dask for distributed / parallel processing of very large datasets. Explicitly ask before implementing 
- Implement heavy operations as async tasks or background jobs (Celery, Ray tasks) to prevent blocking. Explicitly ask before implementing 
- Use columnar formats (Apache Arrow, Parquet) for internal data handling efficiency.
- Apply lazy evaluation and chunked reads to manage gigabyte-scale datasets without memory blowup. Explicitly ask before implementing 
- Add caching for expensive or repeat computations. Explicitly ask before implementing
- Adopt a modular structure: API, services, models, storage.
- Enforce strong typing (e.g., Pydantic) for request and response schemas.
- Maintain logging and monitoring for long-running jobs and performance metrics.
- In the future, we'll use containers (Docker + conda/uv environments) for reproducible builds. For now we'll use venv
- Explicitly separate pinax and other low-level utilities from high-level backend logic.


## Frontend general instructions
- Maintain a strict layout/window-manager abstraction.
	- Do NOT import Golden Layout directly in app/components. Only use the abstraction.
	- Core API lives under `frontend/src/layout/core/` (see `api.js`).
	- Golden Layout implementation lives under `frontend/src/layout/golden/GoldenLayoutManager.js`.
	- The app root uses `frontend/src/components/layout/LayoutRoot.jsx` which:
		- Instantiates a layout manager (currently GoldenLayoutManager).
		- Registers components from `frontend/src/components/layout/componentRegistry.jsx`.
		- Loads the initial layout config and provides UI to add panes.
	- UI components must render via the registry (DOM node + cleanup), not by coupling to the manager.
	- CSS for layout must be imported once globally in `frontend/src/styles.css`.

### Adding a new layout manager (e.g., Mosaic)
1) Implement the interface from `layout/core/api.js` in a new file, e.g. `src/layout/mosaic/MosaicLayoutManager.js` with methods:
	 - `init(hostEl)`, `registerComponent(name, render)`, `loadLayout(config)`, `addToRoot(item)`, `updateSize()`, `destroy()`.
2) Keep the same config shape: a `root` container whose `content` can include `{ type: 'component', componentType, title?, componentState? }`.
3) Update `LayoutRoot.jsx` to import and instantiate the new manager instead of GoldenLayoutManager.
4) Ensure components still mount via `componentRegistry.jsx` (no changes needed there).
5) Import any required CSS in `styles.css` (avoid importing CSS inside JS modules to keep bundling simple).
6) Validate by running the frontend dev server and confirming the initial plot renders and panes can be added.
