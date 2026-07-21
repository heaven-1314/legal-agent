"""Contract review, dossier reading, draft generation."""
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from app.config import Settings
from app.services.checklist import DEFAULT_ITEMS, load_checklist
from app.services.llm import LLMError, chat_completion
from app.services.text import extract_text

# max chars sent to model for review/read (hard bound)
MAX_TEXT_CHARS = 28000


def load_document_text(settings: Settings, document_id: str, conn) -> tuple[str, str]:
    row = conn.execute(
        "SELECT filename, storage_path FROM documents WHERE id=?", (document_id,)
    ).fetchone()
    if not row:
        raise FileNotFoundError(document_id)
    path = Path(row["storage_path"])
    text = extract_text(path)
    if not text.strip():
        chunks = conn.execute(
            "SELECT content FROM chunks WHERE document_id=? ORDER BY chunk_index",
            (document_id,),
        ).fetchall()
        text = "\n".join(c["content"] for c in chunks)
    return row["filename"], text


def _clip(text: str, n: int = MAX_TEXT_CHARS) -> str:
    text = text.strip()
    if len(text) <= n:
        return text
    return text[:n] + "\n…[正文已截断]"


def _parse_json_obj(content: str) -> dict[str, Any]:
    content = (content or "").strip()
    if content.startswith("```"):
        content = re.sub(r"^```(?:json)?\s*", "", content)
        content = re.sub(r"\s*```$", "", content)
    try:
        data = json.loads(content)
    except json.JSONDecodeError:
        m = re.search(r"\{[\s\S]*\}", content)
        if not m:
            return {"_raw": content[:3000]}
        data = json.loads(m.group(0))
    return data if isinstance(data, dict) else {"_raw": data}


def _chat_json(settings: Settings, messages: list[dict[str, str]], timeout: float = 180.0) -> dict[str, Any]:
    try:
        data = chat_completion(
            settings,
            messages,
            temperature=0.2,
            timeout=timeout,
            response_format={"type": "json_object"},
        )
    except LLMError:
        data = chat_completion(settings, messages, temperature=0.2, timeout=timeout)
    content = data["choices"][0]["message"]["content"]
    return _parse_json_obj(content)


# ---------- contract review ----------

def run_contract_review(
    settings: Settings,
    *,
    filename: str,
    text: str,
    checklist: list[dict[str, str]] | None = None,
    checklist_meta: dict[str, str] | None = None,
) -> dict[str, Any]:
    checklist = checklist or DEFAULT_ITEMS
    body = _clip(text)
    checks = [{"id": c["id"], "title": c["title"], "focus": c["prompt"]} for c in checklist]
    system = (
        "你是律师助理，只做合同风险审查，不提供最终法律意见替代执业律师。"
        "根据检查单逐项审查合同正文，只输出 JSON，不要 markdown 围栏。"
        "格式："
        '{"summary":"总览中文","risks":[{"checklist_id":"","title":"","severity":"high|medium|low|info",'
        '"finding":"发现","quote":"原文摘录尽量短","suggestion":"修改建议"}],'
        '"missing_clauses":["可能缺失的条款名"],"disclaimer":"免责声明一句话"}。'
        "severity: high=重大商业/法律风险；medium=应改；low=建议优化；info=提示。"
        "quote 必须尽量来自正文；找不到则 quote 为空字符串。"
        "checklist_id 必须是检查单 id 之一。"
    )
    user = json.dumps(
        {"filename": filename, "checklist": checks, "contract_text": body},
        ensure_ascii=False,
    )
    data = _chat_json(
        settings,
        [{"role": "system", "content": system}, {"role": "user", "content": user}],
    )
    risks_in = data.get("risks") or []
    if not isinstance(risks_in, list):
        risks_in = []
    norm_risks = []
    for r in risks_in:
        if not isinstance(r, dict):
            continue
        sev = str(r.get("severity") or "info").lower()
        if sev not in {"high", "medium", "low", "info"}:
            sev = "info"
        norm_risks.append(
            {
                "checklist_id": str(r.get("checklist_id") or ""),
                "title": str(r.get("title") or ""),
                "severity": sev,
                "finding": str(r.get("finding") or ""),
                "quote": str(r.get("quote") or ""),
                "suggestion": str(r.get("suggestion") or ""),
            }
        )
    missing = data.get("missing_clauses") or []
    if not isinstance(missing, list):
        missing = []
    return {
        "summary": str(data.get("summary") or data.get("_raw") or ""),
        "risks": norm_risks,
        "missing_clauses": [str(x) for x in missing],
        "disclaimer": str(
            data.get("disclaimer")
            or "本结果由 AI 生成，仅供内部讨论，不构成正式法律意见。"
        ),
        "model": settings.ai_model,
        "checklist": checklist_meta
        or {"id": "default-contract", "name": "通用商业合同审查"},
        "checklist_items": [{"id": c["id"], "title": c["title"]} for c in checklist],
        "text_chars_used": len(body),
    }


