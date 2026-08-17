from __future__ import annotations

from contextlib import asynccontextmanager

from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api import consult, documents, dossier, draft, labor, matters, review, system
from app.config import ensure_data_dirs, get_settings
from app.db import init_db
from app.services.checklist import ensure_default_checklist_file

_STATIC = Path(__file__).resolve().parent / "static"


def _seed_bundled_checklists(data_root: Path) -> None:
    """Copy repo checklists/*.yaml into data dir if id missing (non-destructive)."""
    # main.py → app → backend → project root
    bundled = Path(__file__).resolve().parents[2] / "checklists"
    if not bundled.is_dir():
        return
    dest = data_root / "checklists"
    dest.mkdir(parents=True, exist_ok=True)
    for src in bundled.glob("*.y*ml"):
        target = dest / src.name
        if not target.is_file():
            target.write_text(src.read_text(encoding="utf-8"), encoding="utf-8")


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = ensure_data_dirs()
    init_db(settings.sqlite_path)
    ensure_default_checklist_file(settings.legal_agent_data)
    _seed_bundled_checklists(settings.legal_agent_data)
    yield


app = FastAPI(title="legal-agent", version="0.3.0", lifespan=lifespan)

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
app.include_router(consult.router)
app.include_router(documents.router)
app.include_router(matters.router)
app.include_router(review.router)
app.include_router(dossier.router)
app.include_router(draft.router)
app.include_router(labor.router)

if _STATIC.is_dir():
    app.mount("/assets", StaticFiles(directory=str(_STATIC)), name="assets")


@app.get("/")
def root():
    index = _STATIC / "index.html"
    if index.is_file():
        return FileResponse(index)
    return {"service": "legal-agent", "docs": "/docs"}
