from __future__ import annotations

from contextlib import asynccontextmanager

from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api import documents, review, system
from app.config import ensure_data_dirs, get_settings
from app.db import init_db

_STATIC = Path(__file__).resolve().parent / "static"


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = ensure_data_dirs()
    init_db(settings.sqlite_path)
    yield


app = FastAPI(title="legal-agent", version="0.1.0", lifespan=lifespan)

_settings = get_settings()
_origins = [o.strip() for o in _settings.cors_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(system.router)
app.include_router(documents.router)
app.include_router(review.router)

if _STATIC.is_dir():
    app.mount("/assets", StaticFiles(directory=str(_STATIC)), name="assets")


@app.get("/")
def root():
    index = _STATIC / "index.html"
    if index.is_file():
        return FileResponse(index)
    return {"service": "legal-agent", "docs": "/docs"}
