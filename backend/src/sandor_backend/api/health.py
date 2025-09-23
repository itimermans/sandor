"""Simple health check router for sandor_backend.
"""

from fastapi import APIRouter

router = APIRouter()


@router.get("/", summary="Liveness and readiness probe")
async def health_check():
    """Return a small payload indicating the service is up."""
    return {"status": "ok", "service": "sandor-backend"}
