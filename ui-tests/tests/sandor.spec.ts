// ============================================================================
// ui-tests/tests/sandor.spec.ts -- end-to-end UI tests (Playwright + Galata).
//
// Run with:
//     cd ui-tests
//     jlpm install            # once
//     jlpm playwright install # once -- downloads a Chromium build (~150 MB)
//     jlpm test
//
// WHY THIS SUITE MATTERS DISPROPORTIONATELY
// -----------------------------------------
// This is the only test layer that sees pixels. Playwright launches a real
// Chromium, Galata starts a real JupyterLab in it, and the test drives it like
// a user. Consequently it is the ONLY way an AI agent working on this repo can
// verify that a UI change did what it claims -- an agent cannot look at a
// screen. Any milestone whose deliverable is visual (M1, M3) should land with a
// test here, or it is unverifiable by anyone but the owner.
//
// It is also, unsurprisingly, the slowest suite by an order of magnitude, so it
// is not part of the fast inner loop. See `src/__tests__/sandor.spec.ts` for
// the three-suite breakdown.
//
// SEPARATE NPM PROJECT
// --------------------
// `ui-tests/` has its own `package.json` and its own `yarn.lock`, deliberately
// kept apart from the root project. Playwright and Galata are heavy and are
// only needed here, so they stay out of the extension's dependency graph. That
// is why the commands above start with `cd ui-tests`.
// ============================================================================

// `@jupyterlab/galata` re-exports Playwright's `test` and `expect`, extended
// with JupyterLab-aware fixtures (a `page` that knows how to reach the lab, a
// notebook helper, a contents API helper, and so on).
import { expect, test } from '@jupyterlab/galata';

/**
 * Don't load JupyterLab webpage before running the tests.
 * This is required to ensure we capture all log messages.
 *
 * Non-obvious and important: by default Galata navigates to JupyterLab *before*
 * the test body runs. The activation message we want fires during that load, so
 * a console listener attached afterwards would already have missed it. Setting
 * `autoGoto: false` defers navigation until our explicit `page.goto()` below,
 * after the listener is in place.
 */
test.use({ autoGoto: false });

test('should emit an activation console message', async ({ page }) => {
  // The `{ page }` in the signature is destructuring -- Playwright calls the
  // test function with one options object, and this pulls out the `page`
  // property by name. Equivalent to Python's `def f(*, page)` plus a dict
  // argument. `page` is the browser tab.
  const logs: string[] = [];

  // Subscribe to everything the page writes to its console. Node-style event
  // API: `.on(eventName, callback)`.
  page.on('console', message => {
    logs.push(message.text());
  });

  // Now navigate. Everything logged during load lands in `logs`.
  await page.goto();

  // THIS STRING IS DUPLICATED. It must stay identical to `ACTIVATION_MESSAGE`
  // in `src/index.ts`. Nothing enforces that -- this suite runs against the
  // *built and installed* extension, so it cannot import from `src/`. If you
  // change the message in one place, change it here too.
  //
  // `toHaveLength(1)` rather than `toBeGreaterThan(0)` is intentional: it also
  // catches the plugin activating TWICE, which is a real and confusing failure
  // mode when a labextension ends up installed both as a prebuilt bundle and as
  // a development symlink.
  expect(
    logs.filter(s => s === 'JupyterLab extension sandor is activated!')
  ).toHaveLength(1);
});
