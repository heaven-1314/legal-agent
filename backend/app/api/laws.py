"""法条检索 API：内置常用法条库 + 关键词搜索。"""
from __future__ import annotations

import json
from pathlib import Path

from fastapi import APIRouter, Depends

from app.api.documents import require_token

router = APIRouter(prefix="/api/laws", tags=["laws"])

_LAWS_FILE = Path(__file__).parent.parent / "data" / "laws.json"


def _load_laws() -> list[dict]:
    with open(_LAWS_FILE, encoding="utf-8") as f:
        data = json.load(f)
    items = []
    for cat, laws in data.items():
        for law in laws:
            items.append({**law, "category": cat})
    return items


@router.get("")
def search_laws(
    q: str = "",
    category: str = "",
    actor: str = Depends(require_token),
):
    items = _load_laws()
    if category:
        items = [i for i in items if i["category"] == category]
    if q:
        ql = q.lower()
        items = [
            i for i in items
            if ql in i.get("title", "").lower()
            or ql in i.get("text", "").lower()
            or ql in i.get("law", "").lower()
            or ql in i.get("article", "").lower()
        ]
    return {"items": items, "total": len(items)}


@router.get("/categories")
def get_categories(actor: str = Depends(require_token)):
    with open(_LAWS_FILE, encoding="utf-8") as f:
        data = json.load(f)
    names = {"labor_contract": "劳动法", "civil": "民法典", "criminal": "刑法", "administrative": "行政法", "procedure": "诉讼法", "company": "公司法"}
    return {"items": [{"id": k, "name": names.get(k, k), "count": len(v)} for k, v in data.items()]}


@router.get("/cases")
def search_cases(
    q: str = "",
    actor: str = Depends(require_token),
):
    """本地案例库检索。"""
    with open(_LAWS_FILE, encoding="utf-8") as f:
        data = json.load(f)
    cases = data.get("case_examples", [])
    if q:
        ql = q.lower()
        cases = [c for c in cases if ql in c.get("title","").lower() or ql in c.get("summary","").lower() or ql in c.get("law_ref","").lower()]
    return {"items": cases, "total": len(cases)}
