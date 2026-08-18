"""HTTP endpoints exposed by the Sandor server extension.

WHAT LIVES HERE
---------------
The server-side end of the browser <-> server link. Anything the frontend needs
that is *not* about the user's live variables comes through this file:

  * listing data files on disk
  * reading and writing the global signal-alias registry (DESIGN.md §8)
  * anything cross-notebook or configuration-level

Per DESIGN.md D9, work that needs the user's LIVE kernel state -- "what
DataFrames are defined right now in this notebook?" -- must NOT come through
here. The server process cannot see kernel variables. That work goes over
kernel comms instead. Getting this routing wrong is the single easiest
architectural mistake to make in this project.

THE EVENT-LOOP RULE
-------------------
Every handler below runs on Tornado's event loop, shared by every notebook in
the JupyterLab session. A synchronous 30-second file read here freezes the whole
UI for everyone. Long or blocking work must be ``async def`` and must offload
CPU/IO to a thread or process pool. The scaffold handler below is trivial and
returns instantly, so it is a plain ``def``.
"""

import json

# ``APIHandler`` is jupyter_server's base class for JSON API endpoints. It is a
# Tornado ``RequestHandler`` with Jupyter's authentication, XSRF checking, and
# JSON content-type handling already wired in. Subclassing it, rather than
# Tornado's raw handler, is what makes the auth story work.
from jupyter_server.base.handlers import APIHandler

# The URL equivalent of ``os.path.join`` -- normalises slashes and, critically,
# keeps the server's ``base_url`` prefix intact so Sandor works behind
# JupyterHub or a reverse proxy.
from jupyter_server.utils import url_path_join
import tornado


class HelloRouteHandler(APIHandler):
    """Scaffold endpoint: ``GET /sandor/hello``.

    Currently pure smoke test -- it proves the server extension loaded and is
    reachable. ``src/index.ts`` calls it on activation, so a failure shows up
    immediately in the browser console. Keep it until there is a real endpoint
    worth using as the liveness check.
    """

    # The following decorator should be present on all verb methods (head, get, post,
    # patch, put, delete, options) to ensure only authorized user can request the
    # Jupyter server
    #
    # Forgetting it is a real security hole, not a style issue: the endpoint
    # becomes callable by any page in the browser that can reach the server.
    # ``conftest.py`` sets ``allow_unauthenticated_access = False`` precisely so
    # that the test suite catches a missing decorator.
    @tornado.web.authenticated
    def get(self):
        # ``self.finish`` writes the body and closes the response. Tornado maps
        # the method name ``get`` to the HTTP GET verb by convention -- there is
        # no route table entry saying "GET"; the method name *is* the verb.
        self.finish(json.dumps({
            "data": (
                "Hello, world!"
                " This is the '/sandor/hello' endpoint."
                " Try visiting me in your browser!"
            ),
        }))


def setup_route_handlers(web_app):
    """Attach Sandor's handlers to the running Tornado application.

    Called once at server start from ``_load_jupyter_server_extension``.

    Parameters
    ----------
    web_app : tornado.web.Application
        The Jupyter server's Tornado app, shared with every other extension.
        We *add* to it; we must never reconfigure or replace it.
    """
    # Tornado matches routes against ``(host_pattern, url_pattern)``. ``.*$``
    # means "any host" -- we do not care whether the user reached the server as
    # localhost, 127.0.0.1, or a hostname.
    host_pattern = ".*$"

    # The deployment prefix. Empty for a local `jupyter lab`; something like
    # ``/user/inigo/`` under JupyterHub. Every route must be built on top of it
    # or Sandor silently 404s in any hosted deployment.
    base_url = web_app.settings["base_url"]

    # Final URL: <base_url>/sandor/hello
    #
    # The ``"sandor"`` segment is the API namespace, and it is duplicated in
    # ``src/request.ts``. Nothing enforces that the two agree -- a mismatch
    # appears only as a 404 at runtime.
    hello_route_pattern = url_path_join(base_url, "sandor", "hello")

    # A list of (pattern, handler-class) pairs. Tornado instantiates the handler
    # class fresh for every incoming request; handler instances hold no state
    # between requests. Per-extension state belongs in ``web_app.settings``.
    handlers = [(hello_route_pattern, HelloRouteHandler)]

    web_app.add_handlers(host_pattern, handlers)
