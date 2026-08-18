# Sandor — Design Document

> **Status:** Planning phase. No code written yet.
> **Last updated:** 2026-08-18
> **Document owner:** Inigo Timermans

---

## 0. How to use this document

This is the **single canonical record** of the Sandor project's motivation, architecture, and
decisions. It exists because this project will be worked on across several weeks, on different
computers, by different people and different AI agent sessions. Nothing important should live only
in a chat transcript.

**If you are an AI agent or a new session starting work on this repo:** read this document in full
before proposing anything. Many options below have already been considered and rejected for
specific reasons — Section 12 lists them so they are not re-litigated.

**Conventions used here:**

| Tag | Meaning |
| --- | --- |
| `DECIDED` | Settled. Do not reopen without an explicit conversation with the owner. |
| `DEFERRED` | Agreed as valuable, intentionally postponed. Design must leave room for it. |
| `PARALLEL` | A second variant to be built alongside the primary, later, behind the same interface. |
| `REJECTED` | Considered and ruled out. Reason recorded. |
| `OPEN` | Not yet decided. Needs an answer before the affected work starts. |

**Rule for future edits:** when a decision changes, edit the decision in place *and* add a line to
the changelog in Section 16. Never silently delete a rejected option — the reasoning is the value.

---

## 1. Motivation

### 1.1 The current workflow

The owner performs data analysis on **vehicle testing files**. The current process is:

1. **Ingest.** Test files arrive in large, specialised engineering formats — TDMS (National
   Instruments), MDF/MF4 (ASAM, the automotive standard), proprietary binaries, and CSV.
2. **Preprocess.** A collection of Python packages and functions converts these into a
   **pandas DataFrame** with extra attributes attached (via `df.attrs`). For all practical purposes
   the result is an ordinary DataFrame.
3. **Analyse and plot.** Calculations with NumPy; visualisation almost always with **Plotly**,
   written at the `plotly.graph_objects` level for fine control.
4. All of this happens inside **JupyterLab**.

### 1.2 Why it is under-optimised

Three distinct problems, in the owner's own framing:

**(a) Everything is code, with no UI, but code is still sometimes necessary.**
Every detail of a Plotly figure — traces, colours, axis ranges, layout — must be typed by hand in
deep `graph_objects` form. A graphical interface would be far faster. Critically, that interface
must have **memory**: reopening the `.ipynb` should restore all previous selections, so the only
remaining action is running the kernel. Excel provides this kind of persistence, but Excel cannot
express the parts that genuinely need code — Python logic, NumPy, loops, generated external
figures.

**(b) Signal names are inconsistent.**
Some signal names are standard across test files; many are not. Today they must be checked and
patched by hand inside plots and functions. There should be a global, systematic way to resolve
signal names based on context — a "smart dictionary".

**(c) Reusable tooling is tangled up with per-analysis specifics.**
Low-level analysis functions recur across studies. The best solution so far has been a separate
repo installed in editable/developer mode, so it can be improved while in use. What is actually
needed is a hard separation between:

- **Tool code** — preprocessing, generic functions. Must be **vehicle-agnostic**, so a new vehicle
  never forces a new version of a function.
- **Analysis code** — the specific plots and tables produced for one vehicle and one set of test
  files.

Those vehicle-agnostic tools must nevertheless accommodate particularities such as differing signal
names — which is why (b) and (c) are the same problem seen from two angles.

### 1.3 What the deliverable actually is

An important framing point that ruled out several otherwise-plausible tools:

> The output is **not an app**. It is a *file* — run against one vehicle and a set of datasets —
> containing a series of instructions, that offers a graphical interface *and* code editing at the
> same time, and produces reports, images, and tables.

A "configuration file that is also a program". That description matches a notebook far better than
it matches a dashboard framework.

### 1.4 The realisation

After evaluating web-app frameworks, the conclusion was that the closest thing to the requirement is
**JupyterLab itself — with modifications**.

The concrete image driving the design is the **"Plotly UI grapher" cell**: a cell that does not
display code, but instead shows text boxes, selectors, and dropdowns for configuring a Plotly
figure. Underneath it is nothing but a `graph_objects` wrapper. It either preloads DataFrame
information (column names, etc.) or lets the user choose among available DataFrames, while still
permitting manual entry of signal names as if writing code. Its state persists in the notebook, so
reopening the file restores every selection.

The same logic generalises to other **custom cells** wrapping other functions — a modular *library*
of cell types, added and rearranged exactly like ordinary code cells.

---

## 2. Vision

**Sandor** is a supercharged JupyterLab environment for vehicle test data analysis. It consists of:

1. A **Python package** (`sandor`) — data loading, a signal-name registry, plot construction,
   config validation. Usable with zero UI, from a plain script.
2. A **JupyterLab extension** (TypeScript) — custom cell types whose input area shows a form instead
   of code, plus side panels, menus, and a cell library.
3. A **JSON Schema contract** binding the two together, and serving AI agents as well.

**The defining property:** a Sandor notebook must remain a *valid, runnable, readable notebook*
without the JavaScript extension installed. The extension is convenience, never a requirement.

---

## 3. Verified facts about JupyterLab

Everything in this section was verified against primary sources during planning, not recalled.
Sources and dates are in Section 15. **Re-verify before relying on any of it for implementation** —
JupyterLab moves.

### 3.1 Architecture: three tiers, not two

