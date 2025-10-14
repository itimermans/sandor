# Sandor Frontend (Vite + React) - README

This folder contains a minimal React frontend scaffold built with Vite.

Overview of what I added and why (detailed, for non-JS developers):

- `package.json`: Declares the project name, scripts, and dependencies. Use
  `npm install` or `pnpm`/`yarn` to install dependencies. Scripts provided:
  - `dev`: Run Vite dev server with fast refresh.
  - `build`: Produce a production build.
  - `preview`: Serve the production build locally for verification.

- `vite.config.js`: Minimal Vite config enabling the official React plugin.

- `index.html`: Vite entry HTML which mounts the React app into `#root`.

- `src/main.jsx`: Bootstraps React and mounts `App` into the DOM.

- `src/App.jsx`: Top-level React component. Keeps backend comms minimal and
  demonstrates usage of the Golden Layout wrapper component.

- `src/components/GoldenLayoutWrapper.jsx`: Demonstrates how to start a
  Golden Layout instance inside a React app. It registers a simple component
  and creates a layout with three panes. The file contains comments at each
  step explaining what's happening.

- `src/styles.css`: Minimal styling for layout and the Golden Layout container.

Why I chose Vite + React:
- Vite is modern, extremely fast for development, and easy to configure.
- React is a widely-used UI library with good ecosystem compatibility.

How to run (PowerShell commands):

1) Install dependencies (in `frontend` folder):

```powershell
cd frontend
npm install
```

2) Start dev server (will open on `http://localhost:5173` by default):

```powershell
npm run dev
```

Notes about backend communication:
- The backend already enables CORS for all origins in `backend/src/.../app.py`.
  That means the frontend can call `http://localhost:8000` endpoints without
  additional proxying in development.
- For now we keep the frontend/backend protocol minimal; the Golden Layout
  example is purely client-side. Later we can add API calls (e.g., POST
  `/data/upload`) and show results in panes.

If you'd like, next I can:
- Wire a simple health check call to display backend status in the header.
- Add a file upload UI that calls the backend `/data/upload` endpoint.
- Add hotkeys or presets for Golden Layout layouts.

## Layout/window-manager abstraction

The app intentionally abstracts layout/window management so we can swap Golden Layout with another library later.

- Core API: `src/layout/core/api.js` documents the `LayoutManager` interface and config shapes.
- Current implementation: `src/layout/golden/GoldenLayoutManager.js` encapsulates Golden Layout specifics.
- App entry for layout: `src/components/layout/LayoutRoot.jsx` uses the manager and loads the initial layout.
- Component registry: `src/components/layout/componentRegistry.jsx` maps `componentType` to a render function that mounts into a provided DOM node and returns a cleanup.
- Styles: `src/styles.css` imports layout CSS globally.

To add a new layout manager:
1) Create `src/layout/<name>/<Name>LayoutManager.js` implementing the methods from `api.js`:
  - `init(hostEl)`, `registerComponent(name, render)`, `loadLayout(config)`, `addToRoot(item)`, `updateSize()`, `destroy()`.
2) Use the same config shape (root container with `content` items; components have `componentType` and optional `title`/`componentState`).
3) Update `LayoutRoot.jsx` to instantiate your new manager instead of the Golden one (one import change).
4) Ensure required CSS is added to `src/styles.css`.
5) Run the dev server and confirm the initial Plotly example renders and new panes can be added.
