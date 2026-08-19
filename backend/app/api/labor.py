"""劳动仲裁特色模块：案件进度表 + 待办 + 地区规则查询。

进度流按《劳动争议调解仲裁法》标准流程建模；地区规则只收录法条确定的
全国统一规定，当地口径提示用户自行核对，不做编造。
"""

import json
import sqlite3
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.api.documents import require_token
from app.config import Settings, get_settings
from app.db import db_session, now_iso

router = APIRouter(prefix="/api/labor", tags=["labor-arbitration"])

# 劳动仲裁标准阶段（法条节点注释见 hint）
STAGES = [
    {"key": "intake", "name": "咨询评估", "hint": "梳理诉求、时效核对（仲裁时效 1 年）"},
    {"key": "evidence", "name": "证据收集", "hint": "劳动合同、工资流水、考勤、解雇通知等"},
    {"key": "filing_prep", "name": "仲裁申请准备", "hint": "写申请书、算请求金额、按被申请人数备副本"},
    {"key": "filed", "name": "提交仲裁委", "hint": "向合同履行地或用人单位所在地仲裁委提交"},
    {"key": "accepted", "name": "受理与答辩", "hint": "仲裁委 5 日内决定是否受理；被申请人 10 日内答辩"},
    {"key": "hearing", "name": "开庭审理", "hint": "提前通知开庭；可先行调解"},
    {"key": "award", "name": "裁决", "hint": "受理后 45 日内裁决，复杂可延长 15 日"},
    {"key": "enforcement", "name": "执行/结案", "hint": "不服裁决 15 日内起诉；终局裁决可申请撤销/执行"},
]

# 全国统一规则 + 城市条目（当地细节提示核对，不写死易变数值）
NATIONAL_RULES = {
    "仲裁时效": "一般 1 年（《劳动争议调解仲裁法》第 27 条）；拖欠劳动报酬在劳动关系存续期间不受 1 年限制，终止后 1 年内提出。",
    "管辖": "劳动合同履行地或用人单位所在地仲裁委（第 21 条），双方分别申请时由合同履行地管辖。",
    "一裁终局": "追索劳动报酬/工伤医疗费/经济补偿或赔偿金，不超过当地月最低工资标准 12 个月金额的争议，裁决对用人单位终局（第 47 条）。",
    "审理期限": "受理后 45 日内结案，案情复杂经批准可延长 15 日（第 43 条）。",
    "费用": "劳动仲裁不收费（第 53 条）。",
}
REGION_NOTES = {
    "北京": "市、区两级仲裁委按用人单位注册地/劳动关系属地划分管辖，预约与材料份数以北京人社局公布口径为准。",
    "上海": "各区仲裁委受理为主，网上预约渠道见上海人社局；部分区对小额案件先行调解。",
    "广州": "区仲裁委管辖为主，粤籍外来务工人员可申请法律援助绿色通道。",
    "深圳": "涉经济补偿计算注意深圳特别规定与地方口径，以深圳人社局公布为准。",
}
REGION_DISCLAIMER = "以上为全国统一规定的整理；当地仲裁委地址、预约方式、材料细节请以当地人社部门最新公布为准。"


class LaborCaseCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    employee: str = Field(..., min_length=1, max_length=100)
    employer: str = Field(..., min_length=1, max_length=200)
    city: str = ""
    dispute_amount: str = ""
    claim_summary: str = ""
    matter_id: str | None = None


class LaborAdvance(BaseModel):
    note: str = ""


class LaborTodoCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    due: str = ""


def _ensure_tables(conn: sqlite3.Connection) -> None:
    conn.execute(
        """CREATE TABLE IF NOT EXISTS labor_cases (
            id TEXT PRIMARY KEY,
            matter_id TEXT,
            title TEXT NOT NULL,
            employee TEXT NOT NULL,
            employer TEXT NOT NULL,
            city TEXT DEFAULT '',
            dispute_amount TEXT DEFAULT '',
            claim_summary TEXT DEFAULT '',
            stage_index INTEGER NOT NULL DEFAULT 0,
            stage_notes TEXT DEFAULT '[]',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )"""
    )
    conn.execute(
        """CREATE TABLE IF NOT EXISTS labor_todos (
            id TEXT PRIMARY KEY,
            case_id TEXT NOT NULL,
            title TEXT NOT NULL,
            due TEXT DEFAULT '',
            done INTEGER NOT NULL DEFAULT 0,
            done_at TEXT DEFAULT '',
            created_at TEXT NOT NULL
        )"""
    )


