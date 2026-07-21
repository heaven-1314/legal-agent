"""System / LLM probe routes."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.api.documents import require_token
from app.config import Settings, get_settings
from app.db import audit, db_session
from app.services.llm import LLMError, probe_llm

router = APIRouter(prefix="/api", tags=["system"])


@router.get("/health")
def health(settings: Settings = Depends(get_settings)):
    return {
        "ok": True,
        "service": "legal-agent",
        "data_dir": str(settings.legal_agent_data),
        "ai_configured": bool(settings.ai_base and settings.ai_key),
        "ai_model": settings.ai_model if settings.ai_base else None,
    }


@router.get("/llm/probe")
def llm_probe(
    actor: str = Depends(require_token),
    settings: Settings = Depends(get_settings),
):
    try:
        result = probe_llm(settings)
    except LLMError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"llm call failed: {type(e).__name__}") from e
    with db_session(settings.sqlite_path) as conn:
        audit(conn, actor=actor, action="llm.probe", detail=settings.ai_model)
    return result


@router.get("/audit")
def list_audit(
    limit: int = 50,
    actor: str = Depends(require_token),
    settings: Settings = Depends(get_settings),
):
    limit = max(1, min(limit, 200))
    with db_session(settings.sqlite_path) as conn:
        rows = conn.execute(
            "SELECT id, actor, action, resource_type, resource_id, detail, created_at "
            "FROM audit_log ORDER BY id DESC LIMIT ?",
            (limit,),
        ).fetchall()
        return {"items": [dict(r) for r in rows]}
