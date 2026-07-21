"""Contract review V1 — checklist + structured LLM output."""
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from app.config import Settings
from app.services.llm import LLMError, chat_completion
from app.services.text import extract_text

# Default checklist (can move to YAML later; Chinese labels for lawyers)
DEFAULT_CHECKLIST: list[dict[str, str]] = [
    {
        "id": "parties",
        "title": "主体与签约资格",
        "prompt": "检查合同当事方是否完整、名称是否明确，是否存在主体不明或代签风险。",
    },
    {
        "id": "payment",
        "title": "价款与支付",
        "prompt": "检查价款金额、币种、支付节点、逾期违约金是否清晰可执行。",
    },
    {
        "id": "term",
        "title": "期限与解除",
        "prompt": "检查合同期限、续期、单方解除/终止条件是否对等、是否可操作。",
    },
    {
        "id": "liability",
        "title": "违约与责任限制",
        "prompt": "检查违约责任、赔偿上限、免责条款是否过宽或显失公平。",
    },
    {
        "id": "ip_confidential",
        "title": "知识产权与保密",
        "prompt": "检查保密范围、期限、知识产权归属是否清晰。",
    },
    {
        "id": "dispute",
        "title": "争议解决与管辖",
        "prompt": "检查管辖法院/仲裁机构、适用法律是否明确且可执行。",
    },
    {
        "id": "missing",
        "title": "关键缺项",
        "prompt": "指出商业合同常见但本文明显缺失的条款（如不可抗力、通知送达、变更程序等）。",
    },
]


def load_document_text(settings: Settings, document_id: str, conn) -> tuple[str, str]:
    row = conn.execute(
        "SELECT filename, storage_path FROM documents WHERE id=?", (document_id,)
    ).fetchone()
    if not row:
        raise FileNotFoundError(document_id)
    path = Path(row["storage_path"])
    text = extract_text(path)
    if not text.strip():
        # fallback to joined chunks
        chunks = conn.execute(
            "SELECT content FROM chunks WHERE document_id=? ORDER BY chunk_index",
            (document_id,),
        ).fetchall()
        text = "\n".join(c["content"] for c in chunks)
    return row["filename"], text


def _build_messages(filename: str, text: str, checklist: list[dict[str, str]]) -> list[dict[str, str]]:
    # bound context for V1
    body = text if len(text) <= 24000 else text[:24000] + "\n…[正文已截断]"
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
        "每条检查单至少对应 0～3 条 risks，checklist_id 必须是检查单 id 之一。"
    )
    user = json.dumps(
        {"filename": filename, "checklist": checks, "contract_text": body},
        ensure_ascii=False,
    )
    return [{"role": "system", "content": system}, {"role": "user", "content": user}]


def _parse_review_json(content: str) -> dict[str, Any]:
    content = (content or "").strip()
    if content.startswith("```"):
        content = re.sub(r"^```(?:json)?\s*", "", content)
        content = re.sub(r"\s*```$", "", content)
    try:
        data = json.loads(content)
    except json.JSONDecodeError:
        m = re.search(r"\{[\s\S]*\}", content)
        if not m:
            return {
                "summary": content[:500],
                "risks": [],
                "missing_clauses": [],
                "disclaimer": "模型未返回合法 JSON，请重试。",
                "raw": content[:2000],
            }
        data = json.loads(m.group(0))
    if not isinstance(data, dict):
        return {"summary": str(data), "risks": [], "missing_clauses": [], "disclaimer": ""}
    risks = data.get("risks") or []
    if not isinstance(risks, list):
        risks = []
    norm_risks = []
    for r in risks:
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
        "summary": str(data.get("summary") or ""),
        "risks": norm_risks,
        "missing_clauses": [str(x) for x in missing],
        "disclaimer": str(
            data.get("disclaimer")
            or "本结果由 AI 生成，仅供内部讨论，不构成正式法律意见。"
        ),
    }


def run_contract_review(
    settings: Settings,
    *,
    filename: str,
    text: str,
    checklist: list[dict[str, str]] | None = None,
) -> dict[str, Any]:
    checklist = checklist or DEFAULT_CHECKLIST
    if not text.strip():
        raise ValueError("empty contract text")
    messages = _build_messages(filename, text, checklist)
    try:
        data = chat_completion(
            settings,
            messages,
            temperature=0.2,
            timeout=180.0,
            response_format={"type": "json_object"},
        )
    except LLMError:
        # some models reject response_format — retry plain
        data = chat_completion(settings, messages, temperature=0.2, timeout=180.0)
    content = data["choices"][0]["message"]["content"]
    parsed = _parse_review_json(content)
    parsed["model"] = settings.ai_model
    parsed["checklist"] = [{"id": c["id"], "title": c["title"]} for c in checklist]
    return parsed


def render_opinion_md(filename: str, review: dict[str, Any]) -> str:
    lines = [
        f"# 合同审查意见书（草稿）",
        "",
        f"- 文件：`{filename}`",
        f"- 模型：`{review.get('model', '')}`",
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
