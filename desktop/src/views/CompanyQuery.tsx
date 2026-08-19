import { useState } from "react";
import { bridge } from "../bridge.js";
import { ErrorBanner } from "./UploadButton.js";

interface CompanyInfo {
  [key: string]: string;
}

const DISPLAY_FIELDS = [
  "公司名称", "法定代表人", "注册资本", "成立日期", "经营状态",
  "统一社会信用代码", "公司类型", "注册地址", "经营范围", "企业规模", "联系电话", "所在城市",
];

export function CompanyQueryView() {
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<CompanyInfo[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(0);

  const search = async () => {
    if (!keyword.trim()) return;
    setBusy(true); setError(""); setResults(null);
    const res = await bridge.api<{ items: CompanyInfo[] }>({
      method: "POST", path: "/api/company/query", body: { keyword: keyword.trim() },
    });
    setBusy(false);
    if (res.ok && res.data.items.length > 0) {
      setResults(res.data.items); setSelected(0);
    } else if (res.ok) {
      setError("未找到匹配的企业");
    } else {
      setError((res.data as { detail?: string })?.detail ?? `查询失败（${res.status}）`);
    }
  };

  const current = results?.[selected];

  return (
    <div className="pg-root">
      <div className="pg-head">
        <div className="grow">
          <h1 className="pg-title">企业查询</h1>
          <div className="pg-sub">工商信息 · 天眼查数据 · 对方主体核验</div>
        </div>
      </div>
      <div className="pg-body">
        <div className="doc-picker">
          <input
            className="input" style={{ flex: 1, minWidth: 200 }}
            value={keyword}
            placeholder="输入企业名称或统一社会信用代码…"
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
          />
          <button className="btn primary" onClick={search} disabled={busy || !keyword.trim()}>
            {busy ? "查询中…" : "查询"}
          </button>
        </div>

        {error && <ErrorBanner message={error} onRetry={search} />}

        {results === null && !busy && (
          <div className="empty">
            <svg className="ic" style={{ width: 36, height: 36, color: "var(--border-strong)" }}><use href="#i-search" /></svg>
            <div className="empty-t">企业工商信息查询</div>
            <p className="empty-d">输入对方公司名称，核实主体资格、法定代表人、注册资本等</p>
          </div>
        )}

        {results && results.length > 0 && (
          <div className="calc-grid" style={{ gridTemplateColumns: "minmax(240px,1fr) minmax(320px,2fr)" }}>
            <div className="card" style={{ alignSelf: "start" }}>
              <div className="set-sec" style={{ marginBottom: 8 }}>搜索结果（{results.length}）</div>
              {results.map((r, i) => (
                <button
                  key={i}
                  className={`btn ${i === selected ? "primary" : "outline"}`}
                  style={{ width: "100%", justifyContent: "flex-start", marginBottom: 4, textAlign: "left", fontSize: 12 }}
                  onClick={() => setSelected(i)}
                >
                  {r["公司名称"]}
                </button>
              ))}
            </div>
            {current && (
              <div className="card">
                <div className="set-sec" style={{ marginBottom: 12 }}>{current["公司名称"]}</div>
                <div className="kv">
                  {DISPLAY_FIELDS.filter(f => current[f]).map(f => (
                    <div key={f} className="cell">
                      <div className="k">{f}</div>
                      <div className="v">{f === "经营范围" ? current[f].slice(0, 120) + "…" : current[f]}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
