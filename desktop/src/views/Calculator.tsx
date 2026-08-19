import { useMemo, useState } from "react";

type CalcTab = "labor" | "traffic" | "injury" | "loan";

const TABS: { key: CalcTab; label: string; icon: string }[] = [
  { key: "labor", label: "劳动仲裁", icon: "i-calc" },
  { key: "traffic", label: "交通事故", icon: "i-calc" },
  { key: "injury", label: "工伤待遇", icon: "i-calc" },
  { key: "loan", label: "借贷利息", icon: "i-calc" },
];

interface CalcItem { name: string; basis: string; amount: number }

// ── 劳动仲裁 ──
const REASONS = [
  { key: "illegal", label: "违法解除（2N）" },
  { key: "negotiate", label: "协商解除（N）" },
  { key: "personal", label: "个人原因（0）" },
  { key: "expire", label: "到期不续签（N）" },
];
function LaborCalc() {
  const [salary, setSalary] = useState("8000");
  const [start, setStart] = useState("2019-07-01");
  const [end, setEnd] = useState("2024-06-30");
  const [reason, setReason] = useState("illegal");
  const [contract, setContract] = useState("unsigned");
  const { items, total } = useMemo(() => {
    const s = parseFloat(salary) || 0;
    const st = new Date(start), en = new Date(end);
    const mo = !st.getTime() || !en.getTime() || en <= st ? 0 : (en.getTime() - st.getTime()) / 86400000 / 30.44;
    const years = mo / 12;
    const n = years < 0.5 ? 0.5 : Math.ceil(years);
    const list: CalcItem[] = [];
    if (contract === "unsigned" && mo > 1) {
      const dm = Math.min(Math.floor(mo) - 1, 11);
      if (dm > 0) list.push({ name: "二倍工资差额", basis: `§82 · ${dm} 个月`, amount: s * dm });
    }
    if (reason === "illegal") list.push({ name: "违法解除赔偿金", basis: `§87 · ${n} × 2 × 月工资`, amount: s * n * 2 });
    else if (reason === "negotiate" || reason === "expire") list.push({ name: "经济补偿金", basis: `§47 · ${n} × 月工资`, amount: s * n });
    return { items: list, total: list.reduce((a, i) => a + i.amount, 0) };
  }, [salary, start, end, reason, contract]);
  return (
    <div className="calc-grid">
      <div className="card">
        <div className="field"><div className="lab">月工资（税前，元）</div><input className="input" type="number" value={salary} onChange={(e) => setSalary(e.target.value)} /></div>
        <div className="gw-row">
          <div className="field"><div className="lab">入职日期</div><input className="input" type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
          <div className="field"><div className="lab">离职日期</div><input className="input" type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
        </div>
        <div className="field"><div className="lab">离职原因</div><select className="select" value={reason} onChange={(e) => setReason(e.target.value)}>{REASONS.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}</select></div>
        <div className="field"><div className="lab">书面劳动合同</div><select className="select" value={contract} onChange={(e) => setContract(e.target.value)}><option value="unsigned">未签订</option><option value="signed">已签订</option></select></div>
      </div>
      <CalcResult items={items} total={total} note="二倍工资起算：入职满 1 个月的次日；满 6 个月不满 1 年按 1 年计；最终以仲裁委裁决为准" />
    </div>
  );
}

