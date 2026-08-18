"""Server configuration for integration tests.

!! Never use this configuration in production because it
opens the server to the world and provide access to JupyterLab
JavaScript objects through the global window variable.

-----------------------------------------------------------------------------
WHAT THIS FILE IS
-----------------------------------------------------------------------------
A Jupyter *config file*, not a normal Python module. Jupyter's traitlets
configuration system executes it with a pre-defined object named ``c`` already
in scope -- which is why ``c`` below is used without ever being imported or
assigned. A linter will flag it as undefined; it is not.

Loaded by ``jlpm start`` in ui-tests/package.json::

    jupyter lab --config jupyter_server_test_config.py

which Playwright runs automatically before the UI tests (see
``playwright.config.js``).

-----------------------------------------------------------------------------
WHY IT IS DELIBERATELY INSECURE
-----------------------------------------------------------------------------
``configure_jupyter_server`` switches off token authentication and exposes
JupyterLab's internal JavaScript objects on the browser's global ``window``.
Both are necessary for automation: Playwright has no token to present, and
Galata needs those globals to inspect application state from inside the page.

Both are also exactly what an attacker would want. This config must never be
used for a server that is reachable by anything other than the local test
runner. Nothing here has any bearing on how a normal ``uv run jupyter lab``
starts -- it is opt-in via ``--config``.
"""
from jupyterlab.galata import configure_jupyter_server

# Mutates the traitlets config object in place, applying Galata's whole
# automation profile in one call.
configure_jupyter_server(c)

# Uncomment to set server log level to debug level
#
# First thing to try when a UI test fails for no visible reason: it surfaces
# extension load errors and 404s that are otherwise silent in the test output.
# c.ServerApp.log_level = "DEBUG"
