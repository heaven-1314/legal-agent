import { useMemo, useState } from "react";

/** 赔偿计算器：§82 二倍工资 / §87 违法解除 2N / §47 经济补偿 N，时效风险提示。 */
const REASONS = [
  { key: "illegal", label: "违法解除（无理由辞退/转正不通过）" },
  { key: "negotiate", label: "协商解除" },
  { key: "personal", label: "个人原因离职" },
  { key: "expire", label: "合同到期不续签" },
];

interface Item { name: string; basis: string; amount: number; stale?: boolean }

export function CalculatorView() {
  const [salary, setSalary] = useState("8000");
  const [start, setStart] = useState("2019-07-01");
  const [end, setEnd] = useState("2024-06-30");
  const [reason, setReason] = useState("illegal");
  const [contract, setContract] = useState("unsigned");

  const { items, total, months, n, stale82 } = useMemo(() => {
    const s = parseFloat(salary) || 0;
    const st = new Date(start);
    const en = new Date(end);
    const bad = !st.getTime() || !en.getTime() || en <= st;
    const days = bad ? 0 : (en.getTime() - st.getTime()) / 86400000;
    const mo = days / 30.44;
    const years = mo / 12;
    const nn = years < 0.5 ? 0.5 : Math.ceil(years);
    const list: Item[] = [];
    let s82 = false;
    if (contract === "unsigned" && mo > 1) {
      const dm = Math.min(Math.floor(mo) - 1, 11);
      if (dm > 0) {
        // §82 二倍工资时效：按离职日起算一年内可主张
        s82 = en.getTime() < Date.now() - 365 * 86400000;
        list.push({ name: "二倍工资差额", basis: `§82 · 入职满1月起 ${dm} 个月`, amount: s * dm, stale: s82 });
      }
    }
    if (reason === "illegal") list.push({ name: "违法解除赔偿金（2N）", basis: `§87 · ${nn} × 2 × 月工资`, amount: s * nn * 2 });
    else if (reason === "negotiate" || reason === "expire") list.push({ name: "经济补偿金（N）", basis: `§47 · ${nn} × 月工资`, amount: s * nn });
    return { items: list, total: list.reduce((a, i) => a + i.amount, 0), months: mo, n: nn, stale82: s82 };
  }, [salary, start, end, reason, contract]);

  return (
    <div className="pg-root">
      <div className="pg-head">
        <div className="grow">
          <h1 className="pg-title">赔偿计算器</h1>
          <div className="pg-sub">经济补偿 · 二倍工资 · 时效风险 · 即时联动</div>
        </div>
      </div>
      <div className="pg-body">
        <div className="calc-grid">
          <div className="card">
            <div className="set-sec" style={{ marginBottom: "12px" }}>案件信息</div>
            <div className="field"><div className="lab">月工资（税前，元）</div>
              <input className="input" type="number" value={salary} onChange={(e) => setSalary(e.target.value)} />
            </div>
            <div className="gw-row">
              <div className="field"><div className="lab">入职日期</div>
                <input className="input" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
              </div>
              <div className="field"><div className="lab">离职日期</div>
                <input className="input" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
              </div>
            </div>
            <div className="field"><div className="lab">离职原因</div>
              <select className="select" value={reason} onChange={(e) => setReason(e.target.value)}>
                {REASONS.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
              </select>
            </div>
            <div className="field"><div className="lab">书面劳动合同</div>
              <select className="select" value={contract} onChange={(e) => setContract(e.target.value)}>
                <option value="unsigned">未签订</option>
                <option value="signed">已签订</option>
              </select>
            </div>
            <p className="hint" style={{ marginTop: "8px" }}>工龄 {months.toFixed(1)} 个月 → 折算 N = {n}</p>
          </div>
          <div className="card">
            <div className="set-sec" style={{ marginBottom: "8px" }}>赔偿明细（预估）</div>
            <div className="calc-total">¥{total.toLocaleString()}</div>
            <div className="calc-lines">
              {items.length === 0 && <div className="calc-line"><span>暂无赔偿项</span><span>¥0</span></div>}
              {items.map((i) => (
                <div key={i.name} className="calc-line">
                  <span>
                    <span className="calc-name">{i.name}{i.stale && <span className="badge b-high" style={{ marginLeft: 6 }}>时效风险</span>}</span>
                    <span className="calc-basis">{i.basis}</span>
                  </span>
                  <span>¥{i.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div className="diag-hint" style={{ marginTop: "10px" }}>
              ⚠️ 二倍工资起算：入职满 1 个月的次日；满 6 个月不满 1 年按 1 年计；最终以仲裁委裁决为准。
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
