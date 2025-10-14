"""Transport interfaces and factories.

ControlTransport: JSON/REST control-plane
DataTransport: Arrow/Parquet data-plane

They are simple interfaces so services can receive them via DI.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, AsyncIterator, Dict


class ControlTransport(ABC):
    @abstractmethod
    async def request(
        self, verb: str, resource: str, parameters: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Perform a control-plane request and return JSON-compatible dict."""


class DataTransport(ABC):
    @abstractmethod
    async def stream_arrow(self, descriptor: Dict[str, Any]) -> AsyncIterator[bytes]:
        """Yield Arrow IPC stream chunks (bytes)."""

    @abstractmethod
    async def get_parquet_path(self, descriptor: Dict[str, Any]) -> str:
        """Return a server-local Parquet file path for the given slice descriptor."""


def get_codec_from_env(default: str = "arrow") -> str:
    import os

    val = os.environ.get("DATA_CODEC", default).lower()
    return val if val in {"arrow", "parquet"} else default
