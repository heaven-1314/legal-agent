"""Contract review API with persistence + download."""
from __future__ import annotations

import json
import uuid

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse, Response
from pydantic import BaseModel, Field

from app.api.documents import require_token
from app.config import Settings, get_settings
from app.db import audit, db_session, now_iso
from app.services.checklist import list_checklists, save_checklist
from app.services.llm import LLMError
from app.services.review import (
    load_document_text,
    render_opinion_md,
    resolve_checklist,
    run_contract_review,
)

router = APIRouter(prefix="/api/review", tags=["review"])


class ReviewRequest(BaseModel):
    document_id: str = Field(..., min_length=8)
    checklist_id: str | None = "default-contract"
    matter_id: str | None = None  # optional; falls back to document.matter_id


class ChecklistUpsert(BaseModel):
    name: str | None = None
    items: list[dict] | None = None
    yaml_text: str | None = None


@router.get("/checklist")
def get_checklist(
    checklist_id: str = "default-contract",
    actor: str = Depends(require_token),
    settings: Settings = Depends(get_settings),
):
    try:
        c = resolve_checklist(settings, checklist_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="checklist not found") from None
    return {"id": c["id"], "name": c["name"], "items": c["items"]}


@router.get("/checklists")
def get_checklists(
    actor: str = Depends(require_token),
    settings: Settings = Depends(get_settings),
):
    return {"items": list_checklists(settings.legal_agent_data)}


@router.put("/checklists/{checklist_id}")
def put_checklist(
    checklist_id: str,
    body: ChecklistUpsert,
    actor: str = Depends(require_token),
    settings: Settings = Depends(get_settings),
):
    try:
        if body.yaml_text:
            parsed = save_checklist(settings.legal_agent_data, checklist_id, body.yaml_text)
        else:
            parsed = save_checklist(
                settings.legal_agent_data,
                checklist_id,
                {
                    "id": checklist_id,
                    "name": body.name or checklist_id,
                    "items": body.items or [],
                },
            )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    with db_session(settings.sqlite_path) as conn:
        audit(
            conn,
            actor=actor,
            action="checklist.save",
            resource_type="checklist",
            resource_id=checklist_id,
        )
    return parsed


@router.post("/contract")
def review_contract(
    body: ReviewRequest,
    actor: str = Depends(require_token),
    settings: Settings = Depends(get_settings),
):
    if not settings.ai_configured:
        raise HTTPException(status_code=503, detail="LLM not configured")
    try:
        cl = resolve_checklist(settings, body.checklist_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="checklist not found") from None

    with db_session(settings.sqlite_path) as conn:
        try:
            filename, text = load_document_text(settings, body.document_id, conn)
        except FileNotFoundError:
            raise HTTPException(status_code=404, detail="document not found") from None
        if not text.strip():
            raise HTTPException(status_code=400, detail="document has no extractable text")
        matter_id = body.matter_id
        if not matter_id:
            row = conn.execute(
                "SELECT matter_id FROM documents WHERE id=?", (body.document_id,)
            ).fetchone()
            matter_id = row["matter_id"] if row else None
        try:
            review = run_contract_review(
                settings,
                filename=filename,
                text=text,
                checklist=cl["items"],
                checklist_meta={"id": cl["id"], "name": cl["name"]},
            )
        except LLMError as e:
            raise HTTPException(status_code=502, detail=str(e)) from e
        except Exception as e:
            raise HTTPException(
                status_code=502, detail=f"review failed: {type(e).__name__}: {e}"
            ) from e
        md = render_opinion_md(filename, review)
        run_id = uuid.uuid4().hex
        conn.execute(
            """INSERT INTO review_runs(
                 id, document_id, matter_id, kind, model, checklist_id, status,
                 summary, risk_count, result_json, opinion_md, created_at, actor
               ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                run_id,
                body.document_id,
                matter_id,
                "contract",
                settings.ai_model,
                cl["id"],
                "done",
                review.get("summary") or "",
                len(review.get("risks") or []),
                json.dumps(review, ensure_ascii=False),
                md,
                now_iso(),
                actor,
            ),
        )
        audit(
            conn,
            actor=actor,
            action="review.contract",
            resource_type="review_run",
            resource_id=run_id,
            detail=f"doc={body.document_id};model={settings.ai_model};risks={len(review.get('risks') or [])}",
        )
    return {
        "run_id": run_id,
        "document_id": body.document_id,
        "filename": filename,
        "review": review,
        "opinion_markdown": md,
        "download_md": f"/api/review/runs/{run_id}/download.md",
    }


@router.get("/runs")
def list_runs(
    document_id: str | None = None,
    limit: int = 50,
    actor: str = Depends(require_token),
    settings: Settings = Depends(get_settings),
):
    limit = max(1, min(limit, 200))
    with db_session(settings.sqlite_path) as conn:
        if document_id:
            rows = conn.execute(
                """SELECT r.id, r.document_id, r.kind, r.model, r.checklist_id, r.status,
                          r.summary, r.risk_count, r.created_at, r.actor, d.filename
                   FROM review_runs r
                   LEFT JOIN documents d ON d.id = r.document_id
                   WHERE r.document_id=?
                   ORDER BY r.created_at DESC LIMIT ?""",
                (document_id, limit),
            ).fetchall()
        else:
            rows = conn.execute(
                """SELECT r.id, r.document_id, r.kind, r.model, r.checklist_id, r.status,
                          r.summary, r.risk_count, r.created_at, r.actor, d.filename
                   FROM review_runs r
                   LEFT JOIN documents d ON d.id = r.document_id
                   ORDER BY r.created_at DESC LIMIT ?""",
                (limit,),
            ).fetchall()
        return {"items": [dict(r) for r in rows]}


@router.get("/runs/{run_id}")
def get_run(
    run_id: str,
    actor: str = Depends(require_token),
    settings: Settings = Depends(get_settings),
):
    with db_session(settings.sqlite_path) as conn:
        row = conn.execute(
            """SELECT r.*, d.filename FROM review_runs r
               LEFT JOIN documents d ON d.id = r.document_id
               WHERE r.id=?""",
            (run_id,),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="run not found")
        d = dict(row)
        try:
            d["review"] = json.loads(d.pop("result_json"))
        except Exception:
            d["review"] = {}
        d["opinion_markdown"] = d.pop("opinion_md", "")
        return d


@router.get("/runs/{run_id}/download.md")
def download_run_md(
    run_id: str,
    actor: str = Depends(require_token),
    settings: Settings = Depends(get_settings),
):
    with db_session(settings.sqlite_path) as conn:
        row = conn.execute(
            "SELECT opinion_md, document_id FROM review_runs WHERE id=?", (run_id,)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="run not found")
        md = row["opinion_md"] or ""
    return Response(
        content=md.encode("utf-8"),
        media_type="text/markdown; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="review-{run_id[:8]}.md"'
        },
    )
