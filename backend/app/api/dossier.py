"""Dossier reading (阅卷)."""
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
from app.services.review import load_document_text, render_dossier_md, run_dossier_read

router = APIRouter(prefix="/api/dossier", tags=["dossier"])


class DossierRequest(BaseModel):
    document_id: str = Field(..., min_length=8)
    question: str | None = None
    matter_id: str | None = None


@router.post("/read")
def dossier_read(
    body: DossierRequest,
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
            note = run_dossier_read(
                settings, filename=filename, text=text, question=body.question
            )
        except LLMError as e:
            raise HTTPException(status_code=502, detail=str(e)) from e
        md = render_dossier_md(filename, note)
        nid = uuid.uuid4().hex
        conn.execute(
            """INSERT INTO reading_notes(
                 id, document_id, matter_id, model, result_json, notes_md, created_at, actor
               ) VALUES (?,?,?,?,?,?,?,?)""",
            (
                nid,
                body.document_id,
                body.matter_id,
                settings.ai_model,
                json.dumps(note, ensure_ascii=False),
                md,
                now_iso(),
                actor,
            ),
        )
        audit(
            conn,
            actor=actor,
            action="dossier.read",
            resource_type="reading_note",
            resource_id=nid,
            detail=body.document_id,
        )
    return {
        "note_id": nid,
        "document_id": body.document_id,
        "filename": filename,
        "note": note,
        "notes_markdown": md,
        "download_md": f"/api/dossier/notes/{nid}/download.md",
    }


@router.get("/notes")
def list_notes(
    document_id: str | None = None,
    limit: int = 50,
    actor: str = Depends(require_token),
    settings: Settings = Depends(get_settings),
):
    limit = max(1, min(limit, 200))
    with db_session(settings.sqlite_path) as conn:
        if document_id:
            rows = conn.execute(
                """SELECT n.id, n.document_id, n.model, n.created_at, n.actor, d.filename
                   FROM reading_notes n
                   LEFT JOIN documents d ON d.id = n.document_id
                   WHERE n.document_id=? ORDER BY n.created_at DESC LIMIT ?""",
                (document_id, limit),
            ).fetchall()
        else:
            rows = conn.execute(
                """SELECT n.id, n.document_id, n.model, n.created_at, n.actor, d.filename
                   FROM reading_notes n
                   LEFT JOIN documents d ON d.id = n.document_id
                   ORDER BY n.created_at DESC LIMIT ?""",
                (limit,),
            ).fetchall()
        return {"items": [dict(r) for r in rows]}


@router.get("/notes/{note_id}")
def get_note(
    note_id: str,
    actor: str = Depends(require_token),
    settings: Settings = Depends(get_settings),
):
    with db_session(settings.sqlite_path) as conn:
        row = conn.execute(
            """SELECT n.*, d.filename FROM reading_notes n
               LEFT JOIN documents d ON d.id = n.document_id WHERE n.id=?""",
            (note_id,),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="not found")
        d = dict(row)
        try:
            d["note"] = json.loads(d.pop("result_json"))
        except Exception:
            d["note"] = {}
        d["notes_markdown"] = d.pop("notes_md", "")
        return d


@router.get("/notes/{note_id}/download.md")
def download_note(
    note_id: str,
    actor: str = Depends(require_token),
    settings: Settings = Depends(get_settings),
):
    with db_session(settings.sqlite_path) as conn:
        row = conn.execute(
            "SELECT notes_md FROM reading_notes WHERE id=?", (note_id,)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="not found")
    return Response(
        content=(row["notes_md"] or "").encode("utf-8"),
        media_type="text/markdown; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="dossier-{note_id[:8]}.md"'},
    )
