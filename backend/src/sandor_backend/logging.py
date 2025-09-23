"""Logging configuration for sandor_backend."""

import logging


def configure_logging(level: int = logging.INFO) -> None:
    """Configure the root logger with a simple console handler."""
    root = logging.getLogger()
    if root.handlers:
        return

    handler = logging.StreamHandler()
    formatter = logging.Formatter(
        "%(asctime)s %(levelname)s [%(name)s] %(message)s", datefmt="%Y-%m-%d %H:%M:%S"
    )
    handler.setFormatter(formatter)
    root.setLevel(level)
    root.addHandler(handler)
