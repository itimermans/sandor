"""Pydantic models used by data endpoints for sandor_backend."""

from pydantic import BaseModel


class UploadResponse(BaseModel):
    """Response returned after a successful upload.

    Fields:
    - dataset_id: a short identifier referencing the stored dataset
    """

    dataset_id: str
