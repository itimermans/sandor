// ============================================================================
// eslint.config.mjs -- static analysis and style rules for the TypeScript code.
//
// Run with:
//     uv run jlpm lint:check    # report problems
//     uv run jlpm lint          # report and auto-fix what can be fixed
//
// TWO TOOLS, TWO JOBS -- they are often confused:
//   * ESLint   finds BUGS and enforces conventions ("this variable is unused",
//              "you used == instead of ===", "this interface is misnamed").
//   * Prettier enforces FORMATTING and nothing else (line width, quotes,
//              indentation). It has no opinion about correctness.
// The `prettierRecommended` entry at the bottom wires them together so they
// never fight over the same code.
//
// THE .mjs EXTENSION
// ------------------
// `.mjs` forces Node to treat the file as an ES module, so `import`/`export`
// work here even though the neighbouring `jest.config.js` and `babel.config.js`
// use CommonJS `require`/`module.exports`. Two module systems side by side in
// one repo is normal and slightly unfortunate; the file extension is what
// decides which one applies.
//
// THE ARRAY IS ORDERED
// --------------------
// This is ESLint's "flat config" format. The exported array is a list of
// configuration objects applied IN ORDER, each overriding what came before --
// like layering. That is why `prettierRecommended` is last: it must be able to
// switch off any stylistic rule an earlier layer turned on.
// ============================================================================

import js from '@eslint/js'; // ESLint's own baseline rules
import { defineConfig } from 'eslint/config'; // typing helper -- editor autocomplete
import tseslint from 'typescript-eslint'; // TypeScript parser + TS-aware rules
import prettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals'; // canonical lists of predefined globals
import jupyterPlugin from '@jupyter/eslint-plugin'; // JupyterLab house conventions

export default defineConfig([
  {
    // Layer 1: what NOT to lint. Paths are relative to this file.
    ignores: [
      'node_modules', // third-party code
      'dist',
      'coverage', // generated test reports
      '**/*.js', // config files like jest.config.js -- not our TS source
      '**/*.d.ts', // generated type declarations
      '.venv', // the Python virtualenv (uv/D17) -- may contain vendored JS
      'tests',
      '**/__tests__', // test files use Jest globals this config does not declare
      'ui-tests' // separate npm project, with its own toolchain
    ]
  },

  // Layers 2-4: preset rule sets, least to most specific.
  js.configs.recommended, // catches genuine JS mistakes
  tseslint.configs.recommended, // adds TypeScript-aware checks
  jupyterPlugin.configs.recommended, // JupyterLab-specific conventions

  {
    // Layer 5: our own settings, applied only to TypeScript sources.
    files: ['**/*.ts', '**/*.tsx'],

    plugins: {
      jupyter: jupyterPlugin
    },

    languageOptions: {
      // Declare which pre-existing global names are legitimate, so ESLint does
      // not flag them as undefined. Spread (`...`) merges three published lists:
      globals: {
        ...globals.browser, // window, document, console, fetch, ...
        ...globals.es2015, // Promise, Map, Set, Symbol, ...
        ...globals.node // process, __dirname, require, ...
      },
      parserOptions: {
        // Point at tsconfig.json so the linter can use full TYPE information,
        // not just syntax. This is what enables rules that reason about types.
        // It also means a file not covered by tsconfig's `include` will make
        // ESLint error out -- the usual cause of "file not found in project".
        project: 'tsconfig.json',
        sourceType: 'module'
      }
    },

    rules: {
      // Enforce the JupyterLab convention that interfaces are PascalCase and
      // begin with a capital `I` -- `ISettingRegistry`, `IPlotConfig`. This is
      // why JupyterLab APIs look the way they do, and Sandor should match.
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'interface',
          format: ['PascalCase'],
          custom: {
            regex: '^I[A-Z]',
            match: true
          }
        }
      ],

      // Unused variables are a warning, not an error -- they are common while
      // mid-edit. `{ args: 'none' }` exempts function parameters, because
      // callback signatures are fixed by the caller: you often must accept an
      // argument you have no use for.
      '@typescript-eslint/no-unused-vars': ['warn', { args: 'none' }],

      // `any` is permitted. Ideally rare -- see the notes in src/request.ts
      // about `any` being an unverified assertion rather than a check -- but
      // banning it outright fights JupyterLab's own API surface.
      '@typescript-eslint/no-explicit-any': 'off',

      // `namespace` is legacy TypeScript, but JupyterLab uses it heavily
      // (`ServerConnection.ISettings` is a namespace member), so allow it.
      '@typescript-eslint/no-namespace': 'off',

      // Function declarations are hoisted in JavaScript, so using one before
      // its definition is legal and often reads better.
      '@typescript-eslint/no-use-before-define': 'off',

      // Single quotes. `avoidEscape` permits double quotes in a string that
      // itself contains a single quote. Template literals (backticks) are only
      // for interpolation, not as a third quoting style.
      '@typescript-eslint/quotes': [
        'error',
        'single',
        { avoidEscape: true, allowTemplateLiterals: false }
      ],

      // Braces required on every if/for/while, even single-statement bodies.
      // This is the goto-fail rule: brace-less bodies plus a later added line
      // is a classic silent bug.
      curly: ['error', 'all'],

      // Require `===` over `==`. JavaScript's `==` performs type coercion with
      // genuinely surprising results (`'' == 0` is true, `null == undefined` is
      // true, `NaN == NaN` is false). `===` compares without coercion. Always
      // use it. This has no equivalent in C++ or Python; it is a JS-specific
      // hazard and the single most valuable rule in this file.
      eqeqeq: 'error',

      // Prefer `() => {}` over `function () {}` for callbacks. Not merely
      // stylistic: arrow functions inherit `this` from the enclosing scope,
      // while `function` rebinds it to the caller. That rebinding is a frequent
      // source of "why is `this` undefined?" inside class methods.
      'prefer-arrow-callback': 'error'
    }
  },

  // Layer 6, last: run Prettier as a lint rule and disable every ESLint rule
  // that would contradict it. Must stay at the end of the array.
  prettierRecommended
]);