| Tier | What it is | Language |
| --- | --- | --- |
| Frontend | Browser application built on the **Lumino** widget/command framework | TypeScript |
| Server | `jupyter_server` — Tornado HTTP + WebSocket. Owns the filesystem and the notebook document. | Python |
| Kernel | A **separate OS process** (`ipykernel`), speaking ZMQ to the server | Python |

**The browser never talks to the kernel directly.** All kernel traffic is proxied through
`jupyter_server`. This matters constantly: any UI element that needs to know a DataFrame's column
names must make an asynchronous round trip, and it only works while a kernel is running.

### 3.2 Notebook format (nbformat v4)

**Cell metadata is open.** Every cell type declares `"additionalProperties": true` on its
`metadata` object. Arbitrary JSON-serialisable data round-trips through save. The spec explicitly
instructs authors to namespace their keys — so Sandor uses `metadata.sandor.*`.

**Cell type is closed.** This is the single most important constraint discovered during planning:

- Each of `raw_cell`, `markdown_cell`, `code_cell` pins `cell_type` to a **single-value enum**.
- Each also sets **`"additionalProperties": false` on the cell object itself**.
- An `unrecognized_cell` forward-compatibility clause exists, but a notebook using it fails
  `nbformat.validate()`, and nbconvert / GitHub preview / VS Code / Colab / nbdime will not render
  it.

**Consequence:** you cannot invent a new `cell_type`. **Forking JupyterLab would not change this** —
it is an nbformat ecosystem constraint, not a JupyterLab one. This removed what would otherwise have
been the strongest argument for forking.

Also relevant: cell `id` is constrained to `^[a-zA-Z0-9-_]+$`, 1–64 characters. Multi-line fields
such as `source` may be serialised on disk either as a single string or as a list of strings; both
must be tolerated.

### 3.3 Extension points confirmed to exist

- **`@jupyterlab/notebook:IContentFactory`** — "a factory object that creates new notebooks."
  Provided by the core plugin `@jupyterlab/notebook-extension:factory`, which "provides the notebook
  and cell factory." An extension may disable a core plugin and supply its own implementation of the
  same token. **This is the hook that makes custom cell UI possible.**
- `@jupyterlab/notebook:INotebookTracker` — iterate and interact with open notebooks.
- Side panels — `app.shell.add(widget, 'left' | 'right', { rank })`. Shell areas: `top`, `menu`,
  `left`, `right`, `main`, `down`, `bottom`, `header`. Rank convention: 0–500 first-party, 501–899
  third-party, 900 default.
- `IToolbarWidgetRegistry` — toolbar items, including a `Cell` factory, configurable from settings.
- Commands (`app.commands.addCommand`), command palette (`ICommandPalette`), context menu, main menu
  (`IMainMenu`), keyboard shortcuts, `ILauncher`, status bar.
- `IStateDB` for frontend state persistence, `IThemeManager` for themes.
- `@jupyterlab/notebook:INotebookCellExecutor` — the cell executor, overridable.
- Kernel **subshells** — `kernel.supportsSubshells`, `requestCreateSubshell`. A newer Jupyter feature
  for concurrent execution alongside a busy kernel. Relevant to keeping the UI responsive.

### 3.4 Hiding cell input is a standard feature

`metadata.jupyter.source_hidden = true` is a first-class nbformat field honoured by core JupyterLab,
which renders the cell with its native collapsed-input bar. `Cell.inputHidden` is the public
TypeScript API backed by it.

**Sandor uses this standard field rather than a private one.** Result: with the extension, the cell
shows the Sandor form plus a disclosure toggle; without it, the cell shows JupyterLab's own tidy
collapsed bar. One field, no divergence, nothing to migrate.

### 3.5 Current versions (checked 2026-08-18, PyPI)

| Package | Version | Note |
| --- | --- | --- |
| `jupyterlab` | **4.6.3** | `requires_python >=3.10`; classifiers list 3.10–3.14 |
| `notebook` | **7.6.2** | depends on `jupyterlab>=4.6.3,<4.7` |
| `jupyter-collaboration` | **5.0.0** | metapackage; supports `jupyterlab>=4.6,<5` |

No JupyterLab 5 release exists yet.

**Notebook 7 literally depends on JupyterLab** — concrete confirmation that it is an alternative
*assembly of JupyterLab plugins*, not a separate product. This is the same mechanism referenced in
Decision D1's escalation path.

---

## 4. Architectural decisions

### D1 — Build an extension, not a fork `DECIDED`

JupyterLab core is itself nothing but a set of plugins registered against a small `JupyterFrontEnd`
object (a command registry, a shell, and a service/token graph). The file browser is a plugin. The
notebook is a plugin. There is no privileged "core" that forking would unlock.

**Costs of forking, all avoided:** perpetual merge conflicts against a large fast-moving TypeScript
monorepo; `pip install jupyterlab` stops being the install path; every upstream security patch
becomes an integration project; contributors must build the whole monorepo; third-party extensions
(LSP, git, debugger, variable inspector) become a compatibility burden.

**What the extension route genuinely constrains:** limited to public tokens (some behaviour is only
reachable through semi-private APIs that can shift on minor upgrades); deep surgery on the shared
document model is awkward from outside; CSS/DOM overrides against core styling are brittle.

None of these block anything Sandor needs.

