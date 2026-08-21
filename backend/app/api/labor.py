"""案件管理模块：支持民商事、刑事辩护、非诉业务三大分类的全生命周期阶段流转 + 检查单 + 待办。"""

import json
import sqlite3
import uuid
from typing import Dict, List, Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.api.documents import require_token
from app.config import Settings, get_settings
from app.db import db_session, now_iso

router = APIRouter(prefix="/api/labor", tags=["case-management"])

# 三大类案件阶段流转配置 (民商事、刑事、非诉)
CASE_STAGES: Dict[str, List[Dict[str, str]]] = {
    "civil": [
        {"key": "intake", "name": "咨询评估", "hint": "核对当事人主体、梳理案件事实与诉求、核实诉讼时效（3年）/仲裁时效（1年）"},
        {"key": "evidence", "name": "证据收集", "hint": "固定书证、物证、视听资料、电子数据，形成初步证据清单"},
        {"key": "prep", "name": "诉前准备", "hint": "撰写起诉状/仲裁申请书、计算标的利息、评估财产保全必要性"},
        {"key": "filing", "name": "立案受理", "hint": "向有管辖权的人民法院或仲裁委提交立案材料并缴纳诉讼规费"},
        {"key": "response", "name": "举证答辩", "hint": "接收法院传票与举证通知书、整理答辩意见、申请证人出庭或调查取证"},
        {"key": "hearing", "name": "开庭审理", "hint": "出庭参加法庭调查、法庭质证、发表辩论意见、评估庭审调解方案"},
        {"key": "judgment", "name": "裁判裁决", "hint": "签收判决书/调解书/裁决书，评估上诉/申请撤销裁决可行性（15日上诉期）"},
        {"key": "enforcement", "name": "执行结案", "hint": "督促生效文书履行、申请法院强制执行、款项受偿并归档结案"},
    ],
    "criminal": [
        {"key": "investigation", "name": "初查会见", "hint": "接受家属委托、前往看守所首次会见嫌疑人、了解涉嫌罪名与羁押情况"},
        {"key": "bail", "name": "侦查辩护", "hint": "向侦查机关提交取保候审申请书、申诉控告、羁押必要性审查意见"},
        {"key": "prosecution", "name": "审查起诉", "hint": "前往检察院查阅复制卷宗材料、核实笔录证据、提交不起诉或罪轻法律意见书"},
        {"key": "pre_trial", "name": "审前准备", "hint": "申请非法证据排除、申请证人出庭、参加庭前会议、拟定辩护策略"},
        {"key": "trial", "name": "一审庭审", "hint": "出庭辩护：发表质证意见、辩护人发问、进行法庭辩论、争取无罪或从轻减轻量刑"},
        {"key": "verdict", "name": "宣判上诉", "hint": "签收一审刑事判决书、会见被告人听取意见、在上诉期（10日）内提交上诉状"},
        {"key": "appeal_exec", "name": "执行申诉", "hint": "二审辩护或判决生效交付执行、跟进减刑假释、评估申诉再审"},
    ],
    "non_litigation": [
        {"key": "project_init", "name": "需求立项", "hint": "明确法律服务范围、签署法律顾问/专项法律服务委托协议"},
        {"key": "due_diligence", "name": "尽调核查", "hint": "开展尽职调查、核验主体资质、资产权属、合规隐患与涉诉风险"},
        {"key": "compliance_eval", "name": "合规论证", "hint": "梳理法律法规及监管口径、开展法律风险评估、设计交易架构与规避方案"},
        {"key": "drafting", "name": "文书起草", "hint": "起草合同协议、合规制度、企业章程、法律备忘录或专项法律意见书"},
        {"key": "negotiation", "name": "商业谈判", "hint": "参与多方商业与法律谈判、条款博弈修改、出具修改对照表（Diff）"},
        {"key": "closing", "name": "交割归档", "hint": "协助协议签署与交割落实、交付正式法律意见书、完成专项卷宗归档"},
    ],
}

