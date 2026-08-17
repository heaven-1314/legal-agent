"""AI legal consultation (single-turn + multi-turn chat)."""
from __future__ import annotations

import json
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.api.documents import require_token
from app.config import Settings, get_settings
from app.db import audit, db_session, now_iso
from app.services.llm import LLMError, chat_completion

router = APIRouter(prefix="/api/consult", tags=["consult"])


class ConsultRequest(BaseModel):
    question: str = Field(..., min_length=1)
    history: list[dict] = Field(default_factory=list)  # [{"role":"user","content":"..."},...]


SYSTEM = (
    "你是专业的法律智能助手，精通中国法律法规（劳动法、合同法、民法典等）。"
    "请用中文回答用户的法律问题，要求：\n"
    "1. 先简要分析问题涉及的法律关系\n"
    "2. 引用具体法条（法律名称+条文号）\n"
    "3. 给出实操建议（取证方向、维权路径、时效提醒等）\n"
    "4. 必要时追问关键事实（日期、金额、合同状态等）\n"
    "5. 结尾附免责声明\n"
    "回答使用 Markdown 格式，法条引用用**加粗**。"
)


@router.post("")
def consult(
    body: ConsultRequest,
    actor: str = Depends(require_token),
    settings: Settings = Depends(get_settings),
):
    if not settings.ai_configured:
        raise HTTPException(status_code=503, detail="LLM not configured")
    messages = [{"role": "system", "content": SYSTEM}]
    # include up to 10 turns of history
    for h in (body.history or [])[-10:]:
        role = h.get("role", "user")
        content = h.get("content", "")
        if role in ("user", "assistant") and content:
            messages.append({"role": role, "content": content})
    messages.append({"role": "user", "content": body.question})

    try:
        data = chat_completion(settings, messages, temperature=0.3, timeout=120.0)
    except LLMError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e

    reply = data["choices"][0]["message"]["content"]

    with db_session(settings.sqlite_path) as conn:
        cid = uuid.uuid4().hex
        conn.execute(
            """INSERT INTO audit_log(actor, action, resource_type, resource_id, detail, created_at)
               VALUES (?,?,?,?,?,?)""",
            (actor, "consult.chat", "consult", cid,
             f"q={body.question[:80]};model={settings.ai_model}", now_iso()),
        )
    return {
        "id": cid,
        "reply": reply,
        "model": settings.ai_model,
    }
