# Sandor — Development Workflow

> **Status:** Setup verified end to end on **Windows 11 / Git Bash, 2026-08-18**, including the
> live-reload loop and the pytest and jest suites. Sections still marked ⚠️ **UNVERIFIED** have not
> been executed yet — the Playwright/Galata UI suite, and everything on macOS/Linux. Remove markers
> as they are confirmed.
> **Companion document:** [`DESIGN.md`](DESIGN.md) — architecture and decisions. Read that first.

---

## 0. Who this is for

Anyone — human or AI agent — setting up or working on Sandor on a new machine.

This document assumes you are comfortable with Python and the command line, but **new to the
JavaScript/TypeScript ecosystem**. Web-side concepts are explained where they appear rather than
assumed (per decision D16 in `DESIGN.md`). There is a glossary in `DESIGN.md` §14.

---

## 1. Mental model: why this is more complicated than a Python project

A JupyterLab extension is a **hybrid package**. This is the single thing to understand before
anything else makes sense.

It contains:

- **TypeScript source** (`src/*.ts`) — compiled and bundled into static JavaScript files that run in
  the browser.
- **A Python package** (`sandor/`) — which does two jobs: it holds our actual Python logic, *and* it
  ships those compiled JavaScript files and tells Jupyter where to find them.

When a user runs `pip install sandor`, they get both. **They never need Node.js** — the JavaScript
arrives pre-compiled inside the wheel. Node is required only on *developer* machines, to do the
compiling.

### The three processes

From `DESIGN.md` §3.1, and it governs everything below:

```
  ┌─────────────┐   HTTP/WebSocket   ┌──────────────────┐      ZMQ      ┌──────────┐
  │   Browser   │ ◄────────────────► │  jupyter_server  │ ◄───────────► │  Kernel  │
  │ TypeScript  │                    │      Python      │               │  Python  │
  └─────────────┘                    └──────────────────┘               └──────────┘
   our extension                     our server extension              our library
   frontend                          (D9-i)                            (D9-ii, iii)
```

These are **three separate processes**. That is why different kinds of change require different
restarts (§5). The browser never talks to the kernel directly — everything is proxied through the
server.

---

## 2. Prerequisites

Install these once per machine.

| Tool | Version | Purpose |
| --- | --- | --- |
| **git** | any recent | version control |
| **uv** | latest | Python environments, dependencies, and the Python interpreter itself |
| **Node.js** | **24 LTS** | build-time only — compiles TypeScript to JavaScript |

**Not used:** conda, pip directly, venv directly, nvm. See `DESIGN.md` D17 for why.

### Installing uv

```bash
# Windows (PowerShell)
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"

# macOS / Linux
curl -LsSf https://astral.sh/uv/install.sh | sh
```

Verify: `uv --version`

You do **not** need to install Python separately. `uv` downloads and manages interpreters itself.

### Installing Node 24

The project targets **Node 24 LTS**, recorded in the `.node-version` file at the repo root.

The recommended way is **fnm** (Fast Node Manager) — a small cross-platform tool that installs Node
per-user and switches versions automatically based on `.node-version`. Crucially, **it does not
disturb any system-wide Node installation you already have.** (On the original dev machine, a global
Node 26 remained in place and untouched throughout.)

```bash
# macOS
brew install fnm

# Windows, if winget is available
winget install Schniz.fnm
```

**Windows without winget** — `winget` was *not* available on the original dev machine (it is a
Microsoft Store component and is missing on some managed corporate installs). fnm is a single
executable, so install it by hand:

```bash
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "
  \$url='https://github.com/Schniz/fnm/releases/download/v1.39.0/fnm-windows.zip'
  \$zip=Join-Path \$env:TEMP 'fnm-windows.zip'
  \$out=Join-Path \$env:TEMP 'fnm-extract'
  Invoke-WebRequest -Uri \$url -OutFile \$zip
  Expand-Archive -Path \$zip -DestinationPath \$out -Force
  Copy-Item (Join-Path \$out 'fnm.exe') (Join-Path \$env:USERPROFILE '.local\bin\fnm.exe') -Force
"
```