# 兼容保留旧 STAGES
STAGES = CASE_STAGES["civil"]

STAGE_CHECKLISTS: Dict[str, Dict[str, List[str]]] = {
    "civil": {
        "intake": ["明确当事人诉求与事实经过", "核实当事人主体适格性与管辖法院/仲裁委", "核实诉讼时效/仲裁时效是否有效", "评估调解可行性与诉讼成本"],
        "evidence": ["收集并固定书证原件/合同文本", "提取并保存微信聊天/邮件往来等电子数据", "调取银行流水/财务凭证/发票记录", "整理证据目录与证明目的清单"],
        "prep": ["撰写民事起诉状/仲裁申请书", "精确核算诉讼请求金额（本金/利息/违约金）", "评估是否申请诉前/诉讼财产保全", "准备原被告主体资格材料（身份证/工商内档）"],
        "filing": ["向管辖法院或仲裁委提交全套立案材料", "及时缴纳案件受理费/保全费", "跟进立案审批并获取立案受理通知书", "记录案号及承办法官/仲裁员信息"],
        "response": ["签收法院送达的对方当事人证据副本", "针对对方证据整理质证要点与反驳证据", "起草并提交书面答辩状", "评估是否需要提起反诉或管辖权异议"],
        "hearing": ["核对庭审证据原件", "出庭参加法庭调查与事实询问", "围绕争议焦点发表法庭辩论意见", "核对庭审笔录签字确认并提交代理词"],
        "judgment": ["签收裁判文书并详细核对判决主文", "向委托人释明裁判结果并解答疑虑", "评估上诉可行性（注意15日上诉不变期间）", "如不上诉，跟进文书生效证明开具"],
        "enforcement": ["督促义务人在文书指定履行期内主动履行", "准备强制执行申请书及被执行人财产线索", "向法院执行局申请立案执行", "执行案款受偿核销并办理结案归档"],
    },
    "criminal": {
        "investigation": ["接受委托并签署刑事辩护委托协议/出具公函", "前往看守所首次会见犯罪嫌疑人", "了解涉嫌罪名、涉案事实与羁押时间节点", "告知诉讼权利与自愿认罪认罚制度利弊"],
        "bail": ["向办案机关提交取保候审申请书", "对超期羁押或违法取证提出申诉控告", "向检察院侦监部门提出不予批准逮捕法律意见", "跟进羁押必要性审查"],
        "prosecution": ["前往检察院查阅、摘抄、复制全案卷宗材料", "核对起诉意见书与言词证据/客观证据矛盾点", "会见犯罪嫌疑人核实卷宗疑点", "向检察院提交相对不起诉或罪轻辩护意见书"],
        "pre_trial": ["申请调取侦查机关未随案移送的无罪/罪轻证据", "申请非法证据排除及证据合法性调查", "参加法庭庭前会议明确争议焦点", "拟定庭审发问提纲与辩护要点"],
        "trial": ["出庭参加法庭调查，对公诉方证据逐项质证", "辩护人有针对性发问被告人、证人、鉴定人", "围绕犯罪构成与量刑情节发表辩护意见", "提交书面辩护词并核对庭审笔录"],
        "verdict": ["签收一审判决书并与被告人会见沟通判决结果", "分析判决认定事实与适用法律是否妥当", "在10日上诉期内代为起草并递交上诉状", "准备二审开庭辩护或书面审理意见"],
        "appeal_exec": ["二审阅卷及辩护工作开展", "判决生效后协助家属跟进交付执行服刑地点", "评估是否存在法定减刑、假释、保外就医条件", "对明显冤错案件准备申诉再审材料"],
    },
    "non_litigation": {
        "project_init": ["与客户对接梳理非诉法律服务需求与商业目标", "拟定服务方案、工作时间表与服务费用测算", "签署常年法律顾问/专项法律服务合同", "建立项目专属沟通与保密工作机制"],
        "due_diligence": ["拟定并发送尽职调查清单（法律/资质/财务/涉诉）", "调取目标企业工商档案、不动产权属与知识产权登记", "审查历史合同履行、行政处罚与未结诉讼仲裁", "形成尽职调查底稿与事实备忘录"],
        "compliance_eval": ["梳理行业监管政策与最新法律法规红线", "识别重大法律合规隐患与法律风险等级", "设计交易架构、合规整改方案或节税风控路径", "召开项目专项法律论证会"],
        "drafting": ["起草核心交易合同、并购协议、章程等法律文件", "撰写专项合规审查报告或正式法律意见书", "设计核心商业条款（对赌、回购、违约退出机制）", "内部多审复核文书准确度"],
        "negotiation": ["陪同客户参与多方商务与法律谈判", "围绕关键风控条款进行法律博弈与条款修改", "输出修改标记对照表（Diff）及法律风险提示", "多方确认并锁定终版签约文本"],
        "closing": ["见证签约并协助办理行政审批/工商变更登记", "出具最终版盖章交付的正式法律意见书", "指导完成资产交割与款项支付先决条件核验", "项目全套工作底稿与法律文件归档"],
    },
}

