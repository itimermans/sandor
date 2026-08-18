/**
 * Configuration for Playwright using default from @jupyterlab/galata
 *
 * ===========================================================================
 * ui-tests/playwright.config.js -- how the end-to-end browser tests are run.
 *
 * Run from THIS directory (it is a separate npm project):
 *     cd ui-tests
 *     jlpm install
 *     jlpm playwright install    # downloads a Chromium build, ~150 MB, once
 *     jlpm test
 *
 * Galata's base config already sets the browser, viewport, screenshot and
 * trace behaviour to match JupyterLab's own test suite. We override only the
 * `webServer` block, which tells Playwright how to get a JupyterLab running
 * before the tests start.
 * ===========================================================================
 */
const baseConfig = require('@jupyterlab/galata/lib/playwright-config');

module.exports = {
  // Spread the defaults, then override. See jest.config.js for a note on `...`.
  ...baseConfig,

  webServer: {
    // `jlpm start` is defined in ui-tests/package.json as
    //   jupyter lab --config jupyter_server_test_config.py
    // i.e. a JupyterLab deliberately configured for automation -- token auth
    // off, Galata's window hooks exposed. See that file's warning.
    command: 'jlpm start',

    // Playwright polls this URL until it answers, then starts the tests.
    // Hard-coded port 8888: if you already have a normal `jupyter lab` on 8888,
    // `reuseExistingServer` below will make the tests run against THAT instance
    // instead of a clean one. Usually convenient, occasionally the explanation
    // for a baffling failure. Stop the dev server first when in doubt --
    // `Ctrl+Shift+P -> Tasks: Run Task -> Sandor: stop dev servers`.
    url: 'http://localhost:8888/lab',

    // 120 seconds. Generous because a cold JupyterLab start on Windows, with
    // extensions to scan, is genuinely slow.
    timeout: 120 * 1000,

    // Locally (`process.env.CI` unset): reuse a server that is already up, so
    // repeated test runs are fast. In CI: always start a fresh one, so a run
    // can never be polluted by leftover state. `!` is boolean negation.
    reuseExistingServer: !process.env.CI
  }
};
