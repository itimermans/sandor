// ============================================================================
// src/__tests__/sandor.spec.ts -- Jest unit tests for the TypeScript half.
//
// Run with:  uv run jlpm test
//
// WHICH TEST SUITE IS WHICH
// -------------------------
// This project has three separate, non-overlapping test suites. Knowing which
// one to reach for saves a lot of time:
//
//   1. `uv run pytest`               -- Python. Fast. Real server, real HTTP.
//   2. `uv run jlpm test`            -- THIS suite. Jest. Fast, no browser.
//                                       Pure functions and logic only.
//   3. `cd ui-tests && jlpm test`    -- Playwright/Galata. Slow. A real Chromium
//                                       driving a real JupyterLab. The ONLY way
//                                       to verify anything visual, and therefore
//                                       the only way an AI agent can check UI work.
//
// Anything that touches the DOM, a Lumino widget, or JupyterLab's application
// object belongs in suite 3, not here. Jest runs in Node with a synthetic DOM
// and no JupyterLab, so mocking enough of JupyterLab to test a widget here
// costs more than it is worth and tests the mock rather than the code.
//
// Good candidates for THIS file, once Sandor has real logic:
//   * config <-> code round-trip helpers on the TS side
//   * hashing / line-ending normalisation (DESIGN.md D3, D18)
//   * anything that is a pure function of its inputs
//
// FILE NAMING
// -----------
// `jest.config.js` sets `testRegex: 'src/.*/.*.spec.ts[x]?$'`. A test file must
// therefore live under `src/`, in a subdirectory, and end in `.spec.ts`. The
// `__tests__/` directory name is convention, not a requirement -- but the
// "in a subdirectory" part is: `src/foo.spec.ts` would NOT be collected.
// ============================================================================

/**
 * Example of [Jest](https://jestjs.io/docs/getting-started) unit tests
 *
 * `describe(name, fn)` groups related tests -- purely for readable output.
 * `it(name, fn)` (alias `test`) declares one test case.
 * `expect(value).toEqual(other)` is the assertion; Jest ships dozens of
 * matchers (`toBe`, `toContain`, `toThrow`, ...).
 *
 * `() => { ... }` is an arrow function -- JavaScript's lambda. Passing a
 * function as an argument like this is completely routine in JS, far more so
 * than in C++ or Python.
 */
describe('sandor', () => {
  it('should be tested', () => {
    // Placeholder from the scaffold. It asserts nothing about Sandor; its only
    // job is to prove the Jest toolchain runs. Replace it with the first real
    // test rather than adding alongside it.
    expect(1 + 1).toEqual(2);
  });
});