`~/.local/bin` is where the uv installer also puts its binaries, so one PATH entry covers both.

Then:

```bash
fnm install 24
fnm use          # reads .node-version
node --version   # expect v24.x
```

**Alternative, if you don't want another tool:** install Node 24 LTS directly from
<https://nodejs.org>. Only do this if you don't already depend on a different Node version
system-wide, because it will replace it.

### Shell setup

`uv` and `fnm` both need to be on `PATH`, and `fnm` needs a shell hook to switch Node versions
automatically. Add to `~/.bashrc` (Git Bash / macOS / Linux):

```bash
export PATH="$HOME/.local/bin:$PATH"
eval "$(fnm env --use-on-cd --shell bash)"
```

PowerShell equivalent, in `$PROFILE`:

```powershell
$env:Path = "$env:USERPROFILE\.local\bin;$env:Path"
fnm env --use-on-cd | Out-String | Invoke-Expression
```

`--use-on-cd` makes fnm read `.node-version` and switch automatically when you enter the repo. Without
it, run `fnm use` manually each session.

Verify in a **new** shell: `uv --version` and `node --version` (expect v24.x inside the repo).

**Why pin the version at all?** JupyterLab's build chain (webpack 5, plus a Yarn bundled as `jlpm`)
is tested against LTS releases. Newer "Current" Node releases occasionally break it in ways that
cost hours to diagnose. Pinning removes an entire category of wasted time.

You do **not** need to install Yarn or manage npm versions — JupyterLab ships **`jlpm`**, its own
pinned Yarn, and we use that.

### Windows only: enable Developer Mode

The registration step in §3 creates a **symlink**. On Windows, creating symlinks requires either
administrator rights or Developer Mode.

**Settings → System → For developers → Developer Mode → On**

Without it, that step may fail or silently fall back to copying files — which breaks the live-reload
loop, because JupyterLab would then be reading a stale copy instead of your build output. macOS and
Linux need nothing here.

Check it from Python (this is what Jupyter actually calls):

```bash
python -c "import os,tempfile; d=tempfile.mkdtemp(); t=os.path.join(d,'t'); open(t,'w').close(); os.symlink(t, os.path.join(d,'l')); print('SYMLINK OK')"
```

---

## 3. One-time project setup

Verified working on Windows 11 / Git Bash, 2026-08-18. From a fresh clone:

```bash
git clone <repo-url>
cd sandor

# 1. Create the virtual environment.
#    uv downloads Python 3.12 automatically if it isn't present.
uv venv --python 3.12

# 2. Install the project (editable) plus all dev dependencies, from the lockfile.
uv sync

# 3. Tell JupyterLab where our compiled JavaScript lives.
#    This creates a SYMLINK from JupyterLab's extension directory back into this repo,
#    so rebuilding is enough — no reinstall needed after every change.
#    NOTE: `jupyter labextension develop` still works but prints a deprecation notice;
#    `jupyter-builder develop` is the current spelling.
uv run jupyter-builder develop . --overwrite

# 4. Enable the Python server extension.
uv run jupyter server extension enable sandor

# 5. Verify both halves are registered.
uv run jupyter labextension list        # expect: sandor v0.1.0 enabled ok
uv run jupyter server extension list    # expect: sandor enabled ... ok
```

Step 2 also runs the JavaScript build automatically (`jlpm install` plus
`jlpm install:extension`), creating `node_modules/` and `sandor/labextension/`. Node must be on
`PATH` for it to succeed.

### On `uv run`

`uv run <command>` executes a command inside the project's virtual environment **without activating
it**. There is no `activate` step in this project, and you should not add one.

