"""Contract review API."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.api.documents import require_token
from app.config import Settings, get_settings
from app.db import audit, db_session
from app.services.llm import LLMError
from app.services.review import (
    DEFAULT_CHECKLIST,
    load_document_text,
    render_opinion_md,
    run_contract_review,
)

router = APIRouter(prefix="/api/review", tags=["review"])


class ReviewRequest(BaseModel):
    document_id: str = Field(..., min_length=8)


@router.get("/checklist")
def get_checklist(actor: str = Depends(require_token)):
    return {
        "items": [
            {"id": c["id"], "title": c["title"], "prompt": c["prompt"]}
            for c in DEFAULT_CHECKLIST
        ]
    }


@router.post("/contract")
def review_contract(
    body: ReviewRequest,
    actor: str = Depends(require_token),
    settings: Settings = Depends(get_settings),
):
    if not settings.ai_configured:
        raise HTTPException(status_code=503, detail="LLM not configured")
    with db_session(settings.sqlite_path) as conn:
        try:
            filename, text = load_document_text(settings, body.document_id, conn)
        except FileNotFoundError:
            raise HTTPException(status_code=404, detail="document not found") from None
        if not text.strip():
            raise HTTPException(status_code=400, detail="document has no extractable text")
        try:
            review = run_contract_review(settings, filename=filename, text=text)
        except LLMError as e:
            raise HTTPException(status_code=502, detail=str(e)) from e
        except Exception as e:
            raise HTTPException(
                status_code=502, detail=f"review failed: {type(e).__name__}: {e}"
            ) from e
        md = render_opinion_md(filename, review)
        audit(
            conn,
            actor=actor,
            action="review.contract",
            resource_type="document",
            resource_id=body.document_id,
            detail=f"model={settings.ai_model};risks={len(review.get('risks') or [])}",
        )
    return {
        "document_id": body.document_id,
        "filename": filename,
        "review": review,
        "opinion_markdown": md,
    }
