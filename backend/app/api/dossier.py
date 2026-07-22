"""Dossier reading (阅卷) — single + multi-document."""
from __future__ import annotations

import json
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field

from app.api.documents import require_token
from app.config import Settings, get_settings
from app.db import audit, db_session, now_iso
from app.services.llm import LLMError
from app.services.review import load_document_text, render_dossier_md, run_dossier_read
from app.services.text import extract_text

router = APIRouter(prefix="/api/dossier", tags=["dossier"])


class DossierRequest(BaseModel):
    document_id: str = Field(..., min_length=8)
    question: str | None = None
    matter_id: str | None = None


class DossierBatchRequest(BaseModel):
    document_ids: list[str] = Field(..., min_length=1)
    question: str | None = None
    matter_id: str | None = None


def _load_multi_text(settings: Settings, document_ids: list[str], conn) -> tuple[str, str, list[str]]:
    """Return combined filename label, combined text, and resolved ids."""
    parts: list[str] = []
    names: list[str] = []
    resolved: list[str] = []
    for did in document_ids[:12]:
        row = conn.execute(
            "SELECT filename, storage_path FROM documents WHERE id=?", (did,)
        ).fetchone()
        if not row:
            continue
        path = Path(row["storage_path"])
        text = extract_text(path)
        if not text.strip():
            chunks = conn.execute(
                "SELECT content FROM chunks WHERE document_id=? ORDER BY chunk_index",
                (did,),
            ).fetchall()
            text = "\n".join(c["content"] for c in chunks)
        if not text.strip():
            continue
        names.append(row["filename"])
        resolved.append(did)
        parts.append(f"===== 文件：{row['filename']} =====\n{text}")
    if not parts:
        raise FileNotFoundError("no readable documents")
    label = " + ".join(names[:3]) + (f" 等{len(names)}份" if len(names) > 3 else "")
    return label, "\n\n".join(parts), resolved


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


@router.post("/read-batch")
def dossier_read_batch(
    body: DossierBatchRequest,
    actor: str = Depends(require_token),
    settings: Settings = Depends(get_settings),
):
    """Multi-document dossier read (matter-level reading)."""
    if not settings.ai_configured:
        raise HTTPException(status_code=503, detail="LLM not configured")
    ids = [x.strip() for x in body.document_ids if x and x.strip()]
    if not ids:
        raise HTTPException(status_code=400, detail="document_ids required")
    with db_session(settings.sqlite_path) as conn:
        try:
            label, text, resolved = _load_multi_text(settings, ids, conn)
        except FileNotFoundError:
            raise HTTPException(status_code=404, detail="no readable documents") from None
        try:
            note = run_dossier_read(
                settings,
                filename=label,
                text=text,
                question=body.question or "请综合多份材料提炼主体、时间线、关键事实与待核实问题。",
            )
        except LLMError as e:
            raise HTTPException(status_code=502, detail=str(e)) from e
        md = render_dossier_md(label, note)
        nid = uuid.uuid4().hex
        primary = resolved[0]
        note_meta = dict(note)
        note_meta["document_ids"] = resolved
        note_meta["document_count"] = len(resolved)
        conn.execute(
            """INSERT INTO reading_notes(
                 id, document_id, matter_id, model, result_json, notes_md, created_at, actor
               ) VALUES (?,?,?,?,?,?,?,?)""",
            (
                nid,
                primary,
                body.matter_id,
                settings.ai_model,
                json.dumps(note_meta, ensure_ascii=False),
                md,
                now_iso(),
                actor,
            ),
        )
        audit(
            conn,
            actor=actor,
            action="dossier.read_batch",
            resource_type="reading_note",
            resource_id=nid,
            detail=f"docs={len(resolved)}",
        )
    return {
        "note_id": nid,
        "document_ids": resolved,
        "filename": label,
        "note": note_meta,
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
