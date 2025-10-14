"""Control-plane endpoints: /meta/* and /actions/*

These return JSON envelopes and never large arrays.
"""

from __future__ import annotations

import os

from fastapi import APIRouter
from pydantic import BaseModel
from sandor_backend.models.control_models import (
    ControlRequest,
    DataHandle,
    DataSliceDescriptor,
    ResultEnvelope,
)
from sandor_backend.services import dataset_registry

router = APIRouter()


class FeatureFlags(BaseModel):
    data_codec: str


@router.get("/meta/features", response_model=ResultEnvelope[FeatureFlags])
async def get_features():
    codec = os.environ.get("DATA_CODEC", "arrow")
    return ResultEnvelope(
        request_id="features", status="OK", payload=FeatureFlags(data_codec=codec)
    )


@router.post("/actions/request", response_model=ResultEnvelope[dict])
async def handle_control(request: ControlRequest):
    # Echo back a minimal success for now
    return ResultEnvelope(
        request_id=request.request_id, status="OK", payload={"accepted": True}
    )


@router.get("/meta/datasets", response_model=ResultEnvelope[list])
async def list_datasets():
    items = dataset_registry.list_datasets()
    return ResultEnvelope(request_id="datasets", status="OK", payload=items)


@router.get("/meta/datasets/{dataset_id}", response_model=ResultEnvelope[dict])
async def dataset_meta(dataset_id: str):
    items = dataset_registry.list_datasets()
    meta = next((i for i in items if i["dataset_id"] == dataset_id), None)
    if not meta:
        return ResultEnvelope(
            request_id=dataset_id,
            status="ERROR",
            code="E_NOT_FOUND",
            message="dataset not found",
        )
    return ResultEnvelope(request_id=dataset_id, status="OK", payload=meta)


@router.post("/actions/prepare-slice", response_model=ResultEnvelope[DataHandle])
async def prepare_slice(desc: DataSliceDescriptor):
    # Stub: generate a dummy data handle URL; real implementation will register a slice
    handle = f"slice-{desc.dataset_id}-{len(desc.columns)}"
    codec = (desc.format_hint or os.environ.get("DATA_CODEC", "arrow")).lower()
    fmt = "arrow" if codec == "arrow" else "parquet"
    suffix = "arrow" if fmt == "arrow" else "parquet"
    data_url = f"/data/fetch/{handle}.{suffix}"
    return ResultEnvelope(
        request_id=handle,
        status="OK",
        payload=DataHandle(handle=handle, data_url=data_url, format=fmt),
    )
