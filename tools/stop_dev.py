"""Stop every Sandor development server belonging to this repository.

Usage::

    uv run python tools/stop_dev.py

or, in VS Code: ``Ctrl+Shift+P`` -> *Tasks: Run Task* -> **Sandor: stop**.

-----------------------------------------------------------------------------
WHY THIS EXISTS
-----------------------------------------------------------------------------
The dev loop runs two long-lived processes (WORKFLOW.md §4): ``jlpm watch`` and
``jupyter lab``. Stopping them by hand means finding two terminals and pressing
Ctrl+C in each -- and that only works if you still have the terminals. Servers
orphaned by a VS Code crash, a closed window, or a killed terminal keep running
and keep holding port 8888, which is why ``jupyter lab`` sometimes quietly
starts on 8889 while the browser tab you reopen shows a stale build.

-----------------------------------------------------------------------------
WHY IT IS A PYTHON SCRIPT AND NOT A .bat OR .sh
-----------------------------------------------------------------------------
DESIGN.md D18 convention 6: no shell scripts. A ``.bat`` works only on Windows,
a ``.sh`` only on Unix, and maintaining both guarantees they drift. Python runs
everywhere and is already a hard dependency of the project.

-----------------------------------------------------------------------------
SAFETY -- READ THIS BEFORE EDITING
-----------------------------------------------------------------------------
This script terminates processes, so it is deliberately paranoid. A process is
killed only if it passes EVERY one of these:

1. It is not this script, and not an ancestor of this script.
   VS Code's own process may well have its working directory set to this repo.
   Without this rule, running the task from inside VS Code could close VS Code.
2. Its executable name looks like part of our toolchain
   (python / node / jupyter and friends).
3. Its command line names a known dev command
   (jupyter, jlpm, tsc, jupyter-builder, webpack, ...).
4. Its working directory, or some argument on its command line, lies inside
   THIS repository.

Rules 1 and 4 together are what make it safe to run while you have unrelated
Jupyter servers or Node projects open elsewhere on the machine: they are
untouched.

The script also tries a graceful HTTP shutdown of Jupyter servers before
resorting to signals, so notebooks get a chance to checkpoint.
"""

from __future__ import annotations

import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

# ``psutil`` gives cross-platform process inspection (list processes, read their
# command line and working directory, terminate them). It is a dev-only
# dependency -- see [dependency-groups] in pyproject.toml. It is NEVER required
# to run Sandor itself, which matters because DESIGN.md D6 keeps the runtime
# dependency list minimal.
try:
    import psutil
except ImportError:  # pragma: no cover - depends on the local environment
    psutil = None


# ``__file__`` is this script; ``.parents[1]`` climbs from tools/ to the repo
# root. ``.resolve()`` makes it absolute and follows symlinks, so the string
# comparisons further down are against a canonical path.
#
# pathlib rather than os.path throughout, per DESIGN.md D18 convention 2.
REPO_ROOT = Path(__file__).resolve().parents[1]

# Only processes whose executable name contains one of these are even
# considered. Cheap first filter, and it rules out most of the machine.
PROCESS_NAME_HINTS = ("python", "node", "jupyter", "uv")

# ...and their command line must mention one of these. This is what
# distinguishes "the dev server" from "some other Python running in this repo",
# such as pytest, or this very script.
COMMAND_LINE_HINTS = (
    "jupyter-lab",
    "jupyter lab",
    "jupyterlab",
    "jupyter_server",
    "jupyter-builder",
    "jlpm",
    "tsc",
    "webpack",
    "run-p",
    "npm-run-all",
)


def _log(message: str) -> None:
    """Print with a consistent prefix so task output is easy to scan."""
    print(f"[stop_dev] {message}")


def _protected_pids() -> set[int]:
    """PIDs that must never be killed: this process and all of its ancestors.

    The ancestor chain typically runs::

        this script  ->  uv  ->  the task shell  ->  VS Code  ->  explorer/init

    Every one of those may plausibly match the filters below -- VS Code is an
    Electron app, so its process name contains "node" on some platforms, and
    its working directory is very likely this repository. Walking up the parent
    chain and excluding the lot is the only reliable guard.
    """
    protected = {os.getpid()}
    if psutil is None:
        return protected
    try:
        current = psutil.Process()
        # ``parents()`` returns the whole ancestry, nearest first.
        for parent in current.parents():
            protected.add(parent.pid)
    except psutil.Error:
        # If the ancestry cannot be read, fail SAFE: we simply keep the smaller
        # protected set. Worst case is that we decline to kill something.
        pass
    return protected


def _is_inside_repo(candidate: str | None) -> bool:
    """True if ``candidate`` is a path lying inside this repository.

    Deliberately tolerant: it is handed both real directory paths and raw
    command-line arguments, most of which are not paths at all.
    """
    if not candidate:
        return False
    try:
        # ``is_relative_to`` is the correct comparison. Naive string prefix
        # matching would wrongly match a sibling directory named
        # ``sandor-backup``, and would break on case and separator differences
        # between Windows and POSIX (DESIGN.md D18 convention 5).
        return Path(candidate).resolve().is_relative_to(REPO_ROOT)
    except (OSError, ValueError, RuntimeError):
        # Not a valid path, too long, or a Windows path on a dead drive.
        return False