def _case_row(conn: sqlite3.Connection, case_id: str) -> dict:
    row = conn.execute("SELECT * FROM labor_cases WHERE id = ?", (case_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="labor case not found")
    case = dict(row)
    case["stage"] = STAGES[case["stage_index"]]
    case["stage_notes"] = json.loads(case["stage_notes"] or "[]")
    case["stage_flow"] = [
        {**s, "reached": i <= case["stage_index"]} for i, s in enumerate(STAGES)
    ]
    todos = conn.execute(
        "SELECT * FROM labor_todos WHERE case_id = ? ORDER BY done, created_at", (case_id,)
    ).fetchall()
    case["todos"] = [dict(t) | {"done": bool(t["done"])} for t in todos]
    return case


@router.post("/cases")
def create_labor_case(
    body: LaborCaseCreate,
    actor: str = Depends(require_token),
    settings: Settings = Depends(get_settings),
):
    cid = uuid.uuid4().hex
    ts = now_iso()
    with db_session(settings.sqlite_path) as conn:
        _ensure_tables(conn)
        conn.execute(
            """INSERT INTO labor_cases
               (id, matter_id, title, employee, employer, city, dispute_amount,
                claim_summary, stage_index, stage_notes, created_at, updated_at)
               VALUES (?,?,?,?,?,?,?,?,0,'[]',?,?)""",
            (
                cid, body.matter_id, body.title, body.employee, body.employer,
                body.city, body.dispute_amount, body.claim_summary, ts, ts,
            ),
        )
        return _case_row(conn, cid)


@router.get("/cases")
def list_labor_cases(
    actor: str = Depends(require_token),
    settings: Settings = Depends(get_settings),
):
    with db_session(settings.sqlite_path) as conn:
        _ensure_tables(conn)
        rows = conn.execute(
            """SELECT id, title, employee, employer, city, dispute_amount,
                      stage_index, created_at, updated_at
               FROM labor_cases ORDER BY updated_at DESC"""
        ).fetchall()
        items = [dict(r) | {"stage": STAGES[r["stage_index"]]["name"]} for r in rows]
        return {"items": items}


@router.get("/cases/{case_id}")
def get_labor_case(
    case_id: str,
    actor: str = Depends(require_token),
    settings: Settings = Depends(get_settings),
):
    with db_session(settings.sqlite_path) as conn:
        _ensure_tables(conn)
        return _case_row(conn, case_id)


@router.post("/cases/{case_id}/advance")
def advance_labor_case(
    case_id: str,
    body: LaborAdvance,
    actor: str = Depends(require_token),
    settings: Settings = Depends(get_settings),
):
    with db_session(settings.sqlite_path) as conn:
        _ensure_tables(conn)
        case = _case_row(conn, case_id)
        if case["stage_index"] >= len(STAGES) - 1:
            raise HTTPException(status_code=400, detail="already at final stage")
        notes = case["stage_notes"]
        notes.append({"stage": case["stage"]["name"], "note": body.note, "at": now_iso()})
        conn.execute(
            "UPDATE labor_cases SET stage_index = stage_index + 1, stage_notes = ?, updated_at = ? WHERE id = ?",
            (json.dumps(notes, ensure_ascii=False), now_iso(), case_id),
        )
        return _case_row(conn, case_id)


@router.post("/cases/{case_id}/todos")
def add_labor_todo(
    case_id: str,
    body: LaborTodoCreate,
    actor: str = Depends(require_token),
    settings: Settings = Depends(get_settings),
):
    tid = uuid.uuid4().hex
    with db_session(settings.sqlite_path) as conn:
        _ensure_tables(conn)
        _case_row(conn, case_id)  # 404 if missing
        conn.execute(
            "INSERT INTO labor_todos (id, case_id, title, due, created_at) VALUES (?,?,?,?,?)",
            (tid, case_id, body.title, body.due, now_iso()),
        )
        return {"id": tid, "case_id": case_id, "title": body.title, "done": False}


@router.post("/todos/{todo_id}/done")
def finish_labor_todo(
    todo_id: str,
    actor: str = Depends(require_token),
    settings: Settings = Depends(get_settings),
):
    with db_session(settings.sqlite_path) as conn:
        _ensure_tables(conn)
        cur = conn.execute(
            "UPDATE labor_todos SET done = 1, done_at = ? WHERE id = ? AND done = 0",
            (now_iso(), todo_id),
        )
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="todo not found or already done")
        return {"id": todo_id, "done": True}


@router.get("/regions")
def labor_regions(
    city: str = "",
    actor: str = Depends(require_token),
):
    result = {"national": NATIONAL_RULES, "disclaimer": REGION_DISCLAIMER}
    if city:
        key = city.rstrip("市")
        result["city"] = city
        result["city_note"] = REGION_NOTES.get(key, f"暂无 {city} 的专属整理，按全国统一规则执行并核对当地口径。")
    else:
        result["cities"] = sorted(REGION_NOTES)
    return result


# ── 阶段子项检查清单 ──

STAGE_CHECKLISTS = {
    "intake": ["明确当事人信息", "梳理诉求方向", "评估时效是否过期", "确认管辖地"],
    "evidence": ["工资流水/银行转账", "劳动合同（如有）", "社保缴纳记录", "考勤记录", "辞退通知/解除证明", "工作群聊天记录"],
    "filing_prep": ["起草仲裁申请书", "计算请求金额", "准备证据清单", "按被申请人数备副本"],
    "filed": ["提交仲裁委", "获取受理回执", "确认答辩期"],
    "accepted": ["关注答辩意见", "准备质证提纲", "确认开庭日期"],
    "hearing": ["庭审提纲", "证据原件核对", "当事人庭前辅导"],
    "award": ["领取裁决书", "分析裁决结果", "评估是否起诉"],
    "enforcement": ["申请强制执行", "跟踪执行进度", "结案归档"],
}


@router.get("/cases/{case_id}/stage-checklist")
def get_stage_checklist(
    case_id: str,
    actor: str = Depends(require_token),
    settings: Settings = Depends(get_settings),
):
    with db_session(settings.sqlite_path) as conn:
        _ensure_tables(conn)
        case = _case_row(conn, case_id)
        stage_key = case["stage"]["key"]
        items = STAGE_CHECKLISTS.get(stage_key, [])
        # 已勾选状态存在 stage_notes 里（简化：从 todos 表查匹配标题）
        done_titles = {t["title"] for t in case["todos"] if t["done"]}
        return {
            "stage": case["stage"]["name"],
            "stage_key": stage_key,
            "items": [{"title": it, "done": it in done_titles} for it in items],
        }