This matters for two reasons: it removes a whole class of "wrong environment" mistakes, and it is
far more reliable for AI agents and scripts, where activation state does not survive between
separate shell invocations.

### Resolved: build isolation

`hatch-jupyter-builder` runs a Node build *during* the Python install in step 2, and it was unclear
whether that would survive uv's default build isolation (DESIGN.md open question 5).

**It works.** `uv sync` completed with default build isolation on Windows, producing
`sandor/labextension/` and a working editable install. No workaround needed.

Kept for reference in case it regresses — the fallback would be:

```bash
uv pip install -e . --no-build-isolation
```

---

## 4. The daily loop

Two terminals, both left running:

```bash
# ── Terminal 1 ──  watches src/*.ts and rebuilds on every save
uv run jlpm watch

# ── Terminal 2 ──  the Jupyter server
uv run jupyter lab
```

Then:

1. Edit a `.ts` file and save.
2. Watch Terminal 1 — it prints when the rebuild finishes (a few seconds).
3. **Press F5 in the browser.**
4. Your change is live.

**There is no hot reload.** The browser refresh in step 3 is manual and required. This is normal for
JupyterLab extensions and not a misconfiguration.

### 4.1 One command instead of two — the VS Code tasks

`.vscode/tasks.json` is committed to the repo and wraps the above.

| Action | How |
| --- | --- |
| **Start both servers** | `Ctrl+Shift+B` (the default build task, `Sandor: dev`) |
| **Stop everything** | `Ctrl+Shift+P` → *Tasks: Run Task* → **Sandor: stop** |
| Stop only what VS Code started | `Ctrl+Shift+P` → *Tasks: Terminate Task* → *All Running Tasks* |
| Run a test suite / lint | `Ctrl+Shift+P` → *Tasks: Run Task* → pick one |

Starting opens two terminals side by side in one panel group — `watch` and `lab`. The restart matrix
in §5 still applies exactly as before; the tasks only save you typing.

**`Sandor: stop` runs [`tools/stop_dev.py`](../tools/stop_dev.py)**, which is worth understanding
because it kills processes:

- It first asks any Jupyter server rooted in this repo to shut down **gracefully** over its HTTP
  `/api/shutdown` endpoint, so kernels stop cleanly and checkpoints flush.
- It then sweeps for leftover watchers (`tsc -w`, `jupyter-builder watch`) and terminates them.
- A process is only touched if it passes **all four** safety rules in the script's docstring — most
  importantly, it is never this script's own process or any of its **ancestors** (VS Code itself is
  an ancestor, and its working directory is very likely this repo), and it must be rooted inside
  *this* repository. Unrelated Jupyter servers and Node projects elsewhere on the machine are
  untouched.

Its main value is the case the terminals cannot cover: a server **orphaned** by a crash or a closed
window, still holding port 8888. That is why `jupyter lab` sometimes quietly starts on 8889 and the
browser tab you reopen shows a stale build.

It is a Python script rather than a `.bat`/`.sh` deliberately — D18 convention 6. It needs `psutil`,
which is in the `[dependency-groups] dev` group only, never a runtime dependency (D6).

`.vscode/settings.json` and `.vscode/extensions.json` are committed too. The single most important
line in them is `"files.eol": "\n"` — the editor-side half of the line-ending defence in §8.1.

---

## 5. What to restart after what change

The most common source of confusion. Consequence of the three processes in §1.

| You changed… | What to do | Why |
| --- | --- | --- |
| TypeScript (`src/*.ts`) | wait for `jlpm watch`, then **F5** in the browser | only the browser bundle changed |
| CSS (`style/*.css`) | wait for `jlpm watch`, then **F5** | same |
| Python **server extension** (`sandor/server/`) | **restart `jupyter lab`** (Ctrl-C, rerun) | it lives inside the server process |
| Python **kernel library** (`sandor/plot.py`, loaders…) | **restart the kernel** only (Kernel → Restart) | it lives in the kernel process |
| `package.json` / new JS dependency | `uv run jlpm install`, then restart `jlpm watch` | the dependency graph changed |
| `pyproject.toml` / new Python dependency | `uv sync` | packaging metadata changed |
| JupyterLab settings schema (`schema/*.json`) | restart `jupyter lab` | schemas load at server start |

