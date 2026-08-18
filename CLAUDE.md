# Sandor — agent instructions

A supercharged JupyterLab environment for vehicle test data analysis: custom notebook cells that
show a **form instead of code**, backed by a Python package.

## Read these first, in this order

| File | What it holds | When |
| --- | --- | --- |
| [`docs/DESIGN.md`](docs/DESIGN.md) | Motivation, verified facts, **decisions D1–D18**, rejected options, glossary | **Always.** Before proposing anything. |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | Current milestone, checklists, session log | **Always.** Work only the current milestone. |
| [`docs/WORKFLOW.md`](docs/WORKFLOW.md) | Setup, the dev loop, **what to restart after what change** | Before running or building anything. |
| [`AGENTS.md`](AGENTS.md) | Generic JupyterLab extension coding standards (from the official template) | When writing extension code. |

Anything tagged `DECIDED` in DESIGN.md is settled — do not reopen it without asking. Check
DESIGN.md §12 (Rejected options) before suggesting a tool or approach; several obvious ideas
(forking JupyterLab, Dash, Panel, marimo, anywidget) were already evaluated and ruled out with
reasons.

## Working agreement

- **Go slowly, one element at a time.** The owner has repeatedly asked for small reviewable steps
  over large batches. Finishing one thing correctly beats starting three.
- **Be brief in conversation.** Bullet points, straight answers, no recaps or summaries.
- **Explain the web side.** The owner is highly experienced in C/C++ and Python and deliberately
  learning JavaScript/TypeScript/web. Explain those concepts inline where they appear and comment
  code generously (D16). Do not assume familiarity with npm, webpack, Lumino, or the DOM.
- **Comment everything, even the basics.** Explicit standing instruction from the owner. Every file
  in this repo opens with a header comment saying what it is, where it sits in the architecture, and
  which DESIGN.md decisions constrain it; every non-obvious line has an inline note. Match that
  density in new files — it is the house style, not optional. `tsconfig.json` and everything under
  `.vscode/` are **JSONC and can take comments**; `package.json`, `schema/plugin.json`, and
  `install.json` **cannot** — those are documented in `docs/WORKFLOW.md` §11 instead.
- **Everything durable goes in the repo**, not in chat. Update `docs/ROADMAP.md` §4 before finishing
  a session — especially surprises and dead ends, which stop the next session repeating them.

## Hard rules specific to this project

These are the ones an agent is most likely to violate by accident.

1. **The JS extension must never be required to run a notebook** (D6). The Python package is
   required; the TypeScript is convenience only. A Sandor notebook must stay valid and runnable
   without the extension installed.
2. **Code is the source of truth; metadata is a cache** (D3, D13). Metadata must always be derivable
   from the cell source, never the reverse. Never silently overwrite hand-edited code — detect
   divergence by hash and show a banner.
3. **Generated code must be a single call with a pure literal** (D3 Rule 1) so extraction is
   `ast.literal_eval`, never a Python interpreter.
4. **Hash line-endings-normalised** (D3 callout, D18). Otherwise notebooks moved between Windows and
   macOS falsely report every cell as hand-edited. `.gitattributes` alone is insufficient.
5. **Generated configs store relative, POSIX-style paths** (D18.3). Absolute Windows paths make a
   notebook silently unportable, which defeats the project's premise.
6. **The frontend talks to a `DataSource` interface, never to `pandas.DataFrame`** (D8).
7. **Route backend work correctly** (D9): live user variables → kernel comms; global/config/file-level
   → server extension. Never block the kernel event loop.
8. **All document mutations go through the shared-model API** (`cell.sharedModel.setSource(...)`),
   not direct mutation (D11) — this is correct today and makes RTC a config change later.
9. **Keep the TypeScript layer thin** (D15). Logic in Python; confine core-API touchpoints to a small
   adapter module so a JupyterLab 5 migration is "fix the adapter", not a rewrite.

## Environment

**uv + Node 24 (via fnm) + Python 3.12.** There is **no `activate` step** — prefix commands with
`uv run`. Do not use conda, pip, or venv directly (D17).

```bash
uv sync                          # install/update from the lockfile
uv run jupyter lab               # run
uv run jlpm watch                # rebuild TypeScript on save (then F5 in the browser)
uv run python tools/stop_dev.py  # stop this repo's servers and watchers
uv run pytest                    # Python tests
uv run jlpm test                 # TypeScript unit tests
uv run jlpm lint:check           # Prettier + ESLint + stylelint, report-only
```

Node must be on `PATH` for any build step. If `node --version` is not v24.x, run `fnm use`.

In VS Code these are also tasks: `Ctrl+Shift+B` starts watch + lab together, and
`Tasks: Run Task → Sandor: stop` stops them. See `docs/WORKFLOW.md` §4.1.

Full command reference and the restart-matrix are in `docs/WORKFLOW.md` §5 and §10. A file-by-file
map of the whole repo is §11.

## Repo layout

```
src/                TypeScript — the JupyterLab extension frontend
sandor/             Python — core library, server extension (routes.py), kernel companion
sandor/labextension/  build output (generated; symlinked into the venv — do not edit)
schema/             JupyterLab settings schema (plugin.json — no comments possible)
style/              CSS
tools/              cross-platform dev scripts (Python, never .sh/.bat — D18.6)
ui-tests/           Playwright / Galata UI tests — the only way an agent can verify UI visually
.vscode/            committed tasks/settings/extensions — start, stop, test, LF-on-save
docs/               DESIGN, WORKFLOW, ROADMAP
```