**Escalation path, so forking never becomes tempting:** a **custom JupyterLab distribution** — an
app built with `jupyterlab` as a *library*, bundling core plugins plus Sandor's, with custom
branding, a disabled-plugin list, and default settings. This is how **Notebook 7** and **JupyterLite**
are built. It reuses 100% of the extension work. Forking is never the answer.

### D2 — A "custom cell" is a `code` cell plus namespaced metadata `DECIDED`

Forced by Section 3.2. A Sandor cell is an ordinary `code` cell carrying `metadata.sandor.*`, with a
custom widget rendering a form in place of the editor.

### D3 — Code is the source of truth; metadata is a cache `DECIDED`

Two options were weighed:

- **Option A** — config lives in cell metadata; cell source is hidden or generated.
- **Option B** — config *is* the code: the UI is a two-way editor over a readable Python call.

**Option B chosen**, because: the notebook still runs for someone without the extension; `git diff`
shows meaningful changes rather than a JSON metadata blob; the UI becomes optional convenience; and
years of analysis notebooks survive a JupyterLab upgrade that breaks the extension.

Option B is viable only because the owner's requirement permits it — *"when I reopen the ipynb the
selections are already there and all I have to do is run the python kernel."* Re-running is
acceptable.

**Two rules make Option B safe.** They are not optional; they are what prevents the classic
codegen-UI failure mode.

**Rule 1 — never parse arbitrary Python.** Generated code is constrained to one canonical shape: a
single call whose configuration is a **pure literal** (dict / list / str / num / bool only).
Extraction is then `ast.parse` → locate the literal node → `ast.literal_eval`. A total function with
one clear failure mode, not a Python interpreter.

**Rule 2 — hash-detected divergence, never silent overwrite.**

- `metadata.sandor.config` holds the config **as a cache**.
- `metadata.sandor.source_hash` holds a hash of the code that config generates.
- **On open:** hash the actual cell source. **Match** → trust the metadata, render the UI instantly,
  no kernel needed. **Mismatch** → the cell was hand-edited. Show a banner
  (*"this cell was edited by hand — [re-adopt into UI] / [keep as plain code]"*) and **leave the
  user's code completely untouched**.

This yields A and B simultaneously from one mechanism: code is truth, metadata is a fast path, and
the hash is the honesty check. It also lets the UI populate at page load with no kernel running —
something pure Option B cannot otherwise do.

Option A survives as a degenerate case: a pure-metadata cell type is the same cell with a no-op
code emitter. `PARALLEL`

### D4 — Emitter B1 first; B2 and B3 as pluggable variants `DECIDED` / `PARALLEL`

The transform between config and code is a **matched pluggable pair**: `ConfigEmitter` (config →
code) and `ConfigExtractor` (code → config). Rule 2's hash check is emitter-agnostic and works
unchanged across all of them.

**B1 — `sandor.plot(...)`. Primary. Build this first.** `DECIDED`

```python
sandor.plot(df, config={  # sandor:plot-config
    "x": "time",
    "traces": [{"signal": "veh_speed", "axis": "y1", "color": "#1f77b4"}],
    "title": "Speed vs RPM",
})
```

One pure literal; data bound by signal name inside the package. Clean to generate, clean to parse.
Requires the `sandor` package — an accepted cost, since Python packages are needed for preprocessing
regardless.

**B2 — raw Plotly with a literal spec.** `PARALLEL`
A Plotly figure *is* a JSON spec (`data` + `layout`), so `go.Figure({...})` is dependency-light. The
catch is data: a literal spec with 80,000 points inlined per trace is unusable, so B2 unavoidably
needs an explicit binding step, adding visible boilerplate and more surface to hand-break.

**B3 — natural Plotly code with live DataFrame references.** `PARALLEL`

```python
fig = go.Figure(
    data=[...x=df['signal_1'], y=df['signal_2']...],
    layout=go.Layout(...),
)
```

The most idiomatic to read, and the most fragile: not a literal, so extraction needs real AST
analysis and hand-editing breaks it easily. Explicitly accepted as a later experiment.

### D5 — A JupyterLab extension, not anywidget `DECIDED`

`anywidget` was evaluated and rejected as the foundation. Reasons, all confirmed:

- **Widgets live in the output area.** They require code in the cell to create them — the opposite
  of the no-code goal — and the Plotly UI cell must *also* emit a figure, giving two outputs.
- **A widget cannot supportably edit its own cell's source.** It sits in a sandboxed output DOM
  subtree; reaching up into the notebook document breaks in VS Code, Colab, and nbconvert.
- **No real cross-session memory.** Only "Save Widget State", which serialises model state into
  notebook-level metadata — intended for static rendering, brittle, and still needs a kernel to
  re-animate.
- **The observed lag is real and has a concrete cause.** Every ipywidgets state change round-trips
  browser → WebSocket → `jupyter_server` → ZMQ → kernel → back, on a single-threaded kernel. A
  TypeScript extension keeps control state local and crosses that boundary only when it needs data.

**Decisive point:** with the extension, the **UI lives in the input area and the figure is the single
normal output**. The two-outputs objection disappears entirely.

For reference, since it may still be useful for isolated widgets later:

