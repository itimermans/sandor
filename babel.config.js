// ============================================================================
// babel.config.js -- source transformation used by the Jest test run.
//
// WHAT BABEL IS
// -------------
// A JavaScript-to-JavaScript compiler. Its job is to take source using modern
// or non-standard syntax -- TypeScript annotations, JSX, `import`/`export` --
// and emit plain JavaScript that the target runtime understands. Here the
// target is Node, running the Jest suite.
//
// WHY THIS FILE IS ONE LINE
// -------------------------
// JupyterLab ships a Babel configuration that already handles TypeScript, JSX,
// and the ESM/CommonJS conversion that Jest needs, tuned to match the versions
// JupyterLab itself uses. Re-exporting it wholesale keeps us in lockstep with
// upstream and gives us nothing to maintain.
//
// Only add local overrides here if a Jest run fails on a syntax Babel does not
// recognise, and prefer fixing it in `jest.config.js` first -- most such
// failures are actually the ES-module issue documented there, not a Babel gap.
//
// NOTE: this affects TESTS ONLY. The shipped extension is compiled by `tsc`
// (see tsconfig.json) and bundled by webpack via `jupyter-builder`. Babel is
// not in the production build path at all.
// ============================================================================

module.exports = require('@jupyterlab/testutils/lib/babel.config');