**Tip for kernel-library work:** put this at the top of a scratch notebook and you can skip most
kernel restarts —

```python
%load_ext autoreload
%autoreload 2
```

Note that `%autoreload` re-imports changed modules but does **not** reliably pick up changes to class
definitions of objects that already exist. When behaviour stops making sense, restart the kernel.

---

## 6. Debugging

### TypeScript / frontend

Press **F12** in the browser to open developer tools.

- **Console tab** — where `console.log()` output appears. This is your `printf`.
- **Sources tab** — source maps mean you can set breakpoints in the original `.ts` files, not the
  compiled bundle. Step through, inspect variables, as in any debugger.
- **Network tab** — see the HTTP and WebSocket traffic between browser and server. Useful when a
  comm (D9-ii) or a server endpoint (D9-i) is not behaving.

Prefix Sandor's console output with `[sandor]` so it is greppable amid JupyterLab's own logging.

### Python — server extension

Its output goes to **Terminal 2**, where `jupyter lab` is running. Start with `--debug` for more:

```bash
uv run jupyter lab --debug
```

### Python — kernel library

Normal notebook behaviour: `print()`, exceptions, and `%debug` all work as usual, because this code
runs in the kernel like any other library.

---

## 7. Testing

The copier template scaffolds three test suites.

| Suite | Tool | Runs | Command | State |
| --- | --- | --- | --- | --- |
| Python unit | pytest | Python logic, codegen, schema validation | `uv run pytest` | ✅ verified — 1 passed |
| TypeScript unit | jest | frontend logic in isolation | `uv run jlpm test` | ✅ verified — 1 passed |
| **UI integration** | **Playwright / Galata** | drives a real JupyterLab in a headless browser | `cd ui-tests && jlpm test` | ⚠️ **UNVERIFIED** — needs `jlpm install` then `jlpm playwright install` first |

Each suite's own spec file carries a header comment explaining what belongs in it and what does not
— see [`src/__tests__/sandor.spec.ts`](../src/__tests__/sandor.spec.ts) for the three-way split.
Short version: anything touching the DOM, a Lumino widget, or the JupyterLab application object
belongs in the Galata suite, because mocking enough JupyterLab to test it under jest ends up testing
the mock.

Note `ui-tests/` is a **separate npm project** with its own `package.json` and `yarn.lock` — hence
`cd ui-tests` and a bare `jlpm`, not `uv run jlpm` from the root.

**Galata deserves attention.** It launches JupyterLab in a real headless browser, clicks things, and
captures screenshots. This is the *only* way an AI agent can verify visual behaviour — an agent
cannot see your browser, but it can read a screenshot Galata produced. Treat UI tests as the
verification channel for anything visual, not as an optional extra.

The bulk of Sandor's logic is deliberately Python-side (D15), so `pytest` should be the largest and
fastest suite. Codegen and extraction (D4) in particular are testable with no browser and no
JupyterLab at all — a plain round-trip test: config → code → config.

---

## 8. Cross-platform rules

Sandor targets **Windows, macOS, and Linux**. These conventions are cheap now and expensive to
retrofit.

1. **Line endings.** The repo is LF-normalised via `.gitattributes` (`* text=auto eol=lf`).

   > ⚠️ **This is a correctness issue, not a style issue.** D3 Rule 2 compares a hash of the cell
   > source against a stored hash. If the same file is CRLF on Windows and LF on macOS, the hashes
   > differ, and every Sandor cell would falsely report "hand-edited" when opened on the other
   > machine. `.gitattributes` alone is **not** sufficient — the hash function must *also* normalise
   > line endings internally before hashing. See `DESIGN.md` D3.

