import { useMemo, useState } from "react";

const RULES: Record<string, { name: string; re: RegExp; desc: string }> = {
  phone: { name: "手机号", re: /1[3-9]\d\s?\d{4}(?=\d)/g, desc: "保留前 3 位与后 4 位" },
  id: { name: "身份证号", re: /\d{6}(?=\d{8}[\dXx])\d{8}[\dXx]/g, desc: "保留前 6 位与后 4 位" },
  bank: { name: "银行卡号", re: /\b\d{16,19}\b/g, desc: "仅保留后 4 位" },
};

const SAMPLE = "申请人：张某，女，身份证号 320102199004153628，联系电话 13812775623。在职期间，被申请人每月通过尾号 6222023012345678 的银行账户发放工资。其同事李某（电话 13915583421）可证明长期加班事实。承办律师：王某，律所座机 0512-66881234。";

function mask(text: string, on: Record<string, boolean>) {
  let out = text;
  const counts: Record<string, number> = { phone: 0, id: 0, bank: 0 };
  for (const [k, r] of Object.entries(RULES)) {
    if (!on[k]) continue;
    out = out.replace(r.re, (m) => {
      counts[k]++;
      const s = m.replace(/\s/g, "");
      if (k === "phone") return s.slice(0, 3) + "****" + s.slice(-4);
      if (k === "id") return s.slice(0, 6) + "********" + s.slice(-4);
      return "**** **** **** " + s.slice(-4);
    });
  }
  return { out, counts };
}

export function AnonymizeView() {
  const [input, setInput] = useState(SAMPLE);
  const [on, setOn] = useState<Record<string, boolean>>({ phone: true, id: true, bank: true });
  const [copied, setCopied] = useState(false);

  const { out, counts } = useMemo(() => mask(input, on), [input, on]);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="pg-root">
      <div className="pg-head">
        <div className="grow">
          <h1 className="pg-title">脱敏工具</h1>
          <div className="pg-sub">手机号 · 身份证 · 银行卡 · 全程本地处理</div>
        </div>
      </div>
      <div className="pg-body">
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {Object.entries(RULES).map(([k, r]) => (
            <button key={k} className={`btn ${on[k] ? "primary" : "outline"}`} onClick={() => setOn({ ...on, [k]: !on[k] })}>
              {r.name} {on[k] && <span className="badge" style={{ marginLeft: 4 }}>{counts[k]} 处</span>}
            </button>
          ))}
          <div className="badge b-low" style={{ alignSelf: "center" }}>共 {total} 处 · 本地处理，不上传</div>
        </div>
        <div className="calc-grid">
          <div className="card" style={{ display: "flex", flexDirection: "column", minHeight: 280 }}>
            <div className="card-head">
              <span className="card-title">原文粘贴</span>
              <span className="hint">{input.length} 字</span>
              <button className="btn ghost sm" style={{ marginLeft: "auto" }} onClick={() => setInput("")}>清空</button>
            </div>
            <textarea className="textarea" style={{ flex: 1, resize: "none" }} rows={10} value={input} onChange={(e) => setInput(e.target.value)} />
            <button className="btn ghost sm" style={{ alignSelf: "flex-start", marginTop: 8 }} onClick={() => setInput(SAMPLE)}>恢复示例原文</button>
          </div>
          <div className="card" style={{ display: "flex", flexDirection: "column", minHeight: 280 }}>
            <div className="card-head">
              <span className="card-title">脱敏结果</span>
              <button className="btn primary sm" style={{ marginLeft: "auto" }} onClick={() => { navigator.clipboard.writeText(out); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
                {copied ? "已复制" : "复制脱敏文本"}
              </button>
            </div>
            <div style={{ flex: 1, whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.8, color: "var(--fg)", overflowY: "auto", background: "var(--surface-2)", borderRadius: "var(--r-md)", padding: 12 }}>
              {out || "（原文为空）"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