NATIONAL_RULES = {
    "仲裁时效": "劳动争议 1 年（《劳动争议调解仲裁法》第 27 条）；民商事诉讼时效一般 3 年（《民法典》第 188 条）。",
    "管辖原则": "民事诉讼‘原告就被告’为主，合同纠纷由被告住所地或合同履行地管辖；劳动纠纷由用人单位所在地或劳动合同履行地管辖。",
    "上诉期限": "民事一审判决书上诉期 15 日（裁定书 10 日）；刑事一审判决书上诉期 10 日（裁定书 5 日）。",
    "保全申请": "诉前或诉中可向法院申请财产保全，防止对方转移隐匿财产，需提供相应担保财产线索。",
}
REGION_NOTES = {
    "北京": "市、区两级法院/仲裁委按属地划分管辖，预约与材料份数以北京法院网/人社局公布口径为准。",
    "上海": "各区法院/仲裁委受理为主，网上预约渠道见上海一网通办；部分基层法院实行全流程无纸化集约送达。",
    "广州": "各区法院与劳动仲裁委管辖为主，商事纠纷可充分利用广州互联网法院及微法院小程序立案。",
    "深圳": "涉前海合作区或跨境商事纠纷适用特别规则，诉讼文书送达与调解机制以深圳中院口径为准。",
}
REGION_DISCLAIMER = "以上为全国统一法条规则整理；具体法院/仲裁委立案窗口要求、材料份数请以当地司法行政部门最新公布为准。"


class CaseCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    case_type: str = "civil"  # civil (民商事) | criminal (刑事) | non_litigation (非诉)
    employee: str = ""        # 委托人 / 原告 / 嫌疑人 / 咨询方
    employer: str = ""        # 相对人 / 被告 / 涉案单位 / 目标主体
    city: str = ""
    dispute_amount: str = ""
    claim_summary: str = ""
    matter_id: str | None = None


class CaseAdvance(BaseModel):
    note: str = ""


class TodoCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    due: str = ""