| | Widget (ipywidgets / anywidget) | Lab extension |
| --- | --- | --- |
| Lives in | the cell's **output area** | the app **chrome** (cell UI, panels, menus) |
| Appears | after the cell is run | at page load, no kernel |
| Language | Python + a small ESM JS file | TypeScript, build tooling, Lumino |
| Portability | JupyterLab, Notebook, VS Code, Colab, marimo | JupyterLab / Notebook 7 only |
| Effort | days | weeks–months |

### D6 — The JavaScript extension must never be required to run a notebook `DECIDED`

A standing rule. The Python package *is* required — generated code calls into it — but the
TypeScript is pure convenience. Every design choice must preserve this. It is what keeps the project
safe across JupyterLab upgrades, and (per Section 11) what makes a VS Code port conceivable at all.

### D7 — Plain DataFrames; no wrapper class `DECIDED`

A `(frame, metadata)` dataclass was proposed to avoid `df.attrs` propagation being best-effort and
inconsistent across pandas operations and versions. **Rejected** on the grounds that a custom class
reduces universality.

**Accepted mitigation, to be implemented:** safeguards inside the analysis functions — a decorator or
context manager that re-attaches `attrs` around operations known to drop them, plus tests asserting
survival. Frames stay plain.

*Known risk, recorded deliberately:* silent loss of test provenance metadata remains possible where a
code path bypasses the safeguards.

### D8 — The extension talks to a `DataSource` interface, never to `pandas.DataFrame` `DECIDED`

The highest-leverage modularity decision on the data side. Free now, expensive later.

```python
class DataSource:
    def list_signals(self) -> list[SignalInfo]: ...   # names, dtypes, units — cheap, no bulk load
    def get_signals(self, names, time_range=None): ...  # only what is actually needed
```

The v1 implementation may be the crudest possible — load the whole frame into pandas and slice it.
Lazy and columnar backends then drop in behind the same interface **without a single line changing in
the TypeScript**.

### D9 — Three backend extension points, with a routing rule `DECIDED`

There are three distinct places to put Python behaviour. They are easy to conflate; this table is
the routing rule.

| # | Mechanism | What it is | Use it for |
| --- | --- | --- | --- |
| **i** | **Server extension** | A Python package extending `jupyter_server`. Runs in the server process, adds REST/WebSocket endpoints. Notebook- and kernel-independent, always available. | The global signal dictionary; file discovery and metadata; "which loaders handle this file"; caches shared across notebooks and users; configuration. |
| **ii** | **Kernel comms** | The `Comm` protocol (`jupyter_client`). The TypeScript extension opens a named channel to the running kernel; a Python companion registers a handler and replies with JSON. This is the machinery ipywidgets is built on, used directly. | Anything touching the user's **live objects**. Only the kernel knows what `df` is. |
| **iii** | **Kernel bootstrap** | Executing a silent setup snippet on notebook open (`kernel.requestExecute({code, silent: true, store_history: false})`), or shipping a custom kernelspec. | So users never have to type `import sandor`. |

**Routing rule:** *needs the user's live variables → comms (ii); global, config, or file-level →
server extension (i).*

Worked examples:

- *Dropdown lists DataFrames; selecting one runs Python and returns a summary* → **(ii)**.
- *Global JSON signal dictionary standardises column names; dropdowns show canonical names* →
  **(i)** holds the dictionary, **(ii)** applies it to the actual frame, the UI merges both.
- *Functions invoked when a file is selected in the frontend* → **(i)** for "which loaders apply",
  **(ii)** to load into the kernel namespace.

**Make all of these registries, not hardcoded lists** — `@register_loader(".tdms")`,
`@register_transform("resample")` — so deferred preprocessing work plugs in later without touching
the extension.

**Avoiding a frozen UI.** A comm handler runs on the kernel's event loop, so a long blocking call
*will* stall it. Three outs, in increasing order of effort:

1. Run heavy work in a thread or process pool inside the Python companion.
2. Put it in the **server extension** instead — a separate process entirely.
3. Use **kernel subshells** (§3.3), built precisely for concurrent execution alongside a busy kernel.

Comms are asynchronous, so a "loading…" indicator is straightforward in all three cases.

### D10 — JupyterLab 4.x is the primary target; Notebook 7 partially `DECIDED`

The same prebuilt extension serves both. The real difference: Notebook 7 is deliberately
single-document, with no dockable side panels and no multi-tab workspace.

- **Works in both:** custom cell UI, the show/hide-code toggle, the cell toolbar.
- **JupyterLab only:** side panels, the drag-from-library palette.

Pin against `jupyterlab>=4.6,<5`.

### D11 — Adopt the shared-model API now; defer RTC `DECIDED` / `DEFERRED`

**RTC** = Real-Time Collaboration, the `jupyter-collaboration` extension. Google-Docs-style editing
where several people *or processes* work on one notebook simultaneously with live cursors. The
document stops being "a file on disk loaded into memory" and becomes a **Yjs CRDT**
(Conflict-free Replicated Data Type) — a shared structure synced over a websocket, with the
authoritative copy held by `jupyter_server_ydoc`.

**Not enabled for now.** Its limitations, recorded for the eventual decision:

- All writes must go through the shared-model API (`cell.sharedModel.setSource(...)`,
  `setMetadata(...)`) rather than direct mutation.
- Concurrent edits to the same config can merge badly — CRDTs merge *text* character-wise, which for
  a structured literal can produce nonsense rather than clean last-writer-wins. Needs a mitigation
  (regenerate-from-config on conflict, or a soft lock).
