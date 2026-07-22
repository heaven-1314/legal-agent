"""Matters (案件夹) + document linking + export package."""
from __future__ import annotations

import io
import json
import uuid
import zipfile
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
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
        notes = conn.execute(
            """SELECT id, document_id, model, created_at, actor
               FROM reading_notes
               WHERE matter_id=? OR document_id IN
                 (SELECT id FROM documents WHERE matter_id=?)
               ORDER BY created_at DESC LIMIT 50""",
            (matter_id, matter_id),
        ).fetchall()
        drafts = conn.execute(
            """SELECT id, template_id, title, model, created_at, actor
               FROM draft_docs WHERE matter_id=?
               ORDER BY created_at DESC LIMIT 50""",
            (matter_id,),
        ).fetchall()
        # unified timeline for matter workspace
        timeline = []
        for r in reviews:
            timeline.append(
                {
                    "kind": r["kind"] or "review",
                    "id": r["id"],
                    "title": r["summary"] or ("检测报告" if r["kind"] == "compliance" else "合同审查"),
                    "model": r["model"],
                    "created_at": r["created_at"],
                    "meta": {"risk_count": r["risk_count"], "document_id": r["document_id"]},
                }
            )
        for n in notes:
            timeline.append(
                {
                    "kind": "dossier",
                    "id": n["id"],
                    "title": "阅卷笔记",
                    "model": n["model"],
                    "created_at": n["created_at"],
                    "meta": {"document_id": n["document_id"], "actor": n["actor"]},
                }
            )
        for d in drafts:
            timeline.append(
                {
                    "kind": "draft",
                    "id": d["id"],
                    "title": d["title"] or "文书草稿",
                    "model": d["model"],
                    "created_at": d["created_at"],
                    "meta": {"template_id": d["template_id"], "actor": d["actor"]},
                }
            )
        for doc in docs:
            timeline.append(
                {
                    "kind": "document",
                    "id": doc["id"],
                    "title": f"上传材料 · {doc['filename']}",
                    "model": None,
                    "created_at": doc["created_at"],
                    "meta": {"doc_kind": doc["doc_kind"], "size_bytes": doc["size_bytes"]},
                }
            )
        timeline.sort(key=lambda x: x.get("created_at") or "", reverse=True)
        return {
            "matter": dict(m),
            "documents": [dict(d) for d in docs],
            "reviews": [dict(r) for r in reviews],
            "notes": [dict(n) for n in notes],
            "drafts": [dict(d) for d in drafts],
            "timeline": timeline[:100],
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


@router.get("/{matter_id}/export.zip")
def export_matter_zip(
    matter_id: str,
    actor: str = Depends(require_token),
    settings: Settings = Depends(get_settings),
):
    """Package matter materials + AI artifacts into a downloadable zip."""
    with db_session(settings.sqlite_path) as conn:
        m = conn.execute("SELECT * FROM matters WHERE id=?", (matter_id,)).fetchone()
        if not m:
            raise HTTPException(status_code=404, detail="not found")
        docs = conn.execute(
            "SELECT * FROM documents WHERE matter_id=? ORDER BY created_at DESC",
            (matter_id,),
        ).fetchall()
        reviews = conn.execute(
            """SELECT * FROM review_runs WHERE matter_id=? OR document_id IN
               (SELECT id FROM documents WHERE matter_id=?) ORDER BY created_at DESC""",
            (matter_id, matter_id),
        ).fetchall()
        notes = conn.execute(
            """SELECT * FROM reading_notes WHERE matter_id=? OR document_id IN
               (SELECT id FROM documents WHERE matter_id=?) ORDER BY created_at DESC""",
            (matter_id, matter_id),
        ).fetchall()
        drafts = conn.execute(
            "SELECT * FROM draft_docs WHERE matter_id=? ORDER BY created_at DESC",
            (matter_id,),
        ).fetchall()
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as zf:
            meta = {
                "matter": dict(m),
                "exported_at": now_iso(),
                "counts": {
                    "documents": len(docs),
                    "reviews": len(reviews),
                    "notes": len(notes),
                    "drafts": len(drafts),
                },
            }
            zf.writestr("matter.json", json.dumps(meta, ensure_ascii=False, indent=2))
            for d in docs:
                sp = Path(d["storage_path"]) if d["storage_path"] else None
                arc = f"documents/{d['id']}_{d['filename']}"
                if sp and sp.is_file():
                    zf.write(sp, arcname=arc)
                else:
                    zf.writestr(arc + ".missing.txt", "source file missing on disk")
            for r in reviews:
                kind = r["kind"] or "review"
                zf.writestr(f"reviews/{kind}_{r['id']}.md", r["opinion_md"] or "")
                zf.writestr(f"reviews/{kind}_{r['id']}.json", r["result_json"] or "{}")
            for n in notes:
                zf.writestr(f"notes/dossier_{n['id']}.md", n["notes_md"] or "")
                zf.writestr(f"notes/dossier_{n['id']}.json", n["result_json"] or "{}")
            for d in drafts:
                safe_title = (d["title"] or "draft")[:40].replace("/", "_")
                zf.writestr(f"drafts/{d['id']}_{safe_title}.md", d["body_md"] or "")
            lines = [
                f"# 案件导出包：{m['title']}",
                "",
                f"- 客户：{m['client_name'] or '—'}",
                f"- 导出时间：{meta['exported_at']}",
                f"- 材料：{len(docs)}",
                f"- 审查/检测：{len(reviews)}",
                f"- 阅卷：{len(notes)}",
                f"- 文书：{len(drafts)}",
                "",
                "## 目录",
                "- documents/ 原文件",
                "- reviews/ 审查与检测结果",
                "- notes/ 阅卷笔记",
                "- drafts/ 文书草稿",
            ]
            zf.writestr("README.md", "\n".join(lines))
        audit(
            conn,
            actor=actor,
            action="matter.export",
            resource_type="matter",
            resource_id=matter_id,
            detail=f"docs={len(docs)};reviews={len(reviews)};notes={len(notes)};drafts={len(drafts)}",
        )
    data = buf.getvalue()
    fname = f"matter-{matter_id[:8]}.zip"
    return Response(
        content=data,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{fname}"'},
    )