2. **Paths.** `pathlib.Path` in Python. Never build paths with string concatenation or hardcoded
   separators.
3. **Case sensitivity.** Windows and macOS are case-insensitive by default; Linux is not. An import
   or filename that works locally can fail in CI. Linting catches most of it.
4. **No shell scripts.** No `.sh`, no `.bat`. Anything scripted goes in Python or as a
   cross-platform npm script in `package.json`.
5. **CI runs the matrix** — `windows-latest`, `macos-latest`, `ubuntu-latest`. It is the only real
   guarantee, since most development happens on one OS.

---

## 9. Troubleshooting

Populate this section as real problems are hit. ⭐ marks ones actually encountered during setup.

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| ⭐ `uv : The term 'uv' is not recognized` in a VS Code terminal | VS Code inherits the environment it was *launched* with. Installing uv updates the persistent user PATH, but a running VS Code never sees it. | **restart VS Code entirely** — not just the terminal. Verify with `[Environment]::GetEnvironmentVariable('Path','User')` |
| ⭐ `uv`/`node` work in Git Bash but not PowerShell | the shell hooks live in `~/.bashrc`, which PowerShell never reads | create a PowerShell profile — §2 "Shell setup". Or just use Git Bash. |
| ⭐ `node --version` shows v26 (or any non-24) in PowerShell | fnm's `--use-on-cd` hook is not installed for that shell | add the profile lines in §2, or run `fnm use` manually |
| ⭐ `winget: command not found` | winget is a Store component, absent on some managed Windows installs | install fnm from the GitHub release binary — §2 |
| ⭐ `jupyter labextension develop` prints a deprecation notice | renamed upstream | use `jupyter-builder develop` instead |
| ⭐ Python script can't find a `/tmp/...` file created by Git Bash | Git Bash's `/tmp` maps to `%TEMP%`; Windows Python resolves `/tmp` to `C:\tmp` | never pass Git Bash paths to Windows Python — use repo-relative paths or `os.environ["TEMP"]` (D18) |
| ⭐ git warns `LF will be replaced by CRLF` | global `core.autocrlf=true` | `.gitattributes` overrides it; run `git add --renormalize .` once |
| ⭐ Route returns 404 | wrong path — the scaffolded example route is `/sandor/hello`, not `/sandor/get-example` | check `sandor/routes.py` for the registered pattern |
| ⭐ `jlpm test` prints `jest-haste-map: Haste module naming collision` | jest walks the whole tree and finds several `package.json` files with the same `name` — ours, the built copy in `sandor/labextension/`, and JupyterLab's `staging`/`static` inside `.venv` | **harmless noise, ignore it.** The suite still passes. Only worth fixing if it ever masks a real failure. |
| ⭐ `jlpm lint:check` reports formatting problems in `docs/*.md` | Prettier reflows markdown tables | already fixed — `*.md` is in `.prettierignore`. Docs are hand-formatted to 100 columns. |
| Browser shows an old build; terminal says the rebuild succeeded | a stale `jupyter lab` orphaned on port 8888, so the new one silently started on **8889** and you are looking at the old tab | run the **`Sandor: stop`** task (§4.1), then start again. Check the port in the `jupyter lab` terminal output. |
| Extension missing from `jupyter labextension list` | step 3.3 not run, or run in a different environment | rerun `uv run jupyter labextension develop . --overwrite` |
| Code changes have no effect after F5 | `jlpm watch` not running, or the rebuild failed | check Terminal 1 for compile errors |
| Changes have no effect, `watch` looks fine (Windows) | symlink fell back to a copy | enable Developer Mode (§2), rerun `labextension develop` |
| `jlpm` not found | not inside the uv environment | prefix with `uv run` |
| Build fails mentioning `webpack` / `node-gyp` | wrong Node version | `node --version` — must be v24.x |
| Server extension changes ignored | server not restarted | restart `jupyter lab` (§5) |
| Kernel library changes ignored | kernel not restarted | Kernel → Restart, or use `%autoreload` |
| `pip install` build error on `hatch-jupyter-builder` | build isolation | `uv pip install -e . --no-build-isolation` (§3) |
| Every Sandor cell shows "hand-edited" after switching machines | line-ending mismatch | see §8.1 |

