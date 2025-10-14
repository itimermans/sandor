"""Control-plane Pydantic models for sandor_backend.

- ResultEnvelope: standard response envelope for control-plane
- DataSliceDescriptor: describes a data slice to fetch
- ControlRequest: generic control-plane request wrapper
"""

from __future__ import annotations

from typing import Generic, List, Optional, Tuple, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class ResultEnvelope(BaseModel, Generic[T]):
    request_id: str
    status: str = Field(..., description="OK | ERROR | PARTIAL | ACCEPTED")
    message: Optional[str] = None
    payload: Optional[T] = None
    code: Optional[str] = Field(
        default=None, description="Stable error or status code (e.g., E_NOT_FOUND)"
    )


class DataSliceDescriptor(BaseModel):
    dataset_id: str
    columns: List[str]
    filters: Optional[dict] = None
    row_range: Optional[Tuple[int, int]] = Field(
        default=None, description="[start, end) row slice bounds"
    )
    format_hint: Optional[str] = Field(
        default=None, description="arrow|parquet (optional override)"
    )


class ControlRequest(BaseModel):
    request_id: str
    verb: str
    resource: str
    parameters: dict = Field(default_factory=dict)


class DataHandle(BaseModel):
    handle: str
    data_url: str
    format: str
    size_bytes: Optional[int] = None
