import { useState } from "react";
import { bridge } from "../../bridge.js";
import { apiErr } from "../UploadButton.js";

const CASE_TYPES = [
  {
    key: "civil",
    name: "⚖️ 民商事",
    desc: "合同纠纷 · 劳动争议 · 侵权损害 · 借贷担保",
    actor1: "原告/申请人",
    actor2: "被告/被申请人",
    amountLabel: "涉案标的额",
    amountPlaceholder: "如：100,000 元",
  },
  {
    key: "criminal",
    name: "🛡️ 刑事辩护",
    desc: "初查会见 · 取保候审 · 审查起诉 · 庭审辩护",
    actor1: "嫌疑人/被告人",
    actor2: "办案机关/被害人",
    amountLabel: "涉嫌罪名",
    amountPlaceholder: "如：职务侵占罪 / 危险驾驶罪",
  },
  {
    key: "non_litigation",
    name: "📑 非诉业务",
    desc: "尽职调查 · 企业合规 · 投融资并购 · 意见书",
    actor1: "委托方/客户",
    actor2: "目标企业/相对方",
    amountLabel: "项目标的/规模",
    amountPlaceholder: "如：5,000 万元并购标的",
  },
];

export function CreateCaseForm(props: {
  onCancel: () => void;
  onCreated: () => void;
  onError: (msg: string) => void;
}) {
  const [caseType, setCaseType] = useState<string>("civil");
  const [f, setF] = useState({
    title: "",
    employee: "",
    employer: "",
    city: "北京",
    dispute_amount: "",
    claim_summary: "",
  });
  const [busy, setBusy] = useState(false);

  const selectedMeta = CASE_TYPES.find((c) => c.key === caseType) || CASE_TYPES[0];

  const submit = async () => {
    if (!f.title.trim()) return;
    setBusy(true);
    const res = await bridge.api({
      method: "POST",
      path: "/api/labor/cases",
      body: {
        ...f,
        case_type: caseType,
        title: f.title.trim(),
      },
    });
    setBusy(false);
    if (res.ok) {
      props.onCreated();
    } else {
      props.onError(apiErr(res, "创建案件失败"));
    }
  };

  return (
    <div className="card" style={{ marginTop: 14 }}>
      <div className="card-head">
        <span className="card-title">新建法律案件 / 事务</span>
      </div>

      {/* 三大类案件分类卡片选择 */}
      <div style={{ marginBottom: 14 }}>
        <div className="lab" style={{ marginBottom: 6 }}>
          业务分类 *
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
          {CASE_TYPES.map((t) => (
            <div
              key={t.key}
              onClick={() => setCaseType(t.key)}
              style={{
                padding: "12px 14px",
                borderRadius: "var(--r-md)",
                border: `1.5px solid ${caseType === t.key ? "var(--accent)" : "var(--border)"}`,
                background: caseType === t.key ? "var(--accent-soft)" : "var(--surface)",
                cursor: "pointer",
                transition: "var(--t-state)",
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 13.5, color: caseType === t.key ? "var(--accent-deep)" : "var(--fg-strong)" }}>
                {t.name}
              </div>
              <div className="muted" style={{ fontSize: 11.5, marginTop: 3 }}>
                {t.desc}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 案件基本信息 */}
      <div className="field" style={{ marginBottom: 10 }}>
        <div className="lab">案件/项目名称 *</div>
        <input
          className="input"
          value={f.title}
          onChange={(e) => setF({ ...f, title: e.target.value })}
          placeholder={`如：${caseType === "civil" ? "张某诉某科技公司劳动争议纠纷" : caseType === "criminal" ? "李某涉嫌职务侵占案辩护" : "某集团收购某标的尽职调查与合规审查"}`}
        />
      </div>

      <div className="gw-row" style={{ marginBottom: 10 }}>
        <div className="field" style={{ flex: 1, minWidth: 200 }}>
          <div className="lab">{selectedMeta.actor1}</div>
          <input
            className="input"
            value={f.employee}
            onChange={(e) => setF({ ...f, employee: e.target.value })}
            placeholder="姓名 / 委托方名称"
          />
        </div>
        <div className="field" style={{ flex: 1, minWidth: 200 }}>
          <div className="lab">{selectedMeta.actor2}</div>
          <input
            className="input"
            value={f.employer}
            onChange={(e) => setF({ ...f, employer: e.target.value })}
            placeholder="对方当事人 / 涉案主体 / 目标企业"
          />
        </div>
      </div>

      <div className="gw-row" style={{ marginBottom: 10 }}>
        <div className="field" style={{ width: 140, flexShrink: 0 }}>
          <div className="lab">管辖城市/机关</div>
          <input
            className="input"
            value={f.city}
            onChange={(e) => setF({ ...f, city: e.target.value })}
            placeholder="北京"
          />
        </div>
        <div className="field" style={{ flex: 1, minWidth: 200 }}>
          <div className="lab">{selectedMeta.amountLabel}</div>
          <input
            className="input"
            value={f.dispute_amount}
            onChange={(e) => setF({ ...f, dispute_amount: e.target.value })}
            placeholder={selectedMeta.amountPlaceholder}
          />
        </div>
      </div>

      <div className="field" style={{ marginBottom: 12 }}>
        <div className="lab">案件事实与主要诉求/目标</div>
        <textarea
          className="textarea"
          rows={3}
          value={f.claim_summary}
          onChange={(e) => setF({ ...f, claim_summary: e.target.value })}
          placeholder="简要记录当事人核心事实、争议诉求或专项法律工作范围…"
        />
      </div>

      <div className="form-actions">
        <button
          className="btn primary"
          onClick={submit}
          disabled={busy || !f.title.trim()}
        >
          {busy ? "创建中…" : "确认建档"}
        </button>
        <button className="btn outline" onClick={props.onCancel}>
          取消
        </button>
      </div>
    </div>
  );
}
