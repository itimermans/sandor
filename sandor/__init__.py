"""Sandor -- a supercharged JupyterLab environment for vehicle test data analysis.

WHAT THIS FILE IS
-----------------
The top of the Python package, and also the place where Sandor announces itself
to the Jupyter ecosystem. The three underscore-prefixed functions at the bottom
are not called by us and are not called by Jupyter's normal import machinery
either -- they are looked up *by name* by Jupyter's discovery code. They are the
Python equivalent of a plugin manifest, expressed as functions.

THREE PROCESSES, TWO HALVES, ONE PACKAGE
----------------------------------------
Sandor ships as a single pip-installable package that contains two very
different things (see WORKFLOW.md §1):

  * a **frontend** -- compiled JavaScript, sitting in ``sandor/labextension/``,
    which the browser loads;
  * a **server extension** -- this Python code, which runs inside the
    ``jupyter_server`` process.

They are packaged together purely for the user's convenience: one
``pip install sandor`` gets both. Architecturally they are strangers that talk
over HTTP.

DESIGN.md D6 -- THE HARD RULE
-----------------------------
The Python half is REQUIRED. The JavaScript half is CONVENIENCE ONLY. A Sandor
notebook must stay valid and fully runnable with the labextension uninstalled or
disabled. Never write Python here that assumes a browser is attached.
"""

# ``_version.py`` is generated at build time by hatch (see the
# ``[tool.hatch.build.hooks.version]`` block in pyproject.toml). It does not
# exist in a fresh clone, only after a build -- hence the try/except. The single
# source of truth for the version number is ``package.json``; hatch reads it
# from there via ``hatch-nodejs-version`` and writes it out here, so the npm
# package and the Python package can never drift apart.
try:
    from ._version import __version__
except ImportError:
    # Fallback when using the package in dev mode without installing
    # in editable mode with pip. It is highly recommended to install
    # the package from a stable release or in editable mode: https://pip.pypa.io/en/stable/topics/local-project-installs/#editable-installs
    import warnings
    warnings.warn("Importing 'sandor' outside a proper installation.")
    __version__ = "dev"

from .routes import setup_route_handlers


def _jupyter_labextension_paths():
    """Tell JupyterLab where the compiled frontend lives.

    Called by JupyterLab's extension discovery when it scans installed Python
    packages for bundled labextensions.

    Returns
    -------
    list of dict
        ``src``  -- directory *inside this package* holding the built JS bundle.
                    Relative to this file, so ``sandor/labextension/``.
        ``dest`` -- the name it is served under, i.e. the npm package name from
                    ``package.json``. Must match, or the browser requests a
                    bundle at a URL that nothing serves.

    Note
    ----
    In development ``sandor/labextension/`` is a *symlink* into the virtualenv,
    created by ``jupyter-builder develop``. That symlink is why a ``jlpm watch``
    rebuild becomes visible on a plain browser refresh, with no reinstall. It is
    also why Windows needs Developer Mode enabled (WORKFLOW.md §2).
    """
    return [{
        "src": "labextension",
        "dest": "sandor"
    }]


def _jupyter_server_extension_points():
    """Tell ``jupyter_server`` which module to load as a server extension.

    Discovery works in two steps:

    1. ``jupyter-config/server-config/sandor.json`` is installed into
       ``etc/jupyter/jupyter_server_config.d/`` by the wheel. It says
       ``{"ServerApp": {"jpserver_extensions": {"sandor": true}}}`` -- i.e.
       "enable the extension named ``sandor``".
    2. ``jupyter_server`` imports the module ``sandor``, calls *this* function
       to find the real entry-point module, then calls
       ``_load_jupyter_server_extension`` on it.

    Here the entry point is this same package, so the answer is just "sandor".
    A larger project might point at a dedicated ``sandor.server`` submodule.
    """
    return [{
        "module": "sandor"
    }]


def _load_jupyter_server_extension(server_app):
    """Registers the API handler to receive HTTP requests from the frontend extension.

    This is the server extension's ``main()``. It runs ONCE, when
    ``jupyter lab`` starts -- which is precisely why editing any server-side
    Python requires a full ``jupyter lab`` restart and not merely a kernel
    restart (WORKFLOW.md §5, the restart matrix).

    Keep this function fast and non-blocking. It runs on the Tornado event loop
    that serves every HTTP request for the whole JupyterLab session; blocking
    here freezes the entire UI for every open notebook.

    Parameters
    ----------
    server_app: jupyterlab.labapp.LabApp
        JupyterLab application instance
    """
    # Hand the Tornado web application over so routes can be attached to it.
    setup_route_handlers(server_app.web_app)
    name = "sandor"
    # Shows up in the terminal running `jupyter lab`. Its absence is the fastest
    # way to tell that the server extension failed to load.
    server_app.log.info(f"Registered {name} server extension")