- Undo/redo gains shared-history semantics.
- The hash cache must react to remote changes — observe the shared model's change signal rather than
  computing once at load.
- Runtime cost: a persistent websocket plus a server-side document store; heavy with large outputs.

**The free option, which IS decided:** the first bullet is already the correct JupyterLab 4 API even
with RTC switched off. **Write every document mutation through the shared-model API from day one.**
Enabling RTC later then becomes a config change plus conflict-policy work, not a rewrite.

RTC is also the clean answer to live AI editing (§9) — worth revisiting when that becomes a priority.

### D12 — One JSON Schema, three consumers `DECIDED`

Write **one JSON Schema** for the plot config, committed at a known path. It then serves:

1. The **TypeScript UI** — type generation and form validation.
2. The **Python package** — runtime validation with clear error messages.
3. **AI agents** — constrained generation, plus a validator that catches mistakes before they reach
   the notebook.

Probably the single most valuable artifact in the project. It should be an early deliverable, not an
afterthought.

### D13 — Metadata is always derivable from code, never the reverse `DECIDED`

The rule that makes D3 hold. Any writer — human, UI, or agent — only ever touches **one** place: the
code. Metadata is a cache, and caches are always rebuildable.

### D14 — The plot cell discovers DataFrames by kernel introspection `DECIDED`

The plot cell must **not** hold a reference to a load cell. It introspects the kernel namespace for
live DataFrames.

Consequence: `df = pd.read_csv(...)` typed by hand today and a Sandor load cell built in month three
are **indistinguishable** to the plot cell. This is what buys the modularity, and it costs nothing to
honour now.

### D15 — Keep the TypeScript layer thin `DECIDED`

Driven by the JupyterLab 5 migration risk (§10). Logic belongs in Python; core-API touchpoints are
confined to a small adapter module. A future major migration then becomes "fix the adapter", not
"rewrite the extension".

### D16 — Documentation and commenting standard `DECIDED`

The owner has extensive C/C++ and Python experience and **limited JavaScript / web experience**.
Therefore, as a hard rule and not a preference:

- Comment everything generously.
- Explain JavaScript, TypeScript, and web concepts **inline where they appear**, rather than
  assuming them.
- Prefer clarity over cleverness in the TS layer.
- Professional structure throughout: proper folder layout, dependency isolation, lockfiles, linting,
  formatting, tests, CI-ready.
- Design every component as modular and ready for future upgrades.

---

## 5. The custom cell contract

The concrete shape of a Sandor cell. This is the interface everything else depends on.

```jsonc
{
  "cell_type": "code",                    // always — see §3.2
  "id": "abc123",
  "metadata": {
    "jupyter": {
      "source_hidden": true               // standard field, so vanilla JupyterLab agrees — §3.4
    },
    "sandor": {
      "type": "plot",                     // which custom cell type; drives which widget renders
      "version": 1,                       // schema version of this metadata block
      "emitter": "b1",                    // which ConfigEmitter produced the source — D4
      "config": { /* ... */ },            // CACHE ONLY — code is truth (D3, D13)
      "source_hash": "sha256:...",        // hash of the code `config` generates — Rule 2
      "ui": { /* panel open/closed, etc. */ }  // UI-only state; worthless to lose
    }
  },
  "source": ["sandor.plot(df, config={  # sandor:plot-config\n", "    ...\n", "})"],
  "outputs": [],
  "execution_count": null
}
```

**The marker comment** `# sandor:plot-config` is a stable, unambiguous anchor so that regex-based
tools and AI agents can locate the literal without parsing.

**Load-order behaviour:**

| Situation | Behaviour |
| --- | --- |
| Hash matches | Trust `metadata.sandor.config`; render the UI immediately; no kernel needed. |
| Hash mismatches | Show the hand-edited banner. **Never** modify the user's source. Offer *re-adopt* or *keep as plain code*. |
| No `sandor` metadata | Ordinary code cell. Untouched. |
| Extension absent | JupyterLab's native collapsed-input bar; the cell runs normally. |

**Cold open with no kernel** `DECIDED`: the UI shows *last-known* signal/column lists from the
metadata cache, visibly marked as stale, until a kernel runs and refreshes them. This is exactly what
the hash-cache design is for.

**Duplication:** JupyterLab's cell copy/paste already carries metadata and regenerates the `id`, so
duplicating a configured cell works out of the box. A duplicate button in the cell toolbar is a
convenience on top.

**Ways to add a custom cell** `DECIDED` — all three:

1. The toolbar `+` dropdown
2. The command palette
3. A side-panel cell library (drag-from)

The first two are cheap — they invoke the same command. Only the side-panel library is real extra
work, and per D10 it is JupyterLab-only.

---

## 6. Planned cell types

| Cell type | Purpose | Emits | Status |
| --- | --- | --- | --- |
| **Plot** | The Plotly UI grapher. The flagship. | `sandor.plot(df, config={...})` | First to build |
| **Data source** | File picker → format detection → loader options → variable binding. Needs server extension (i) to list files and probe signals with no kernel and no load. | `df = sandor.load("data/test.tdms", options={...})` | `DEFERRED` |
| **Function** | Generic wrapper — call a registered function with UI-entered arguments such as signal names. | varies | `DEFERRED` |
| **Table** | Tabular output / summary statistics. | TBD | `DEFERRED` |

