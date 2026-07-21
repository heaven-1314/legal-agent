"""Matters (案件夹) + document linking."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.api.documents import require_token
from app.config import Settings, get_settings
from app.db import audit, db_session, now_iso

router = APIRouter(prefix="/api/matters", tags=["matters"])


class MatterCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    client_name: str | None = None
    notes: str | None = None


class MatterUpdate(BaseModel):
    title: str | None = None
    client_name: str | None = None
    notes: str | None = None


class LinkDoc(BaseModel):
    document_id: str
    doc_kind: str | None = None


@router.get("")
def list_matters(
    actor: str = Depends(require_token),
    settings: Settings = Depends(get_settings),
):
    with db_session(settings.sqlite_path) as conn:
        rows = conn.execute(
            """SELECT m.*,
                      (SELECT COUNT(*) FROM documents d WHERE d.matter_id = m.id) AS doc_count
               FROM matters m ORDER BY m.updated_at DESC"""
        ).fetchall()
        return {"items": [dict(r) for r in rows]}


@router.post("")
def create_matter(
    body: MatterCreate,
    actor: str = Depends(require_token),
    settings: Settings = Depends(get_settings),
):
    mid = uuid.uuid4().hex
    ts = now_iso()
    with db_session(settings.sqlite_path) as conn:
        conn.execute(
            """INSERT INTO matters(id, title, client_name, notes, created_at, updated_at)
               VALUES (?,?,?,?,?,?)""",
            (mid, body.title.strip(), body.client_name, body.notes, ts, ts),
        )
        audit(conn, actor=actor, action="matter.create", resource_type="matter", resource_id=mid)
    return {"id": mid, "title": body.title.strip(), "created_at": ts}


@router.get("/{matter_id}")
def get_matter(
    matter_id: str,
    actor: str = Depends(require_token),
    settings: Settings = Depends(get_settings),
):
    with db_session(settings.sqlite_path) as conn:
        m = conn.execute("SELECT * FROM matters WHERE id=?", (matter_id,)).fetchone()
        if not m:
            raise HTTPException(status_code=404, detail="not found")
        docs = conn.execute(
            """SELECT id, filename, content_type, size_bytes, text_chars, doc_kind, created_at
               FROM documents WHERE matter_id=? ORDER BY created_at DESC""",
            (matter_id,),
        ).fetchall()
        reviews = conn.execute(
            """SELECT id, document_id, kind, model, summary, risk_count, created_at
               FROM review_runs WHERE matter_id=? OR document_id IN
                 (SELECT id FROM documents WHERE matter_id=?)
               ORDER BY created_at DESC LIMIT 50""",
            (matter_id, matter_id),
        ).fetchall()
        return {
            "matter": dict(m),
            "documents": [dict(d) for d in docs],
            "reviews": [dict(r) for r in reviews],
        }


@router.patch("/{matter_id}")
def update_matter(
    matter_id: str,
    body: MatterUpdate,
    actor: str = Depends(require_token),
    settings: Settings = Depends(get_settings),
):
    with db_session(settings.sqlite_path) as conn:
        m = conn.execute("SELECT id FROM matters WHERE id=?", (matter_id,)).fetchone()
        if not m:
            raise HTTPException(status_code=404, detail="not found")
        fields = []
        vals = []
        if body.title is not None:
            fields.append("title=?")
            vals.append(body.title.strip())
        if body.client_name is not None:
            fields.append("client_name=?")
            vals.append(body.client_name)
        if body.notes is not None:
            fields.append("notes=?")
            vals.append(body.notes)
        fields.append("updated_at=?")
        vals.append(now_iso())
        vals.append(matter_id)
        conn.execute(f"UPDATE matters SET {', '.join(fields)} WHERE id=?", vals)
        audit(conn, actor=actor, action="matter.update", resource_type="matter", resource_id=matter_id)
    return {"ok": True, "id": matter_id}


@router.post("/{matter_id}/documents")
def link_document(
    matter_id: str,
    body: LinkDoc,
    actor: str = Depends(require_token),
    settings: Settings = Depends(get_settings),
):
    with db_session(settings.sqlite_path) as conn:
        m = conn.execute("SELECT id FROM matters WHERE id=?", (matter_id,)).fetchone()
        if not m:
            raise HTTPException(status_code=404, detail="matter not found")
        d = conn.execute("SELECT id FROM documents WHERE id=?", (body.document_id,)).fetchone()
        if not d:
            raise HTTPException(status_code=404, detail="document not found")
        if body.doc_kind:
            conn.execute(
                "UPDATE documents SET matter_id=?, doc_kind=? WHERE id=?",
                (matter_id, body.doc_kind, body.document_id),
            )
        else:
            conn.execute(
                "UPDATE documents SET matter_id=? WHERE id=?",
                (matter_id, body.document_id),
            )
        conn.execute(
            "UPDATE matters SET updated_at=? WHERE id=?", (now_iso(), matter_id)
        )
        audit(
            conn,
            actor=actor,
            action="matter.link_doc",
            resource_type="matter",
            resource_id=matter_id,
            detail=body.document_id,
        )
    return {"ok": True}


@router.delete("/{matter_id}")
def delete_matter(
    matter_id: str,
    actor: str = Depends(require_token),
    settings: Settings = Depends(get_settings),
):
    with db_session(settings.sqlite_path) as conn:
        conn.execute("UPDATE documents SET matter_id=NULL WHERE matter_id=?", (matter_id,))
        conn.execute("DELETE FROM matters WHERE id=?", (matter_id,))
        audit(conn, actor=actor, action="matter.delete", resource_type="matter", resource_id=matter_id)
    return {"ok": True}