def render_opinion_md(filename: str, review: dict[str, Any]) -> str:
    lines = [
        "# 合同审查意见书（草稿）",
        "",
        f"- 文件：`{filename}`",
        f"- 模型：`{review.get('model', '')}`",
        f"- 检查单：`{(review.get('checklist') or {}).get('name', '')}`",
        "",
        "## 总览",
        "",
        review.get("summary") or "（无）",
        "",
        "## 风险清单",
        "",
    ]
    risks = review.get("risks") or []
    if not risks:
        lines.append("（未识别到结构化风险条目）")
    else:
        for i, r in enumerate(risks, 1):
            lines.append(
                f"### {i}. [{r.get('severity')}] {r.get('title') or r.get('checklist_id')}"
            )
            lines.append("")
            lines.append(f"- **发现**：{r.get('finding')}")
            if r.get("quote"):
                lines.append(f"- **原文**：{r.get('quote')}")
            lines.append(f"- **建议**：{r.get('suggestion')}")
            lines.append("")
    missing = review.get("missing_clauses") or []
    if missing:
        lines.append("## 可能缺失条款")
        lines.append("")
        for m in missing:
            lines.append(f"- {m}")
        lines.append("")
    lines.append("## 声明")
    lines.append("")
    lines.append(review.get("disclaimer") or "")
    lines.append("")
    return "\n".join(lines)


def resolve_checklist(settings: Settings, checklist_id: str | None) -> dict[str, Any]:
    cid = checklist_id or "default-contract"
    try:
        return load_checklist(settings.legal_agent_data, cid)
    except FileNotFoundError:
        if cid == "default-contract":
            return {
                "id": "default-contract",
                "name": "通用商业合同审查",
                "items": DEFAULT_ITEMS,
            }
        raise


# ---------- dossier / 阅卷 ----------

def run_dossier_read(
    settings: Settings,
    *,
    filename: str,
    text: str,
    question: str | None = None,
) -> dict[str, Any]:
    body = _clip(text)
    q = (question or "").strip() or "请全面提炼本案/本材料要点。"
    system = (
        "你是律师阅卷助理。根据材料正文输出 JSON："
        '{"overview":"一句话概述","parties":["主体"],"timeline":[{"date":"","event":""}],'
        '"key_facts":["关键事实"],"claims_or_demands":["诉请/主张/义务"],'
        '"evidence_points":["证据/条款要点"],"open_questions":["待核实问题"],'
        '"answer":"针对用户问题的回答（可较长）","disclaimer":"免责声明"}。'
        "日期未知可写「未写明」。不要编造正文没有的事实。"
    )
    user = json.dumps(
        {"filename": filename, "question": q, "document_text": body},
        ensure_ascii=False,
    )
    data = _chat_json(
        settings,
        [{"role": "system", "content": system}, {"role": "user", "content": user}],
        timeout=180.0,
    )
    def _list(key: str) -> list[str]:
        v = data.get(key) or []
        if not isinstance(v, list):
            return []
        return [str(x) for x in v]

    timeline = data.get("timeline") or []
    if not isinstance(timeline, list):
        timeline = []
    tl = []
    for t in timeline:
        if isinstance(t, dict):
            tl.append({"date": str(t.get("date") or ""), "event": str(t.get("event") or "")})
    result = {
        "overview": str(data.get("overview") or ""),
        "parties": _list("parties"),
        "timeline": tl,
        "key_facts": _list("key_facts"),
        "claims_or_demands": _list("claims_or_demands"),
        "evidence_points": _list("evidence_points"),
        "open_questions": _list("open_questions"),
        "answer": str(data.get("answer") or data.get("_raw") or ""),
        "disclaimer": str(
            data.get("disclaimer") or "AI 阅卷草稿，须人工核对原文。"
        ),
        "model": settings.ai_model,
        "question": q,
        "text_chars_used": len(body),
    }
    return result