---

## 7. Performance strategy

### 7.1 Correct diagnosis

Dash and Panel were rejected partly for slowness with large files, but JupyterLab's frontend is not
what is slow with a multi-gigabyte TDMS file. The real bottlenecks, in order:

1. Parsing / IO of the source format
2. In-memory footprint
3. Shipping millions of points over a WebSocket into the browser's plotting engine

Dash and Panel are slow for the *same* reasons; none of them solve (3) for you.

### 7.2 The chosen approach `DECIDED`

**Column-selective loading with heavy work kernel-side.** The frontend retrieves only lightweight
metadata (column names, dtypes, units). When the user makes a selection, only those columns are
loaded and sent. **The full DataFrame is never sent to the frontend.** This aligns with D3 — what
happens underneath is Python code running.

Long operations run off the kernel's event loop (§D9) with a loading indicator in the UI.

### 7.3 Scale

Working target: a final DataFrame of **up to ~1 GB RAM**. As a reference point, 80,000 rows × 400
float64 columns ≈ 256 MB — comfortable. Source files may be substantially larger in less efficient
formats. Data is mostly numeric time series, but **strings and state channels also occur** and must
be handled (likely `category` dtype, and step-style rendering for states).

### 7.4 Deferred performance work

All `DEFERRED`, all must remain possible:

- **Parquet / Arrow caching.** Parse the source format once, persist columnar, then column-selective
  reads are near-free and native rather than hand-built per format.
- **Lazy loading** — reading columns from files at will without loading them into RAM. Confirmed
  feasible via: PyArrow/Parquet `read(columns=[...])`; Polars `scan_parquet()` / `scan_csv()` with
  projection and predicate pushdown; DuckDB SQL directly over on-disk Parquet/CSV; npTDMS
  `TdmsFile.open()` channel streaming; `asammdf` per-channel `get()`; NumPy `memmap` for flat
  binaries.
- **Resampling / decimation** for over-large columns — e.g. `plotly-resampler`, which aggregates
  relative to the current view using `MinMaxLTTB`, sending ~1000 points per trace and re-aggregating
  on pan/zoom (its example notebook plots 110 million points). Caveats: only `Scatter`/`Scattergl`
  traces are resampled; static `.show()` export loses interactivity; `FigureWidgetResampler` runs on
  the IPython main thread, so a long computation blocks resampling.

D8's `DataSource` interface is what makes all of these droppable in later.

---

## 8. Signal name handling `DEFERRED`

Deferred by decision, but the mechanism is settled: this is a **Python-side problem**, not a UI
problem.

What is needed is a **signal alias registry**: canonical name → per-vehicle / per-source aliases,
plus units, dtype, and a resolution order. Resolve with explicit precedence — exact match →
vehicle-specific alias table → pattern rules → **fail loudly with suggestions**.

Once it exists as a plain Python API, the UI dropdowns are simply a view over it, vehicle-agnostic
functions stay vehicle-agnostic, and per-file alias tables carry the particularities. Per D9 it lives
in the **server extension (i)** as global configuration, with kernel-side resolution (ii) applying it
to actual frames.

Likely the highest daily-pain-to-effort ratio in the project, and it is independent of every UI
decision — so it can be built at any time.

---

## 9. AI agent editing of notebooks

### 9.1 How agents edit notebooks today

1. **Plain text editing of the `.ipynb`** — most common, and the fragile one.
2. **Cell-aware tooling** — e.g. Claude Code's `NotebookEdit`, which operates at cell granularity
   (path, cell id, replace/insert/delete) and handles the JSON structure itself. The sane version
   of (1).
3. **`nbformat` via a script** — read, mutate, validate, write.
4. **The `jupyter_server` contents API** — REST, so a running server mediates the write.
5. **MCP servers for Jupyter** — expose add-cell / execute-cell / read-output against a live server
   and kernel, so the agent sees execution results, not just text. *Confidence: moderate; verify
   current state before relying on this.*

**Do not let an agent hand-edit the raw JSON as text.** Traps: `id` uniqueness, required keys per
cell type (`outputs` and `execution_count` on code cells), `nbformat` / `nbformat_minor`, and the
source-as-list-of-strings convention. Prefer `nbformat`, or better a typed Sandor API
(`sandor.notebook.add_plot_cell(nb, config)`) so cells are valid **by construction**.

### 9.2 Metadata vs code for agents — a false dichotomy

Under B1 the `config={...}` literal **is** JSON, textually; it merely lives inside a Python call
rather than in the metadata block. So "an AI edits a JSON" is satisfied either way.

Comparing the actual work required:

- **Metadata route:** locate the cell in the notebook JSON → edit `metadata.sandor.config` →
  regenerate the source to match → recompute the hash. Three coupled edits; miss one and the cell
  opens showing the hand-edited banner.
- **Code route:** edit one dict literal in the cell source. Done — the extension recomputes config
  and hash on load.

**The code route is strictly easier for an agent**, which is the opposite of intuition. So D3 wins on
both the human and the AI axis, and D13 is what guarantees it.

Additionally, asking an LLM to write deep `plotly.graph_objects` code is error-prone, whereas
emitting a JSON config against a schema is among the most reliable things models do. **The
architecture is already unusually AI-friendly** — D12's schema is what an agent generates against.

### 9.3 Known unsolved problem `OPEN`