---

## 10. Command reference

```bash
# ── Environment ────────────────────────────────────────────────────────
uv venv --python 3.12          # create the virtual environment
uv sync                        # install everything from the lockfile
uv add <package>               # add a Python dependency (updates uv.lock)
uv add --dev <package>         # add a development-only dependency
uv lock --upgrade              # refresh the lockfile
uv run <command>               # run inside the environment, no activation

# ── Build ──────────────────────────────────────────────────────────────
uv run jlpm install            # install JavaScript dependencies
uv run jlpm build              # one-off build
uv run jlpm watch              # rebuild continuously on save
uv run jlpm clean              # remove build artefacts

# ── Registration ───────────────────────────────────────────────────────
uv run jupyter labextension develop . --overwrite
uv run jupyter labextension list
uv run jupyter server extension enable sandor
uv run jupyter server extension list

# ── Run ────────────────────────────────────────────────────────────────
uv run jupyter lab
uv run jupyter lab --debug
uv run python tools/stop_dev.py  # stop this repo's servers and watchers

# ── Test ───────────────────────────────────────────────────────────────
uv run pytest                  # Python
uv run jlpm test               # TypeScript unit
uv run jlpm lint               # Prettier + ESLint + stylelint, with --fix
uv run jlpm lint:check         # the same, report-only (what CI runs)
cd ui-tests && jlpm test       # Playwright / Galata UI tests (separate project)
```

In VS Code, all of the above are also `Ctrl+Shift+P` → *Tasks: Run Task*. See §4.1.

---

## 11. Repository map — what every file is for

Per D16, **every source file in the repo carries a header comment explaining itself.** Read the file
first; this table is the index, not the explanation.

The exception is files that *cannot* hold comments, because a strict JSON parser reads them. Those
are marked 🚫 below and are the only ones this table has to explain in full.

### Source we write

| Path | What it is |
| --- | --- |
| `src/index.ts` | Frontend entry point. The plugin descriptor and its `activate()`. Everything else in `src/` is reachable from here or is dead. |
| `src/request.ts` | Browser → server HTTP helper. Handles the auth token and the `base_url` prefix, which is why we don't call `fetch` directly. |
| `sandor/__init__.py` | Python package root **and** the Jupyter plugin manifest — the three `_jupyter_*` functions are looked up by name by Jupyter's discovery. |
| `sandor/routes.py` | The server extension's HTTP endpoints (D9-i). Currently just `/sandor/hello`. |
| `style/base.css` | All actual CSS. Read its header before writing any: use JupyterLab's CSS variables, and namespace every class. |
| `style/index.css` / `style/index.js` | Two entry points into `base.css` — one for plain-CSS consumers, one for the webpack bundle. Don't put rules in them. |
| `tools/stop_dev.py` | Stops this repo's dev servers. Backs the `Sandor: stop` VS Code task. See §4.1. |

### Tests

| Path | What it is |
| --- | --- |
| `conftest.py` | Pytest fixtures, auto-loaded. Configures the test server to load Sandor and to **require authentication**, so a handler missing `@tornado.web.authenticated` fails the suite. |
| `sandor/tests/test_routes.py` | Integration tests against a real `jupyter_server`. |
| `src/__tests__/sandor.spec.ts` | Jest unit tests. Header explains the three-suite split. |
| `ui-tests/` | Separate npm project: Playwright + Galata. The only suite that sees pixels. |

### Build and tooling configuration

