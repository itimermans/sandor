"""FastAPI application factory and app instance for sandor_backend."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sandor_backend import logging as sandor_logging
from sandor_backend.api import data, health


def create_app() -> FastAPI:
    app = FastAPI(title="sandor-backend", version="0.1.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health.router, prefix="/health", tags=["health"])
    app.include_router(data.router, prefix="/data", tags=["data"])

    sandor_logging.configure_logging()

    return app


app = create_app()
