"""AI legal consultation (single-turn + multi-turn chat + automatic tool actions)."""
from __future__ import annotations

import json
import re
import uuid
from typing import Any

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


SYSTEM = """你是顶尖法律专家与智能办案助手，精通中国《劳动合同法》《民法典》《民事诉讼法》等法律法规。
请对用户的法律咨询进行深度专业剖析：
1. 【法律关系定性】：清晰梳理争议性质、权利义务与核心法律关系；
2. 【法条权威引用】：准确引用具体法律名称与条文条款（如 **《中华人民共和国劳动合同法》第四十七条、第八十七条**）；
3. 【实操行动指南】：分步骤给出证据固定方法、仲裁/诉讼维权路径、仲裁时效（1年）警示；
4. 【法定权益测算】：如涉及金额，列明清晰测算公式（如 2N = 月工资 × 年限 × 2）；
5. 结尾附一句话合规免责声明。

回答使用严谨规范的 Markdown 排版，重点法条与金额加粗。"""


def _extract_case_info(text: str) -> dict[str, str] | None:
    """启发式提取劳动争议案件要素（用于自动建案联动）。"""
    # 检查是否包含明确的纠纷线索
    dispute_keywords = ["辞退", "开除", "解除", "拖欠工资", "加班费", "未签合同", "赔偿金", "仲裁", "立案", "建案"]
    if not any(k in text for k in dispute_keywords):
        return None

    # 提取可能的公司名
    company_match = re.search(r"([一-龥]{2,15}(?:科技|网络|技术|有限公司|分公司|企业|咨询|贸易|文化|商贸|俱乐部))", text)
    employer = company_match.group(1) if company_match else "待核实单位"

    # 提取可能的金额
    amount_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:万|元|k|K)", text)
    amount_str = ""
    if amount_match:
        val = float(amount_match.group(1))
        if "万" in text:
            amount_str = f"{int(val * 10000)} 元"
        else:
            amount_str = f"{int(val)} 元"

    # 提取城市
    city = "北京"
    for c in ["北京", "上海", "深圳", "广州", "杭州", "南京", "成都", "武汉", "苏州", "天津"]:
        if c in text:
            city = c
            break

    return {
        "title": f"{employer}劳动争议咨询案",
        "employee": "当事人",
        "employer": employer,
        "city": city,
        "dispute_amount": amount_str,
    }


@router.post("")
def consult(
    body: ConsultRequest,
    actor: str = Depends(require_token),
    settings: Settings = Depends(get_settings),
):
    if not settings.ai_configured:
        raise HTTPException(status_code=503, detail="LLM not configured")

    messages = [{"role": "system", "content": SYSTEM}]
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
    cid = uuid.uuid4().hex

    action_cards: list[dict[str, Any]] = []

    with db_session(settings.sqlite_path) as conn:
        # 1. 自动建案/分诊联动（当用户提到具体案情时自动关联）
        extracted = _extract_case_info(body.question)
        if extracted and ("建" in body.question or "案" in body.question or "辞退" in body.question or "赔偿" in body.question):
            case_id = uuid.uuid4().hex
            conn.execute(
                """INSERT INTO labor_cases (
                     id, title, employee, employer, city, dispute_amount,
                     claim_summary, stage_index, created_at, updated_at
                   ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    case_id,
                    extracted["title"],
                    extracted["employee"],
                    extracted["employer"],
                    extracted["city"],
                    extracted["dispute_amount"],
                    body.question[:200],
                    0,
                    now_iso(),
                    now_iso(),
                ),
            )
            # 生成初始证据待办
            conn.execute(
                """INSERT INTO labor_todos (id, case_id, title, due, done, created_at)
                   VALUES (?, ?, ?, ?, 0, ?)""",
                (
                    uuid.uuid4().hex,
                    case_id,
                    "固定辞退与用工证据：微信聊天、邮件往来、工资流水与考勤",
                    "",
                    now_iso(),
                ),
            )
            action_cards.append({
                "type": "case_created",
                "case_id": case_id,
                "title": extracted["title"],
                "stage": "咨询评估",
                "employer": extracted["employer"],
                "city": extracted["city"],
                "dispute_amount": extracted["dispute_amount"],
            })

        # 2. 审查引导卡片（如果提到了合同）
        if "合同" in body.question or "协议" in body.question:
            action_cards.append({
                "type": "contract_review",
                "title": "合同智能审查工作台",
                "hint": "可上传劳动合同或商业协议进行 5 维合规深度审查与红绿 Diff 修订",
            })

        # 3. 文书起草引导
        if "申请书" in body.question or "起诉状" in body.question or "律师函" in body.question:
            action_cards.append({
                "type": "draft_suggest",
                "title": "一键起草诉讼文书",
                "template": "民事起诉状 / 劳动仲裁申请书",
            })

        conn.execute(
            """INSERT INTO audit_log(actor, action, resource_type, resource_id, detail, created_at)
               VALUES (?,?,?,?,?,?)""",
            (actor, "consult.chat", "consult", cid, f"q={body.question[:80]};model={settings.ai_model}", now_iso()),
        )

    return {
        "id": cid,
        "reply": reply,
        "model": settings.ai_model,
        "action_cards": action_cards,
    }