| Path | What it is |
| --- | --- |
| `tsconfig.json` | How `tsc` compiles `src/` → `lib/`. JSONC, so it *is* commented. |
| `tsconfig.test.json` | Test-only TypeScript overrides. Currently inherits everything. |
| `jest.config.js` | Jest setup. Its header explains the ES-module error that produces the most confusing message in this toolchain. |
| `babel.config.js` | Source transform for the jest run only. Not in the production build path. |
| `eslint.config.mjs` | Lint rules. Header explains the ESLint-vs-Prettier split. |
| `.prettierignore` | What Prettier must not touch — notably `*.md`, because it reflows tables into unreviewable diffs. |
| `pyproject.toml` | Python packaging, dependencies, and the hatch build hooks that run the Node build during `uv sync`. Commented. |
| `.gitattributes` | LF normalisation (D18.1) plus binary rules for `.tdms`/`.mf4`/`.parquet`. Commented. |
| `.vscode/tasks.json` | Start/stop/test tasks. JSONC, commented. |
| `.vscode/settings.json` | Workspace settings. JSONC, commented. `"files.eol": "\n"` is the important one. |
| `.vscode/extensions.json` | Suggested extensions. JSONC, commented. |

### 🚫 Files that cannot carry comments

| Path | What it is |
| --- | --- |
| `package.json` | The npm manifest, and **the single source of truth for the version number** — hatch reads it via `hatch-nodejs-version` and writes `sandor/_version.py`, so the npm and Python versions can never drift. Also holds the `scripts` table (`build`, `watch`, `test`, `lint`…), the Prettier and stylelint configs, and the `jupyterlab` block naming `outputDir: sandor/labextension` and `schemaDir: schema`. |
| `schema/plugin.json` | JSON Schema for Sandor's user-facing settings, surfaced in *Settings → Advanced Settings Editor* and loaded by `settingRegistry.load('sandor:plugin')` in `src/index.ts`. Currently an empty `properties: {}` — no settings exist yet. Changing it requires a **`jupyter lab` restart** (§5), because schemas are read at server start. |
| `install.json` | Metadata JupyterLab's Extension Manager shows the user, telling them Sandor is managed by Python (`pip`/`uv`), not by the in-app extension installer. Purely informational. |
| `jupyter-config/server-config/sandor.json` | Installed by the wheel into `etc/jupyter/jupyter_server_config.d/`. Contains `{"ServerApp": {"jpserver_extensions": {"sandor": true}}}` — i.e. **this file is why the server extension is enabled automatically** on `pip install`, with no `jupyter server extension enable` step for the end user. |
| `.copier-answers.yml` | Records the answers given to the `copier` scaffolding template. Lets the scaffold be re-run to pick up upstream template updates. Do not hand-edit. |
| `uv.lock` / `yarn.lock` | Fully resolved dependency graphs. Generated. Commit them; never edit them. |

### Generated — never edit

| Path | Why |
| --- | --- |
| `sandor/labextension/` | Build output. In development it is a **symlink** into the venv, created by `jupyter-builder develop`; that symlink is what makes F5 pick up a rebuild. |
| `sandor/_version.py` | Written by hatch from `package.json`. |
| `lib/` | `tsc` output. |
| `node_modules/`, `.venv/`, `coverage/`, `*.tsbuildinfo` | Dependencies and caches. |

---

## 12. Changelog

| Date | Change |
| --- | --- |
| 2026-08-18 | Created. Toolchain: uv + Node 24 LTS + Python 3.12. Written pre-scaffold; unverified sections marked. |
| 2026-08-18 | Setup executed and verified on Windows 11 / Git Bash. Resolved the build-isolation question (works, no workaround). Added the winget-less fnm install, shell-profile setup, and five real troubleshooting entries. Corrected `jupyter labextension develop` → `jupyter-builder develop`. |
| 2026-08-18 | M0 closed. Added §4.1 (VS Code tasks, one-command start/stop) and §11 (repository map). Jest suite verified. Every source file given an explanatory header comment per D16. |