**The "file changed on disk" conflict.** If an agent writes the `.ipynb` while it is open in
JupyterLab, JupyterLab detects the change and prompts to revert or overwrite, risking lost work.

Three possible resolutions: edit only while the notebook is closed; route writes through the
`jupyter_server` contents API; or enable **RTC** (D11), where the agent becomes another participant
in the shared document and edits appear live with no dialog.

**Owner's position:** this problem is not acceptable, but resolving it is postponed. Revisit
alongside D11.

---

## 10. JupyterLab 5 migration risk

Sandor's extension is compiled TypeScript importing from `@jupyterlab/*`. Several of those —
`@jupyterlab/application`, `@jupyterlab/notebook`, `@lumino/widgets` — are **singletons**: exactly
one copy may exist on the page, shared between the host app and every extension via Webpack Module
Federation. The extension binds to whatever the app provides rather than bundling its own.

A major version bump is therefore a compatibility break by construction: semver majors are where
Jupyter is permitted to change APIs (renamed tokens, changed interfaces, removed deprecations);
Lumino usually bumps major simultaneously and is also a singleton; and the build toolchain
(`@jupyterlab/builder`) must match the target major.

**Precedent:** the 3→4 migration included a full CodeMirror 5→6 rewrite, Lumino 1→2, a reworked
shared-document layer, and a new toolbar registry. Weeks of work for a non-trivial extension.

**Mitigation:** D15 — thin TypeScript, logic in Python, core-API touchpoints confined to one adapter
module.

---

## 11. Deployment, and a note on VS Code

### 11.1 Deployment `DECIDED` in principle

Target scenario: Sandor runs on a machine holding the heavy files; an engineer connects and views
reports on them. This is standard **JupyterHub** — each engineer gets their own kernel, and the
extension installs server-side as a pip package.

Two caveats:

- Each concurrent engineer multiplies RAM for loaded frames — an argument for the server-extension
  shared cache (D9-i).
- If engineers should only *read* reports rather than edit them, **Voilà** renders a notebook as a
  code-free dashboard. A natural export target for the no-code goal, distinct from the authoring
  environment.

Report/export outputs: figures as ordinary Plotly cell outputs rendered by JupyterLab's standard
mimetype renderer — **not** drawn by the extension. That way `nbconvert --no-input` and HTML export
work for free, and the notebook remains viewable without Sandor. Classical outputs (images, HTML,
tables) come along at no cost, since these are real code cells.

### 11.2 VS Code port — *not in scope; recorded for reference only*

Explicitly **out of scope** for this project. Recorded because the answer validates D3 and D6.

- **The Python layer ports at 100%** — package, loaders, `DataSource`, codegen/extraction, schema.
  That is most of the engineering.
- **The flagship UX is not reproducible.** Verified against the official VS Code notebook API guide:
  cells "are rendered within the core of VS Code", and renderers are **output-only**, drawing into a
  supplied output element inside a sandboxed iframe. There is no hook for the cell *input* area. Not
  hard — unavailable.
- **What you would build instead:** a side-panel webview inspecting the selected cell, reading its
  source, rendering the form, and writing the modified source back (extensions can edit cell content
  via `WorkspaceEdit` / `NotebookEdit`). Same architecture, side panel instead of inline.
- **Rough cost:** ~30–40% of total project effort, all frontend, worse UX.

**The point worth keeping:** B1 is what makes a port possible at all. Because code is the source of
truth, any editor that can rewrite cell text can host a Sandor UI, and the notebooks stay fully
functional in VS Code with no extension. Under metadata-as-truth, nothing would port and the
notebooks would look empty outside JupyterLab.

---

## 12. Rejected options register

Do not re-propose these without new information.

| Option | Why rejected |
| --- | --- |
| **Forking JupyterLab** | No capability gain — core is just plugins (D1). Would *not* enable custom `cell_type` (§3.2). Enormous perpetual maintenance cost. Escalation path is a custom distribution, not a fork. |
| **Dash** | Produces an *app*, not a runnable configuration file (§1.3). Slow with large files and large apps. |
| **Holoviz Panel** | Same as Dash. |
| **marimo** | Offers similar things to Panel and is not enough: no custom menus/panels, no no-code cell UIs. Reactive model is a large behaviour change. (Its merits — pure `.py` files, first-class UI elements, git-diffable — were considered.) |
| **anywidget / ipywidgets as the foundation** | Output-area only; needs code to instantiate; two outputs; cannot supportably edit cell source; no real cross-session memory; measurable lag from kernel round-trips (D5). Still fine for isolated widgets. |
| **A new `cell_type` in nbformat** | Schema pins `cell_type` to single-value enums and sets `additionalProperties: false` on the cell object. Breaks validation, nbconvert, GitHub, VS Code, Colab, nbdime (§3.2). |
| **A `(frame, metadata)` wrapper class instead of DataFrames** | Reduces universality (D7). Mitigated with safeguards inside functions instead. |
| **Metadata as the source of truth (Option A) as primary** | Notebook unusable without the extension; JSON diffs; lock-in; and *harder* for AI agents, not easier (§9.2). Retained as a `PARALLEL` degenerate case. |
| **plotly-resampler as the first-line performance answer** | Column-selective kernel-side loading is a better primary strategy. Resampling retained as `DEFERRED` (§7.4). |
| **Enabling RTC now** | Not needed yet; adds moving parts and CRDT merge hazards. The API discipline is adopted anyway (D11). |