// ── 交通事故 ──
function TrafficCalc() {
  const [medical, setMedical] = useState("50000");
  const [lostDays, setLostDays] = useState("90");
  const [dailyWage, setDailyWage] = useState("300");
  const [nurseDays, setNurseDays] = useState("30");
  const [disability, setDisability] = useState("10"); // 伤残等级 1-10
  const [cityIncome, setCityIncome] = useState("60000"); // 城镇人均可支配收入
  const items = useMemo(() => {
    const med = parseFloat(medical) || 0;
    const lost = (parseInt(lostDays) || 0) * (parseFloat(dailyWage) || 0);
    const nurse = (parseInt(nurseDays) || 0) * 150; // 护理费按 150/天估
    const list: CalcItem[] = [
      { name: "医疗费", basis: "实际支出", amount: med },
      { name: "误工费", basis: `${lostDays} 天 × ${dailyWage} 元/天`, amount: lost },
      { name: "护理费", basis: `${nurseDays} 天 × 150 元/天（估）`, amount: nurse },
    ];
    const level = parseInt(disability) || 10;
    if (level < 10) {
      const ratio = (11 - level) / 10;
      const disabilityPay = (parseFloat(cityIncome) || 0) * 20 * ratio;
      list.push({ name: `伤残赔偿金（${level} 级）`, basis: `城市人均收入 × 20 年 × ${ratio * 100}%`, amount: disabilityPay });
    }
    return list;
  }, [medical, lostDays, dailyWage, nurseDays, disability, cityIncome]);
  const total = items.reduce((a, i) => a + i.amount, 0);
  return (
    <div className="calc-grid">
      <div className="card">
        <div className="field"><div className="lab">医疗费（元）</div><input className="input" type="number" value={medical} onChange={(e) => setMedical(e.target.value)} /></div>
        <div className="gw-row">
          <div className="field"><div className="lab">误工天数</div><input className="input" type="number" value={lostDays} onChange={(e) => setLostDays(e.target.value)} /></div>
          <div className="field"><div className="lab">日工资（元）</div><input className="input" type="number" value={dailyWage} onChange={(e) => setDailyWage(e.target.value)} /></div>
        </div>
        <div className="gw-row">
          <div className="field"><div className="lab">护理天数</div><input className="input" type="number" value={nurseDays} onChange={(e) => setNurseDays(e.target.value)} /></div>
          <div className="field"><div className="lab">伤残等级（1-10）</div><input className="input" type="number" min="1" max="10" value={disability} onChange={(e) => setDisability(e.target.value)} /></div>
        </div>
        <div className="field"><div className="lab">城市人均可支配收入（年，元）</div><input className="input" type="number" value={cityIncome} onChange={(e) => setCityIncome(e.target.value)} /></div>
      </div>
      <CalcResult items={items} total={total} note="伤残赔偿金 = 城市人均收入 × 20 年 × 伤残系数；10 级=10%、1 级=100%；最终以司法鉴定为准" />
    </div>
  );
}

// ── 工伤待遇 ──
function InjuryCalc() {
  const [salary, setSalary] = useState("6000");
  const [level, setLevel] = useState("10");
  const items = useMemo(() => {
    const s = parseFloat(salary) || 0;
    const lv = parseInt(level) || 10;
    const ratio = (11 - lv) / 10;
    const list: CalcItem[] = [
      { name: "一次性伤残补助金", basis: `${lv} 级 · ${Math.round(7 + (10 - lv) * 1.3)} 个月 × 本人工资`, amount: s * Math.round(7 + (10 - lv) * 1.3) },
      { name: "一次性工伤医疗补助金", basis: "由省级规定（估 4-20 个月社平）", amount: s * 4 },
      { name: "一次性伤残就业补助金", basis: "由省级规定（估 4-20 个月社平）", amount: s * 4 },
    ];
    if (lv <= 4) list.push({ name: "伤残津贴（月付）", basis: `${lv} 级 · 本人工资 × ${ratio * 100}%/月`, amount: s * ratio });
    return list;
  }, [salary, level]);
  const total = items.filter(i => !i.name.includes("月付")).reduce((a, i) => a + i.amount, 0);
  return (
    <div className="calc-grid">
      <div className="card">
        <div className="field"><div className="lab">本人工资（月，元）</div><input className="input" type="number" value={salary} onChange={(e) => setSalary(e.target.value)} /></div>
        <div className="field"><div className="lab">伤残等级（1-10）</div>
          <select className="select" value={level} onChange={(e) => setLevel(e.target.value)}>
            {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n} 级</option>)}
          </select>
        </div>
      </div>
      <CalcResult items={items} total={total} note="一次性补助月数因伤残等级而异；医疗/就业补助金各省标准不同，此处按估算值；最终以工伤保险条例及地方标准为准" />
    </div>
  );
}

