"""Data-related API endpoints for sandor_backend."""

from fastapi import APIRouter, UploadFile, File, HTTPException
from starlette.responses import JSONResponse

from sandor_backend.services import data_service
from sandor_backend.models import data_models

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
