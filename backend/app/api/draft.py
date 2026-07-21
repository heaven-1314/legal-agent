"""Document drafting + compliance report."""
from __future__ import annotations

import json
import uuid

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field

from app.api.documents import require_token
from app.config import Settings, get_settings
from app.db import audit, db_session, now_iso
from app.services.llm import LLMError
from app.services.review import (
    DRAFT_TEMPLATES,
    load_document_text,
    render_compliance_md,
    run_compliance_report,
    run_draft,
)

router = APIRouter(prefix="/api", tags=["draft-report"])


class DraftRequest(BaseModel):
    template_id: str
    title: str = ""
    facts: str = Field(..., min_length=1)
    extra: str = ""
    matter_id: str | None = None
    source_document_id: str | None = None


class ReportRequest(BaseModel):
    document_id: str = Field(..., min_length=8)
    focus: str = ""


@router.get("/draft/templates")
def draft_templates(actor: str = Depends(require_token)):
    return {
        "items": [
            {"id": k, "name": v["name"], "instruction": v["instruction"]}
            for k, v in DRAFT_TEMPLATES.items()
        ]
    }


@router.post("/draft")
def create_draft(
    body: DraftRequest,
    actor: str = Depends(require_token),
    settings: Settings = Depends(get_settings),
):
    if not settings.ai_configured:
        raise HTTPException(status_code=503, detail="LLM not configured")
    facts = body.facts
    # optional: prepend source document text
    with db_session(settings.sqlite_path) as conn:
        if body.source_document_id:
            try:
                fn, text = load_document_text(settings, body.source_document_id, conn)
                facts = f"【参考文件 {fn}】\n{text[:12000]}\n\n【用户事实】\n{facts}"
            except FileNotFoundError:
                raise HTTPException(status_code=404, detail="source document not found") from None
        try:
            draft = run_draft(
                settings,
                template_id=body.template_id,
                title=body.title,
                facts=facts,
                extra=body.extra,
            )
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e)) from e
        except LLMError as e:
            raise HTTPException(status_code=502, detail=str(e)) from e
        did = uuid.uuid4().hex
        conn.execute(
            """INSERT INTO draft_docs(
                 id, matter_id, template_id, title, model, body_md, meta_json, created_at, actor
               ) VALUES (?,?,?,?,?,?,?,?,?)""",
            (
                did,
                body.matter_id,
                body.template_id,
                draft["title"],
                settings.ai_model,
                draft["body_markdown"],
                json.dumps(draft, ensure_ascii=False),
                now_iso(),
                actor,
            ),
        )
        audit(
            conn,
            actor=actor,
            action="draft.create",
            resource_type="draft",
            resource_id=did,
            detail=body.template_id,
        )
    return {
        "draft_id": did,
        "draft": draft,
        "download_md": f"/api/drafts/{did}/download.md",
    }


@router.get("/drafts")
def list_drafts(
    limit: int = 50,
    actor: str = Depends(require_token),
    settings: Settings = Depends(get_settings),
):
    limit = max(1, min(limit, 200))
    with db_session(settings.sqlite_path) as conn:
        rows = conn.execute(
            """SELECT id, matter_id, template_id, title, model, created_at, actor
               FROM draft_docs ORDER BY created_at DESC LIMIT ?""",
            (limit,),
        ).fetchall()
        return {"items": [dict(r) for r in rows]}


@router.get("/drafts/{draft_id}")
def get_draft(
    draft_id: str,
    actor: str = Depends(require_token),
    settings: Settings = Depends(get_settings),
):
    with db_session(settings.sqlite_path) as conn:
        row = conn.execute("SELECT * FROM draft_docs WHERE id=?", (draft_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="not found")
        d = dict(row)
        try:
            d["draft"] = json.loads(d.pop("meta_json") or "{}")
        except Exception:
            d["draft"] = {"body_markdown": d.get("body_md")}
        d["body_markdown"] = d.pop("body_md", "")
        return d


@router.get("/drafts/{draft_id}/download.md")
def download_draft(
    draft_id: str,
    actor: str = Depends(require_token),
    settings: Settings = Depends(get_settings),
):
    with db_session(settings.sqlite_path) as conn:
        row = conn.execute(
            "SELECT body_md, title FROM draft_docs WHERE id=?", (draft_id,)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="not found")
    return Response(
        content=(row["body_md"] or "").encode("utf-8"),
        media_type="text/markdown; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="draft-{draft_id[:8]}.md"'
        },
    )


@router.post("/report/compliance")
def compliance_report(
    body: ReportRequest,
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
            raise HTTPException(status_code=400, detail="empty document")
        try:
            report = run_compliance_report(
                settings, filename=filename, text=text, focus=body.focus
            )
        except LLMError as e:
            raise HTTPException(status_code=502, detail=str(e)) from e
        md = render_compliance_md(report)
        run_id = uuid.uuid4().hex
        # store as review_runs kind=compliance
        conn.execute(
            """INSERT INTO review_runs(
                 id, document_id, matter_id, kind, model, checklist_id, status,
                 summary, risk_count, result_json, opinion_md, created_at, actor
               ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                run_id,
                body.document_id,
                None,
                "compliance",
                settings.ai_model,
                None,
                "done",
                report.get("summary") or "",
                len(report.get("checks") or []),
                json.dumps(report, ensure_ascii=False),
                md,
                now_iso(),
                actor,
            ),
        )
        audit(
            conn,
            actor=actor,
            action="report.compliance",
            resource_type="review_run",
            resource_id=run_id,
            detail=f"score={report.get('score')}",
        )
    return {
        "run_id": run_id,
        "document_id": body.document_id,
        "filename": filename,
        "report": report,
        "report_markdown": md,
        "download_md": f"/api/review/runs/{run_id}/download.md",
    }