def shutdown_jupyter_servers() -> int:
    """Ask every Jupyter server running out of this repo to shut down politely.

    Jupyter writes a small JSON file per running server into its runtime
    directory, holding the URL, the auth token, and the PID. ``list_running_servers``
    reads those. Posting to ``/api/shutdown`` with the token triggers an orderly
    shutdown: kernels stop, checkpoints flush, the port is released.

    Returns
    -------
    int
        How many servers were asked to stop.
    """
    try:
        from jupyter_server.serverapp import list_running_servers
    except ImportError:
        _log("jupyter_server not importable; skipping graceful shutdown.")
        return 0

    stopped = 0
    # The list can contain stale entries for servers that already died; the
    # request below simply fails for those, which is harmless.
    for server in list(list_running_servers()):
        root = server.get("root_dir") or server.get("notebook_dir")
        if not _is_inside_repo(root):
            # Somebody else's Jupyter. Leave it strictly alone.
            continue

        url = f"{server['url']}api/shutdown"
        token = server.get("token", "")
        request = urllib.request.Request(
            url,
            data=b"",  # a POST with an empty body
            method="POST",
            headers={"Authorization": f"token {token}"},
        )
        try:
            urllib.request.urlopen(request, timeout=5)
            _log(f"Shut down Jupyter server at {server['url']} (pid {server.get('pid')})")
            stopped += 1
        except (urllib.error.URLError, OSError) as exc:
            # Already gone, or refusing the request. The process sweep below is
            # the fallback.
            _log(f"Could not shut down {server['url']} gracefully: {exc}")

    return stopped


def _looks_like_sandor_dev_process(proc: "psutil.Process") -> bool:
    """Apply safety rules 2, 3 and 4 from the module docstring."""
    try:
        name = (proc.name() or "").lower()
        if not any(hint in name for hint in PROCESS_NAME_HINTS):
            return False

        # ``cmdline()`` is the argv list. Joining it is good enough for
        # substring matching and avoids fiddly per-argument logic.
        cmdline = proc.cmdline()
        joined = " ".join(cmdline).lower()
        if not any(hint in joined for hint in COMMAND_LINE_HINTS):
            return False

        # Never kill an invocation of this script, however it was started.
        if "stop_dev.py" in joined:
            return False

        # Rule 4: tie it to this repository, by working directory or by any
        # path-shaped argument.
        try:
            if _is_inside_repo(proc.cwd()):
                return True
        except psutil.Error:
            # cwd() commonly raises AccessDenied for processes owned by another
            # user. Fall through to the argument check.
            pass

        return any(_is_inside_repo(arg) for arg in cmdline)

    except psutil.Error:
        # The process vanished, or we lack permission to inspect it. Either way
        # it is not ours to kill.
        return False


def sweep_processes(protected: set[int]) -> int:
    """Terminate leftover dev processes belonging to this repo.

    Two-stage, which is the standard well-behaved pattern:

    1. ``terminate()`` -- SIGTERM on Unix, ``TerminateProcess`` on Windows.
       Gives the process a chance to clean up.
    2. after a grace period, ``kill()`` -- SIGKILL on Unix. Unconditional.

    Returns
    -------
    int
        How many processes were signalled.
    """
    if psutil is None:
        _log(
            "psutil is not installed, so the process sweep is unavailable.\n"
            "           Install it with:  uv sync\n"
            "           Meanwhile, stop the watch task with:\n"
            "           Ctrl+Shift+P -> Tasks: Terminate Task -> All Running Tasks"
        )
        return 0

    victims = []
    # ``process_iter`` with an attrs list pre-fetches those fields in one pass,
    # which is markedly faster than querying each process individually.
    for proc in psutil.process_iter(attrs=["pid", "name"]):
        if proc.pid in protected:
            continue  # Safety rule 1.
        if _looks_like_sandor_dev_process(proc):
            victims.append(proc)

    if not victims:
        return 0

    for proc in victims:
        try:
            _log(f"Terminating pid {proc.pid} ({proc.name()})")
            proc.terminate()
        except psutil.Error as exc:
            _log(f"  could not terminate pid {proc.pid}: {exc}")

    # Wait up to 5 seconds for them to exit on their own. ``wait_procs``
    # returns (finished, still_alive).
    _gone, alive = psutil.wait_procs(victims, timeout=5)

    for proc in alive:
        try:
            _log(f"Force-killing pid {proc.pid} (did not exit in time)")
            proc.kill()
        except psutil.Error as exc:
            _log(f"  could not kill pid {proc.pid}: {exc}")

    return len(victims)


def main() -> int:
    """Entry point. Returns a process exit code: 0 always means 'nothing wrong'.

    Finding nothing to stop is a success, not a failure -- the common case is
    running this when everything is already down.
    """
    _log(f"Repository: {REPO_ROOT}")

    protected = _protected_pids()

    # Graceful first, so notebooks get to checkpoint.
    servers = shutdown_jupyter_servers()
    if servers:
        # Give the servers a moment to actually exit before the sweep looks for
        # survivors, otherwise we report killing something that was already on
        # its way out.
        time.sleep(1.5)

    killed = sweep_processes(protected)

    if servers == 0 and killed == 0:
        _log("Nothing to stop -- no Sandor dev processes are running.")
    else:
        _log(f"Done. {servers} server(s) shut down, {killed} process(es) terminated.")

    return 0


if __name__ == "__main__":
    # The `if __name__ == "__main__"` guard means this block runs only when the
    # file is executed directly, not when it is imported. ``sys.exit`` sets the
    # process exit code, which is what VS Code inspects to decide whether the
    # task succeeded.
    sys.exit(main())