---

## 13. Open questions

| # | Question | Blocks |
| --- | --- | --- |
| 1 | How to resolve the "file changed on disk" conflict for AI editing (§9.3) — contents API, closed-file editing, or RTC? | Live agent editing |
| 2 | Exact JSON Schema for the plot config (D12) — the concrete field set. | The first vertical slice |
| 3 | Whether RTC (D11) is eventually enabled. Tied to #1. | Conflict policy design |
| 4 | Precise scope of the first vertical slice. | Start of implementation |

---

## 14. Glossary

Written for a reader strong in C/C++ and Python but new to the JavaScript/web ecosystem (D16).

| Term | Meaning |
| --- | --- |
| **TypeScript (TS)** | JavaScript with static types, compiled ("transpiled") to JavaScript. Roughly what C++ is to C in terms of added guarantees. |
| **Lumino** | The widget, layout, and command framework JupyterLab's UI is built on. Predates and is independent of React. |
| **Plugin / extension** | A unit of JupyterLab functionality. Core JupyterLab is itself a collection of these. |
| **Token** | A typed identifier used for dependency injection between plugins. A plugin `provides` a token; others `require` it. Replacing a core feature means disabling its plugin and providing the same token. |
| **Prebuilt (federated) extension** | An extension shipped pre-compiled inside a pip package. Installing it needs no Node.js and no JupyterLab rebuild. The distribution format Sandor will use. |
| **Module Federation** | The Webpack mechanism letting the app and extensions share single instances of common libraries at runtime. The reason singleton package versions must line up (§10). |
| **Singleton package** | A library of which exactly one copy may exist on the page, e.g. `@jupyterlab/application`, `@lumino/widgets`. |
| **ESM** | ECMAScript Modules — the standard JavaScript module format (`import` / `export`). |
| **Comm** | The Jupyter protocol for a named message channel between frontend and kernel. What ipywidgets is built on; Sandor uses it directly (D9-ii). |
| **ZMQ (ZeroMQ)** | The messaging library `jupyter_server` uses to talk to kernel processes. |
| **Kernel** | The separate OS process actually executing Python. Single-threaded per execution unless subshells are used. |
| **Subshell** | A newer Jupyter feature allowing concurrent execution alongside a busy kernel. |
| **nbformat** | The `.ipynb` JSON specification, and the Python library that reads/writes/validates it. |
| **Mimetype renderer** | The frontend component that turns an output of a given MIME type into a visual. Plotly figures render this way. |
| **CRDT** | Conflict-free Replicated Data Type — a data structure that merges concurrent edits deterministically without a central lock. The basis of RTC. |
| **Yjs / ydoc** | The specific CRDT implementation Jupyter uses for real-time collaboration. |
| **AST** | Abstract Syntax Tree — the parsed structure of source code. Python's `ast` module is how Sandor extracts config literals (D3, Rule 1). |
| **`ast.literal_eval`** | Safely evaluates a Python *literal* only (dict/list/str/num/bool). Cannot execute arbitrary code — which is exactly why Rule 1 constrains generated code to literals. |
| **Voilà** | Renders a notebook as a code-free dashboard for read-only consumers. |
| **JupyterHub** | Multi-user Jupyter server; each user gets their own server and kernels. |
| **nbconvert** | Converts notebooks to HTML/PDF/etc. `--no-input` hides code. |
| **TDMS** | National Instruments binary measurement format. Python: `npTDMS`. |
| **MDF / MF4** | ASAM measurement data format, the automotive standard. Python: `asammdf`. |
| **Parquet / Arrow** | Columnar storage / in-memory formats. Columnar means reading three columns out of four hundred is cheap. |

---

## 15. Sources

Verified during planning on **2026-08-18**. Web search was unavailable (blocked by org policy);
these were fetched directly.

| Claim | Source |
| --- | --- |
| Extension points, `IContentFactory`, shell areas, toolbar registry, subshells | `https://jupyterlab.readthedocs.io/en/latest/extension/extension_points.html` |
| Cell types, metadata rules, round-tripping, namespacing guidance | `https://nbformat.readthedocs.io/en/latest/format_description.html` |
| `cell_type` enums, `additionalProperties: false` on cells, `additionalProperties: true` on metadata, `cell_id` pattern | `https://raw.githubusercontent.com/jupyter/nbformat/main/nbformat/v4/nbformat.v4.schema.json` |
| anywidget capabilities and environments | `https://anywidget.dev/en/getting-started/` |
| plotly-resampler behaviour, scale, limitations | `https://github.com/predict-idlab/plotly-resampler` |
| Version numbers and dependency ranges | `https://pypi.org/pypi/{jupyterlab,notebook,jupyter-collaboration}/json` |
| VS Code notebook API — cells rendered by core, renderers output-only | `https://code.visualstudio.com/api/extension-guides/notebook` |

**Unverified, flagged as such:** the current state of Jupyter MCP servers and `jupyter-ai` (§9.1);
the precise availability of VS Code cell status-bar and cell-edit APIs, which are real but were not
on the fetched page (§11.2).

---

## 16. Changelog

| Date | Change |
| --- | --- |
| 2026-08-18 | Document created from the initial planning conversation. Decisions D1–D16 recorded. |