def _ensure_tables(conn: sqlite3.Connection) -> None:
    conn.execute(
        """CREATE TABLE IF NOT EXISTS labor_cases (
            id TEXT PRIMARY KEY,
            matter_id TEXT,
            title TEXT NOT NULL,
            case_type TEXT DEFAULT 'civil',
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
    # 尝试补列（兼容老库）
    try:
        conn.execute("ALTER TABLE labor_cases ADD COLUMN case_type TEXT DEFAULT 'civil'")
    except sqlite3.OperationalError:
        pass

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


def _get_stages_for_type(case_type: str) -> List[Dict[str, str]]:
    return CASE_STAGES.get(case_type, CASE_STAGES["civil"])


def _case_row(conn: sqlite3.Connection, case_id: str) -> dict:
    row = conn.execute("SELECT * FROM labor_cases WHERE id = ?", (case_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="case not found")
    case = dict(row)
    ctype = case.get("case_type") or "civil"
    stages = _get_stages_for_type(ctype)
    sidx = min(case["stage_index"], len(stages) - 1)
    case["stage_index"] = sidx
    case["stage"] = stages[sidx]
    case["stage_notes"] = json.loads(case["stage_notes"] or "[]")
    case["stage_flow"] = [
        {**s, "reached": i <= sidx} for i, s in enumerate(stages)
    ]
    todos = conn.execute(
        "SELECT * FROM labor_todos WHERE case_id = ? ORDER BY done, created_at", (case_id,)
    ).fetchall()
    case["todos"] = [dict(t) | {"done": bool(t["done"])} for t in todos]
    return case


@router.post("/cases")
def create_case(
    body: CaseCreate,
    actor: str = Depends(require_token),
    settings: Settings = Depends(get_settings),
):
    with db_session(settings.sqlite_path) as conn:
        _ensure_tables(conn)
        case_id = uuid.uuid4().hex
        now = now_iso()
        ctype = body.case_type if body.case_type in CASE_STAGES else "civil"
        conn.execute(
            """INSERT INTO labor_cases (
                id, matter_id, title, case_type, employee, employer, city,
                dispute_amount, claim_summary, stage_index, stage_notes,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, '[]', ?, ?)""",
            (
                case_id,
                body.matter_id,
                body.title,
                ctype,
                body.employee or "未填写",
                body.employer or "未填写",
                body.city,
                body.dispute_amount,
                body.claim_summary,
                now,
                now,
            ),
        )
        return _case_row(conn, case_id)


@router.get("/cases")
def list_cases(
    case_type: str | None = None,
    actor: str = Depends(require_token),
    settings: Settings = Depends(get_settings),
):
    with db_session(settings.sqlite_path) as conn:
        _ensure_tables(conn)
        if case_type and case_type in CASE_STAGES:
            rows = conn.execute(
                "SELECT * FROM labor_cases WHERE case_type = ? ORDER BY created_at DESC",
                (case_type,)
            ).fetchall()
        else:
            rows = conn.execute("SELECT * FROM labor_cases ORDER BY created_at DESC").fetchall()

        items = []
        for r in rows:
            c = dict(r)
            ctype = c.get("case_type") or "civil"
            stages = _get_stages_for_type(ctype)
            sidx = min(c["stage_index"], len(stages) - 1)
            c["stage_type_label"] = "民商事" if ctype == "civil" else ("刑事" if ctype == "criminal" else "非诉")
            c["stage"] = stages[sidx]["name"]
            items.append(c)
        return {"items": items}


@router.get("/cases/{case_id}")
def get_case(
    case_id: str,
    actor: str = Depends(require_token),
    settings: Settings = Depends(get_settings),
):
    with db_session(settings.sqlite_path) as conn:
        _ensure_tables(conn)
        return _case_row(conn, case_id)


@router.post("/cases/{case_id}/advance")
def advance_case(
    case_id: str,
    body: CaseAdvance,
    actor: str = Depends(require_token),
    settings: Settings = Depends(get_settings),
):
    with db_session(settings.sqlite_path) as conn:
        _ensure_tables(conn)
        case = _case_row(conn, case_id)
        ctype = case.get("case_type") or "civil"
        stages = _get_stages_for_type(ctype)
        if case["stage_index"] >= len(stages) - 1:
            raise HTTPException(status_code=400, detail="案件已处于最后阶段，无法继续推进")

        new_index = case["stage_index"] + 1
        notes = case["stage_notes"]
        if body.note:
            notes.append({"stage": stages[new_index]["name"], "note": body.note, "at": now_iso()})
        conn.execute(
            "UPDATE labor_cases SET stage_index = ?, stage_notes = ?, updated_at = ? WHERE id = ?",
            (new_index, json.dumps(notes, ensure_ascii=False), now_iso(), case_id),
        )
        return _case_row(conn, case_id)


@router.get("/cases/{case_id}/stage-checklist")
def get_stage_checklist(
    case_id: str,
    actor: str = Depends(require_token),
    settings: Settings = Depends(get_settings),
):
    with db_session(settings.sqlite_path) as conn:
        _ensure_tables(conn)
        case = _case_row(conn, case_id)
        ctype = case.get("case_type") or "civil"
        stages = _get_stages_for_type(ctype)
        sidx = case["stage_index"]
        stage_key = stages[sidx]["key"]
        stage_name = stages[sidx]["name"]

        checklist_items = STAGE_CHECKLISTS.get(ctype, {}).get(stage_key, [])
        existing_todos = {t["title"] for t in case["todos"]}

        items = [
            {"title": item, "done": item in existing_todos and any(t["done"] for t in case["todos"] if t["title"] == item)}
            for item in checklist_items
        ]
        return {
            "stage": stage_name,
            "stage_key": stage_key,
            "case_type": ctype,
            "items": items,
        }


@router.post("/cases/{case_id}/todos")
def create_todo(
    case_id: str,
    body: TodoCreate,
    actor: str = Depends(require_token),
    settings: Settings = Depends(get_settings),
):
    with db_session(settings.sqlite_path) as conn:
        _ensure_tables(conn)
        _case_row(conn, case_id)
        todo_id = uuid.uuid4().hex
        now = now_iso()
        conn.execute(
            """INSERT INTO labor_todos (id, case_id, title, due, done, created_at)
               VALUES (?, ?, ?, ?, 0, ?)""",
            (todo_id, case_id, body.title, body.due, now),
        )
        return {"id": todo_id, "case_id": case_id, "title": body.title, "done": False, "created_at": now}


@router.delete("/todos/{todo_id}")
def delete_todo(
    todo_id: str,
    actor: str = Depends(require_token),
    settings: Settings = Depends(get_settings),
):
    with db_session(settings.sqlite_path) as conn:
        _ensure_tables(conn)
        res = conn.execute("DELETE FROM labor_todos WHERE id = ?", (todo_id,))
        if res.rowcount == 0:
            raise HTTPException(status_code=404, detail="todo not found")
        return {"ok": True}


@router.post("/todos/{todo_id}/done")
def complete_todo(
    todo_id: str,
    actor: str = Depends(require_token),
    settings: Settings = Depends(get_settings),
):
    with db_session(settings.sqlite_path) as conn:
        _ensure_tables(conn)
        now = now_iso()
        res = conn.execute(
            "UPDATE labor_todos SET done = 1, done_at = ? WHERE id = ?",
            (now, todo_id),
        )
        if res.rowcount == 0:
            raise HTTPException(status_code=404, detail="todo not found")
        return {"ok": True, "done": True, "done_at": now}


@router.get("/todos/open")
def list_open_todos(
    limit: int = 20,
    actor: str = Depends(require_token),
    settings: Settings = Depends(get_settings),
):
    with db_session(settings.sqlite_path) as conn:
        _ensure_tables(conn)
        rows = conn.execute(
            """SELECT t.id, t.title, t.due, t.done, t.created_at,
                      c.title as case_title, c.id as case_id, c.case_type
               FROM labor_todos t
               JOIN labor_cases c ON c.id = t.case_id
               WHERE t.done = 0
               ORDER BY t.created_at DESC LIMIT ?""",
            (limit,),
        ).fetchall()
        return {"items": [dict(r) | {"done": bool(r["done"])} for r in rows]}


@router.get("/regions")
def get_region_rules(
    city: str = "",
    actor: str = Depends(require_token),
    settings: Settings = Depends(get_settings),
):
    note = REGION_NOTES.get(city.strip(), "暂无该城市特定规则，适用全国统一规定。")
    return {
        "city": city,
        "city_note": note,
        "national": NATIONAL_RULES,
        "disclaimer": REGION_DISCLAIMER,
    }