// ── 借贷利息 ──
function LoanCalc() {
  const [principal, setPrincipal] = useState("100000");
  const [rate, setRate] = useState("12"); // 年利率 %
  const [months, setMonths] = useState("12");
  const [type, setType] = useState("simple"); // simple/compound
  const items = useMemo(() => {
    const p = parseFloat(principal) || 0;
    const r = (parseFloat(rate) || 0) / 100 / 12;
    const m = parseInt(months) || 1;
    let interest: number;
    let basis: string;
    if (type === "simple") {
      interest = p * r * m;
      basis = `本金 × 月利率 × ${m} 月（单利）`;
    } else {
      interest = p * (Math.pow(1 + r, m) - 1);
      basis = `本金 × (1+月利率)^${m} - 本金（复利）`;
    }
    // 法律保护上限检查（LPR 4倍约 15.4%）
    const legalRate = 15.4;
    const actualRate = parseFloat(rate) || 0;
    const isOver = actualRate > legalRate;
    const list: CalcItem[] = [{ name: "利息总额", basis, amount: interest }];
    if (isOver) {
      const legalInterest = p * (legalRate / 100 / 12) * m;
      list.push({ name: "法律保护上限内利息", basis: `按 LPR 4 倍（≈${legalRate}%）计`, amount: legalInterest });
      list.push({ name: "超出部分（不受保护）", basis: `超出 ${actualRate}% - ${legalRate}%`, amount: interest - legalInterest });
    }
    return list;
  }, [principal, rate, months, type]);
  const total = items[0]?.amount ?? 0;
  return (
    <div className="calc-grid">
      <div className="card">
        <div className="field"><div className="lab">本金（元）</div><input className="input" type="number" value={principal} onChange={(e) => setPrincipal(e.target.value)} /></div>
        <div className="gw-row">
          <div className="field"><div className="lab">年利率（%）</div><input className="input" type="number" value={rate} onChange={(e) => setRate(e.target.value)} /></div>
          <div className="field"><div className="lab">期限（月）</div><input className="input" type="number" value={months} onChange={(e) => setMonths(e.target.value)} /></div>
        </div>
        <div className="field"><div className="lab">计息方式</div>
          <select className="select" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="simple">单利</option>
            <option value="compound">复利</option>
          </select>
        </div>
      </div>
      <CalcResult items={items} total={total} note="民间借贷利率司法保护上限为 LPR 的 4 倍（当前约 15.4%/年）；超出部分法院不予支持" />
    </div>
  );
}

function CalcResult(props: { items: CalcItem[]; total: number; note: string }) {
  return (
    <div className="card">
      <div className="set-sec" style={{ marginBottom: 8 }}>赔偿明细（预估）</div>
      <div className="calc-total">¥{props.total.toLocaleString()}</div>
      <div className="calc-lines">
        {props.items.length === 0 && <div className="calc-line"><span>暂无项目</span><span>¥0</span></div>}
        {props.items.map((i) => (
          <div key={i.name} className="calc-line">
            <span><span className="calc-name">{i.name}</span><span className="calc-basis">{i.basis}</span></span>
            <span>¥{i.amount.toLocaleString()}</span>
          </div>
        ))}
      </div>
      <div className="diag-hint" style={{ marginTop: 10 }}>⚠️ {props.note}</div>
    </div>
  );
}

export function CalculatorView() {
  const [tab, setTab] = useState<CalcTab>("labor");
  return (
    <div className="pg-root">
      <div className="pg-head">
        <div className="grow">
          <h1 className="pg-title">赔偿计算器</h1>
          <div className="pg-sub">劳动仲裁 · 交通事故 · 工伤待遇 · 借贷利息 · 即时联动</div>
        </div>
      </div>
      <div className="pg-body">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {TABS.map((t) => (
            <button key={t.key} className={`btn ${tab === t.key ? "primary" : "outline"}`} onClick={() => setTab(t.key)}>
              <svg className="ic"><use href={`#${t.icon}`} /></svg>{t.label}
            </button>
          ))}
        </div>
        {tab === "labor" && <LaborCalc />}
        {tab === "traffic" && <TrafficCalc />}
        {tab === "injury" && <InjuryCalc />}
        {tab === "loan" && <LoanCalc />}
      </div>
    </div>
  );
}
