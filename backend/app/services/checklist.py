"""Editable checklists (YAML on disk + optional DB overrides)."""
from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml

DEFAULT_ITEMS: list[dict[str, str]] = [
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


def default_checklist_yaml() -> str:
    data = {
        "id": "default-contract",
        "name": "通用商业合同审查",
        "items": DEFAULT_ITEMS,
    }
    return yaml.safe_dump(data, allow_unicode=True, sort_keys=False)


def checklists_dir(data_root: Path) -> Path:
    d = data_root / "checklists"
    d.mkdir(parents=True, exist_ok=True)
    return d


def ensure_default_checklist_file(data_root: Path) -> Path:
    path = checklists_dir(data_root) / "default-contract.yaml"
    if not path.is_file():
        path.write_text(default_checklist_yaml(), encoding="utf-8")
    return path


def parse_checklist_yaml(text: str) -> dict[str, Any]:
    data = yaml.safe_load(text) or {}
    if not isinstance(data, dict):
        raise ValueError("checklist root must be a mapping")
    items = data.get("items") or []
    if not isinstance(items, list) or not items:
        raise ValueError("checklist.items must be a non-empty list")
    norm = []
    for it in items:
        if not isinstance(it, dict):
            continue
        cid = str(it.get("id") or "").strip()
        title = str(it.get("title") or "").strip()
        prompt = str(it.get("prompt") or "").strip()
        if not cid or not title:
            continue
        norm.append({"id": cid, "title": title, "prompt": prompt or title})
    if not norm:
        raise ValueError("no valid checklist items")
    return {
        "id": str(data.get("id") or "custom"),
        "name": str(data.get("name") or "未命名检查单"),
        "items": norm,
    }


def load_checklist(data_root: Path, checklist_id: str = "default-contract") -> dict[str, Any]:
    ensure_default_checklist_file(data_root)
    path = checklists_dir(data_root) / f"{checklist_id}.yaml"
    if not path.is_file():
        # allow .yml
        path = checklists_dir(data_root) / f"{checklist_id}.yml"
    if not path.is_file():
        raise FileNotFoundError(checklist_id)
    return parse_checklist_yaml(path.read_text(encoding="utf-8"))


def list_checklists(data_root: Path) -> list[dict[str, str]]:
    ensure_default_checklist_file(data_root)
    out = []
    for p in sorted(checklists_dir(data_root).glob("*.y*ml")):
        try:
            c = parse_checklist_yaml(p.read_text(encoding="utf-8"))
            out.append({"id": c["id"], "name": c["name"], "file": p.name, "item_count": len(c["items"])})
        except Exception:
            out.append({"id": p.stem, "name": p.stem, "file": p.name, "item_count": 0, "error": "parse_failed"})
    return out


def save_checklist(data_root: Path, checklist_id: str, body: dict[str, Any] | str) -> dict[str, Any]:
    if isinstance(body, str):
        parsed = parse_checklist_yaml(body)
        raw = body
    else:
        parsed = parse_checklist_yaml(
            yaml.safe_dump(
                {
                    "id": body.get("id") or checklist_id,
                    "name": body.get("name") or checklist_id,
                    "items": body.get("items") or [],
                },
                allow_unicode=True,
                sort_keys=False,
            )
        )
        raw = yaml.safe_dump(
            {"id": parsed["id"], "name": parsed["name"], "items": parsed["items"]},
            allow_unicode=True,
            sort_keys=False,
        )
    path = checklists_dir(data_root) / f"{checklist_id}.yaml"
    path.write_text(raw, encoding="utf-8")
    return parsed