def render_dossier_md(filename: str, note: dict[str, Any]) -> str:
    lines = [
        "# 阅卷笔记（草稿）",
        "",
        f"- 文件：`{filename}`",
        f"- 模型：`{note.get('model', '')}`",
        f"- 问题：{note.get('question', '')}",
        "",
        "## 概述",
        "",
        note.get("overview") or "（无）",
        "",
        "## 主体",
        "",
    ]
    for p in note.get("parties") or []:
        lines.append(f"- {p}")
    lines += ["", "## 时间线", ""]
    for t in note.get("timeline") or []:
        lines.append(f"- {t.get('date') or '未写明'}：{t.get('event')}")
    lines += ["", "## 关键事实", ""]
    for f in note.get("key_facts") or []:
        lines.append(f"- {f}")
    lines += ["", "## 主张/义务", ""]
    for c in note.get("claims_or_demands") or []:
        lines.append(f"- {c}")
    lines += ["", "## 证据/条款要点", ""]
    for e in note.get("evidence_points") or []:
        lines.append(f"- {e}")
    lines += ["", "## 待核实", ""]
    for o in note.get("open_questions") or []:
        lines.append(f"- {o}")
    lines += ["", "## 针对问题的回答", "", note.get("answer") or "", "", "## 声明", "", note.get("disclaimer") or "", ""]
    return "\n".join(lines)


# ---------- 文书起草 ----------

DRAFT_TEMPLATES: dict[str, dict[str, str]] = {
    "legal_memo": {
        "name": "法律备忘录",
        "instruction": "撰写结构化法律备忘录：事实摘要、法律分析、结论与建议。",
    },
    "demand_letter": {
        "name": "律师函（催告/主张权利草稿）",
        "instruction": "撰写律师函草稿：当事人、事实、法律依据、明确要求与期限、联系方式占位。",
    },
    "complaint_civil": {
        "name": "民事起诉状结构草稿",
        "instruction": "按起诉状结构输出：原被告、诉讼请求、事实与理由、证据清单提纲（标注待补）。",
    },
    "contract_amendment": {
        "name": "合同补充协议要点",
        "instruction": "根据争议点输出补充协议条款草案（条文化）。",
    },
}


def run_draft(
    settings: Settings,
    *,
    template_id: str,
    title: str,
    facts: str,
    extra: str = "",
) -> dict[str, Any]:
    tpl = DRAFT_TEMPLATES.get(template_id)
    if not tpl:
        raise ValueError(f"unknown template: {template_id}")
    system = (
        "你是律师文书助理。根据模板要求输出 JSON："
        '{"title":"标题","body_markdown":"完整 Markdown 正文","outline":["提纲"],'
        '"placeholders":["需用户填写的占位"],"disclaimer":"免责声明"}。'
        "正文使用中文，正式文体；不确定处用【待确认】标注，禁止捏造案号/判决。"
    )
    user = json.dumps(
        {
            "template": template_id,
            "template_name": tpl["name"],
            "instruction": tpl["instruction"],
            "title_hint": title,
            "facts": _clip(facts, 20000),
            "extra": extra,
        },
        ensure_ascii=False,
    )
    data = _chat_json(
        settings,
        [{"role": "system", "content": system}, {"role": "user", "content": user}],
        timeout=180.0,
    )
    return {
        "template_id": template_id,
        "template_name": tpl["name"],
        "title": str(data.get("title") or title or tpl["name"]),
        "body_markdown": str(data.get("body_markdown") or data.get("_raw") or ""),
        "outline": [str(x) for x in (data.get("outline") or [])]
        if isinstance(data.get("outline"), list)
        else [],
        "placeholders": [str(x) for x in (data.get("placeholders") or [])]
        if isinstance(data.get("placeholders"), list)
        else [],
        "disclaimer": str(
            data.get("disclaimer") or "AI 文书草稿，须律师审定后使用。"
        ),
        "model": settings.ai_model,
    }


