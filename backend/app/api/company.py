"""企业工商信息查询（天眼查移动端接口封装）。

⚠️ 仅限日常偶尔查询，禁高频批量抓取（接口有风控）。
"""
from __future__ import annotations

import re

import requests
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.api.documents import require_token
from app.config import Settings, get_settings

router = APIRouter(prefix="/api/company", tags=["company"])

API_URL = "https://m.tianyancha.com/proxyPeers/getCompanyPhone.json"

FIELD_MAP = {
    "name": "公司名称", "abbr": "简称", "creditCode": "统一社会信用代码",
    "regNumber": "注册号", "legalPersonName": "法定代表人", "regCapital": "注册资本",
    "estiblishTime": "成立日期", "regStatus": "经营状态", "companyOrgType": "公司类型",
    "regLocation": "注册地址", "businessScope": "经营范围", "companyScale": "企业规模",
    "phone": "联系电话", "city": "所在城市", "industry": "行业",
}


class CompanyQuery(BaseModel):
    keyword: str


def _clean(val) -> str:
    if val is None:
        return ""
    text = re.sub(r"<[^>]+>", "", str(val))
    return re.sub(r"\s+", " ", text).strip()


@router.post("/query")
def query_company(
    body: CompanyQuery,
    actor: str = Depends(require_token),
    settings: Settings = Depends(get_settings),
):
    if not body.keyword.strip():
        raise HTTPException(status_code=400, detail="keyword required")
    try:
        resp = requests.get(
            API_URL,
            params={"cate": "", "baseCode": "", "base": "", "key": body.keyword.strip()},
            headers={"User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)"},
            timeout=15,
        )
        data = resp.json()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"查询失败: {e}") from e

    raw = data.get("data") or {}
    items = raw.get("items") or raw.get("data") or []
    if isinstance(items, dict):
        items = list(items.values())
    results = []
    for item in items:
        if not isinstance(item, dict):
            continue
        row = {}
        for en, zh in FIELD_MAP.items():
            val = _clean(item.get(en, ""))
            if val:
                row[zh] = val
        if row.get("公司名称"):
            results.append(row)
    return {"items": results}
