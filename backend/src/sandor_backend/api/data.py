"""Data-related API endpoints for sandor_backend.

Split planes:
- Control: import from control.py
- Data: binary Arrow stream or Parquet file-like
"""

import os

from fastapi import APIRouter, File, HTTPException, UploadFile
from sandor_backend.models import data_models
from sandor_backend.models.control_models import DataSliceDescriptor
from sandor_backend.services import data_service
from starlette.responses import FileResponse, JSONResponse, StreamingResponse

router = APIRouter()


@router.post("/upload", response_model=data_models.UploadResponse)
async def upload_data(file: UploadFile = File(...)):
    """Receive a file upload and pass it to the service layer."""

    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    try:
        dataset_id = await data_service.handle_upload(file)
    except Exception as exc:  # pragma: no cover - example
        raise HTTPException(status_code=500, detail=str(exc))

    return JSONResponse(content={"dataset_id": dataset_id})


@router.post("/slice")
async def get_slice(desc: DataSliceDescriptor):
    """Return a data slice as Arrow stream or Parquet file, depending on codec.

    Enforce a max-bytes and windowing via service layer.
    """
    codec = (desc.format_hint or os.environ.get("DATA_CODEC", "arrow")).lower()
    if codec == "parquet":
        parquet_path = await data_service.slice_to_parquet(desc)
        return FileResponse(
            parquet_path,
            media_type="application/parquet",
            filename=os.path.basename(parquet_path),
        )
    else:
        chunk_iter = data_service.slice_to_arrow_stream(desc)
        return StreamingResponse(
            chunk_iter,
            media_type="application/vnd.apache.arrow.stream",
        )


@router.get("/fetch/{handle}.arrow")
async def fetch_arrow(handle: str):
    chunk_iter = data_service.fetch_arrow_stream(handle)
    return StreamingResponse(
        chunk_iter,
        media_type="application/vnd.apache.arrow.stream",
    )


@router.get("/fetch/{handle}.parquet")
async def fetch_parquet(handle: str):
    parquet_path = await data_service.fetch_parquet_path(handle)
    return FileResponse(
        parquet_path,
        media_type="application/parquet",
        filename=os.path.basename(parquet_path),
    )