# ---------- 检测报告（要素/合规清单式，非类案库） ----------

def run_compliance_report(
    settings: Settings,
    *,
    filename: str,
    text: str,
    focus: str = "",
) -> dict[str, Any]:
    body = _clip(text)
    system = (
        "你是合同/文书合规检测助理。对照常见商业文件要素输出 JSON："
        '{"score":0到100整数,"grade":"A|B|C|D","summary":"",'
        '"checks":[{"id":"","name":"","status":"pass|fail|warn|na","detail":"","quote":""}],'
        '"action_items":["下一步"],"disclaimer":""}。'
        "status=pass 已覆盖；fail 缺失或严重问题；warn 不清晰；na 不适用。"
        "不要假装检索了外部案例库。"
    )
    user = json.dumps(
        {"filename": filename, "focus": focus, "document_text": body},
        ensure_ascii=False,
    )
    data = _chat_json(
        settings,
        [{"role": "system", "content": system}, {"role": "user", "content": user}],
    )
    checks = data.get("checks") or []
    if not isinstance(checks, list):
        checks = []
    norm = []
    for c in checks:
        if not isinstance(c, dict):
            continue
        st = str(c.get("status") or "na").lower()
        if st not in {"pass", "fail", "warn", "na"}:
            st = "na"
        norm.append(
            {
                "id": str(c.get("id") or ""),
                "name": str(c.get("name") or ""),
                "status": st,
                "detail": str(c.get("detail") or ""),
                "quote": str(c.get("quote") or ""),
            }
        )
    try:
        score = int(data.get("score") or 0)
    except (TypeError, ValueError):
        score = 0
    score = max(0, min(100, score))
    return {
        "score": score,
        "grade": str(data.get("grade") or ""),
        "summary": str(data.get("summary") or data.get("_raw") or ""),
        "checks": norm,
        "action_items": [str(x) for x in (data.get("action_items") or [])]
        if isinstance(data.get("action_items"), list)
        else [],
        "disclaimer": str(
            data.get("disclaimer") or "检测报告为 AI 要素检查，非正式合规认证。"
        ),
        "model": settings.ai_model,
        "filename": filename,
        "text_chars_used": len(body),
    }


def render_compliance_md(report: dict[str, Any]) -> str:
    lines = [
        "# 文书/合同要素检测报告（草稿）",
        "",
        f"- 文件：`{report.get('filename', '')}`",
        f"- 得分：{report.get('score')}（{report.get('grade')}）",
        f"- 模型：`{report.get('model', '')}`",
        "",
        "## 总览",
        "",
        report.get("summary") or "",
        "",
        "## 检查项",
        "",
    ]
    for c in report.get("checks") or []:
        lines.append(f"### [{c.get('status')}] {c.get('name') or c.get('id')}")
        lines.append("")
        lines.append(c.get("detail") or "")
        if c.get("quote"):
            lines.append(f"\n> {c.get('quote')}\n")
        lines.append("")
    if report.get("action_items"):
        lines.append("## 行动项")
        lines.append("")
        for a in report["action_items"]:
            lines.append(f"- {a}")
        lines.append("")
    lines += ["## 声明", "", report.get("disclaimer") or "", ""]
    return "\n".join(lines)
