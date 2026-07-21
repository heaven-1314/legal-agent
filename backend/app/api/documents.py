"""Document upload, list, FTS search."""
from __future__ import annotations

import shutil
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Header, HTTPException, UploadFile

from app.config import Settings, ensure_data_dirs, get_settings
from app.db import audit, db_session, now_iso
from app.services.text import chunk_text, extract_text

router = APIRouter(prefix="/api/documents", tags=["documents"])


def require_token(
    authorization: str | None = Header(default=None),
    x_dev_token: str | None = Header(default=None),
    settings: Settings = Depends(get_settings),
) -> str:
    token = None
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()
    elif x_dev_token:
        token = x_dev_token.strip()
    if token != settings.dev_token:
        raise HTTPException(status_code=401, detail="unauthorized")
    return "dev"


@router.get("")
def list_documents(
    actor: str = Depends(require_token),
    settings: Settings = Depends(get_settings),
):
    with db_session(settings.sqlite_path) as conn:
        rows = conn.execute(
            "SELECT id, filename, content_type, size_bytes, text_chars, created_at "
            "FROM documents ORDER BY created_at DESC"
        ).fetchall()
        return {"items": [dict(r) for r in rows]}


@router.post("")
async def upload_document(
    file: UploadFile = File(...),
    actor: str = Depends(require_token),
    settings: Settings = Depends(get_settings),
):
    ensure_data_dirs(settings)
    doc_id = uuid.uuid4().hex
    dest_dir = settings.uploads_dir / doc_id
    dest_dir.mkdir(parents=True, exist_ok=True)
    safe_name = Path(file.filename or "upload.bin").name
    dest = dest_dir / safe_name

    size = 0
    with dest.open("wb") as out:
        while True:
            chunk = await file.read(1024 * 1024)
            if not chunk:
                break
            size += len(chunk)
            out.write(chunk)

    text = extract_text(dest, file.content_type)
    chunks = chunk_text(text)

    with db_session(settings.sqlite_path) as conn:
        conn.execute(
            """INSERT INTO documents(id, filename, content_type, size_bytes, storage_path, text_chars, created_at)
               VALUES (?,?,?,?,?,?,?)""",
            (
                doc_id,
                safe_name,
                file.content_type,
                size,
                str(dest),
                len(text),
                now_iso(),
            ),
        )
        for i, c in enumerate(chunks):
            conn.execute(
                "INSERT INTO chunks(document_id, chunk_index, content) VALUES (?,?,?)",
                (doc_id, i, c),
            )
        audit(
            conn,
            actor=actor,
            action="document.upload",
            resource_type="document",
            resource_id=doc_id,
            detail=f"filename={safe_name};chunks={len(chunks)}",
        )

    return {
        "id": doc_id,
        "filename": safe_name,
        "size_bytes": size,
        "text_chars": len(text),
        "chunk_count": len(chunks),
    }


@router.get("/search")
def search_documents(
    q: str,
    limit: int = 10,
    actor: str = Depends(require_token),
    settings: Settings = Depends(get_settings),
):
    """V0 search: LIKE substring (CJK-friendly). FTS5 upgrade later with tokenizer."""
    q = (q or "").strip()
    if not q:
        raise HTTPException(status_code=400, detail="q required")
    limit = max(1, min(limit, 50))
    like = f"%{q}%"
    with db_session(settings.sqlite_path) as conn:
        rows = conn.execute(
            """
            SELECT c.document_id, c.chunk_index, c.content AS snippet, d.filename
            FROM chunks c
            JOIN documents d ON d.id = c.document_id
            WHERE c.content LIKE ?
            ORDER BY c.document_id, c.chunk_index
            LIMIT ?
            """,
            (like, limit),
        ).fetchall()
        items = []
        for r in rows:
            d = dict(r)
            sn = d.get("snippet") or ""
            if len(sn) > 240:
                d["snippet"] = sn[:240] + "…"
            items.append(d)
        audit(
            conn,
            actor=actor,
            action="document.search",
            detail=f"q={q[:80]};hits={len(items)}",
        )
        return {"query": q, "items": items}


@router.delete("/{doc_id}")
def delete_document(
    doc_id: str,
    actor: str = Depends(require_token),
    settings: Settings = Depends(get_settings),
):
    with db_session(settings.sqlite_path) as conn:
        row = conn.execute(
            "SELECT storage_path FROM documents WHERE id=?", (doc_id,)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="not found")
        storage = Path(row["storage_path"])
        conn.execute("DELETE FROM chunks WHERE document_id=?", (doc_id,))
        conn.execute("DELETE FROM documents WHERE id=?", (doc_id,))
        audit(
            conn,
            actor=actor,
            action="document.delete",
            resource_type="document",
            resource_id=doc_id,
        )
    # remove files
    parent = storage.parent
    if parent.is_dir() and parent.parent == settings.uploads_dir:
        shutil.rmtree(parent, ignore_errors=True)
    return {"ok": True, "id": doc_id}
