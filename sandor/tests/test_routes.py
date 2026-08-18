"""Integration tests for the Sandor server extension's HTTP routes.

Run with ``uv run pytest``.

These are NOT unit tests. Each one boots a real ``jupyter_server`` with the
Sandor extension loaded (configured in the repo-root ``conftest.py``) and makes
a real authenticated HTTP request against it. Slower than mocking, and worth it:
the failure modes that actually bite in this layer -- a missing
``@tornado.web.authenticated``, a wrong ``url_path_join``, an extension that
silently failed to load -- are exactly the ones a mock would hide.
"""

import json


async def test_hello(jp_fetch):
    """``GET /sandor/hello`` returns the expected JSON payload.

    Parameters
    ----------
    jp_fetch
        Fixture from ``pytest-jupyter``, requested simply by naming it as an
        argument -- pytest injects it. It is an async callable that performs an
        authenticated request against the temporary test server, taking the URL
        as *separate path segments* rather than one string, so it can prepend
        the server's ``base_url`` itself.

    Note
    ----
    ``async def`` works here because ``pyproject.toml`` brings in
    ``pytest-asyncio``; without it pytest would collect this function, never
    await it, and report a pass having executed nothing.
    """
    # When -- note "sandor", "hello" as two arguments, mirroring the
    # `url_path_join(base_url, "sandor", "hello")` in sandor/routes.py.
    response = await jp_fetch("sandor", "hello")

    # Then
    assert response.code == 200
    # ``response.body`` is raw bytes, so it needs decoding/parsing by hand.
    payload = json.loads(response.body)
    # Asserting the exact payload is brittle by design at this stage: this is a
    # smoke test whose whole job is to notice if the handshake endpoint changes.
    assert payload == {
            "data": (
                "Hello, world!"
                " This is the '/sandor/hello' endpoint."
                " Try visiting me in your browser!"
            ),
        }
