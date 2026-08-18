import { useMemo, useState } from "react";
import { Page } from "./Matters.js";

/** 赔偿计算器（移植旧 Web 页 calcDamages 逻辑，法条口径不变）。 */
const REASONS = [
  { key: "illegal", label: "违法解除（转正不通过/无理由辞退）" },
  { key: "negotiate", label: "协商解除" },
  { key: "personal", label: "个人原因离职" },
  { key: "expire", label: "合同到期不续签" },
];

interface Item {
  name: string;
  basis: string;
  amount: number;
}

export function CalculatorView() {
  const [salary, setSalary] = useState("12000");
  const [start, setStart] = useState("2026-02-01");
  const [end, setEnd] = useState("2026-08-05");
  const [reason, setReason] = useState("illegal");
  const [contract, setContract] = useState("unsigned");

  const { items, total } = useMemo(() => {
    const s = parseFloat(salary) || 0;
    const st = new Date(start);
    const en = new Date(end);
    if (!st.getTime() || !en.getTime() || en <= st) return { items: [] as Item[], total: 0 };
    const days = (en.getTime() - st.getTime()) / 86400000;
    const months = days / 30.44;
    const years = months / 12;
    const n = years < 0.5 ? 0.5 : Math.ceil(years);
    const list: Item[] = [];
    if (contract === "unsigned" && months > 1) {
      const dm = Math.min(Math.floor(months) - 1, 11);
      if (dm > 0) list.push({ name: "二倍工资差额", basis: `§82 · 入职满1月至离职 ${dm} 个月`, amount: s * dm });
    }
    if (reason === "illegal") {
      list.push({ name: "违法解除赔偿金（2N）", basis: `§87 · ${n} × 2 × 月工资`, amount: s * n * 2 });
    } else if (reason === "negotiate" || reason === "expire") {
      list.push({ name: "经济补偿金（N）", basis: `§47 · ${n} × 月工资`, amount: s * n });
    }
    return { items: list, total: list.reduce((sum, i) => sum + i.amount, 0) };
  }, [salary, start, end, reason, contract]);

  return (
    <Page title="赔偿计算器">
      <div className="calc-grid">
        <div className="card">
          <h3>输入案件信息</h3>
          <label className="field"><span className="field-label">月工资（税前）</span>
            <input type="number" value={salary} onChange={(e) => setSalary(e.target.value)} />
          </label>
          <label className="field"><span className="field-label">入职日期</span>
            <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </label>
          <label className="field"><span className="field-label">离职日期</span>
            <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </label>
          <label className="field"><span className="field-label">离职原因</span>
            <select value={reason} onChange={(e) => setReason(e.target.value)}>
              {REASONS.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
            </select>
          </label>
          <label className="field"><span className="field-label">是否签订书面劳动合同</span>
            <select value={contract} onChange={(e) => setContract(e.target.value)}>
              <option value="unsigned">未签订</option>
              <option value="signed">已签订</option>
            </select>
          </label>
        </div>

        <div>
          <div className="card calc-result">
            <div className="calc-total-label">赔偿总额（预估）</div>
            <div className="calc-total">¥{total.toLocaleString()}</div>
            <div className="calc-lines">
              {items.length === 0 && <div className="calc-line"><span>暂无赔偿项</span><span>¥0</span></div>}
              {items.map((i) => (
                <div key={i.name} className="calc-line">
                  <span>
                    <span className="calc-name">{i.name}</span>
                    <span className="calc-basis">{i.basis}</span>
                  </span>
                  <span>¥{i.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="calc-note">
            <strong>注意：</strong>二倍工资起算：入职满 1 个月的次日；满 6 个月不满 1 年按 1 年计算；最终以仲裁委裁决为准。
          </div>
        </div>
      </div>
    </Page>
  );
}
