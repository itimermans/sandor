// ============================================================================
// jest.config.js -- configuration for the fast TypeScript unit-test suite.
//
// Run with:  uv run jlpm test
//
// This file is itself plain CommonJS JavaScript, not TypeScript, and runs in
// Node -- not in the browser. `module.exports = ...` is Node's original module
// system (predating `import`/`export`); Jest reads this file with `require`, so
// it must use that older style.
// ============================================================================

// `require(...)` is the CommonJS import. JupyterLab publishes a ready-made Jest
// configuration that already knows how to compile TypeScript, stub out CSS and
// SVG imports, and provide the browser globals JupyterLab code expects. Reusing
// it means we do not have to understand any of that.
const jestJupyterLab = require('@jupyterlab/testutils/lib/jest-config');

// ---------------------------------------------------------------------------
// The ES-module problem, which is worth understanding because it produces the
// single most confusing error message in this toolchain.
//
// Node has two incompatible module systems: CommonJS (`require`) and ESM
// (`import`). Jest runs tests as CommonJS. Most of node_modules is CommonJS and
// works untouched -- so by default Jest skips transformation of node_modules
// entirely, for speed.
//
// But the packages below ship as ESM only. Left untransformed, Node hits their
// `export` keyword and throws `SyntaxError: Unexpected token 'export'` from a
// file deep inside node_modules that you never wrote. The fix is to force Jest
// to transform exactly these packages -- which is what the `join('|')` into a
// regex alternation and the negative lookahead further down accomplish.
//
// If you add a dependency and get that error, the package name goes in here.
// ---------------------------------------------------------------------------
const esModules = [
  '@codemirror',
  '@jupyter/ydoc',
  '@jupyterlab/',
  'lib0',
  'nanoid',
  'vscode-ws-jsonrpc',
  'y-protocols',
  'y-websocket',
  'yjs'
].join('|');

// `__dirname` is a Node global: the absolute path of the directory containing
// this file. JupyterLab's helper needs it to resolve paths relative to the repo.
const baseConfig = jestJupyterLab(__dirname);

module.exports = {
  // `...baseConfig` is the spread operator: copy every property of baseConfig
  // into this new object. Properties written afterwards override the copies.
  // It is the JS idiom for "inherit these defaults, then change a few" --
  // roughly Python's `{**base, 'key': value}`.
  ...baseConfig,

  // Do not auto-replace every import with a mock. Auto-mocking makes tests that
  // pass while testing nothing; explicit `jest.mock()` where genuinely needed
  // is far easier to reason about.
  automock: false,

  // Which files count towards the coverage report. A leading `!` excludes.
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts', // type declarations contain no executable code
    '!src/**/.ipynb_checkpoints/*' // Jupyter's autosave copies -- never real source
  ],

  // `lcov` writes a machine-readable report to coverage/ (for CI and editors);
  // `text` prints the summary table in the terminal.
  coverageReporters: ['lcov', 'text'],

  // Which files are tests. Note the shape: `src/`, then AT LEAST ONE directory,
  // then `<something>.spec.ts`. A file at `src/foo.spec.ts` would NOT match --
  // tests must live in a subdirectory such as `src/__tests__/`.
  testRegex: 'src/.*/.*.spec.ts[x]?$',

  // "Skip transformation for everything in node_modules EXCEPT the ESM packages
  // listed above." `(?!...)` is a negative lookahead: match only where the
  // following text is not one of those names. This is the second half of the
  // ES-module fix described above.
  transformIgnorePatterns: [`/node_modules/(?!${esModules}).+`]
};
