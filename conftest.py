"""Pytest configuration shared by every Python test in the repo.

``conftest.py`` is a magic filename: pytest imports it automatically, before
collecting any tests, and makes everything defined here available to tests in
this directory and all subdirectories. No import statement is needed anywhere.
It is the standard place for fixtures, plugins, and global test setup.

Run the suite with::

    uv run pytest

There is no activation step -- ``uv run`` resolves the project virtualenv
itself (DESIGN.md D17).
"""

import pytest

# Load the pytest plugin that ships with ``pytest-jupyter``. It provides the
# fixtures that spin up a REAL jupyter_server instance for the duration of a
# test, plus ``jp_fetch`` for making authenticated requests against it.
#
# This is what makes the route tests genuine integration tests: they exercise
# the actual Tornado stack, actual authentication, and actual URL routing --
# not a mock. That matters because most route bugs live precisely in the auth
# and URL-prefix layers that a mock would paper over.
pytest_plugins = ("pytest_jupyter.jupyter_server", )


@pytest.fixture
def jp_server_config(jp_server_config):
    """Configure the test server to load the Sandor extension.

    Note the shadowing: this fixture takes a parameter with the *same name* as
    itself. That is the documented pytest idiom for overriding a fixture defined
    by a plugin -- the parameter receives the plugin's original value, and what
    we return replaces it for our tests. Roughly a ``super()`` call.
    """
    return {
        "ServerApp": {
            # Without this, the test server starts but never loads Sandor, and
            # every route test 404s.
            "jpserver_extensions": {"sandor": True},

            # Test against a server which requires authentication on all endpoints
            #
            # Deliberately strict. It means a handler missing the
            # ``@tornado.web.authenticated`` decorator gets caught by the test
            # suite rather than shipping as a security hole.
            "allow_unauthenticated_access": False,
        }
    }
