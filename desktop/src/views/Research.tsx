import { useState } from "react";
import { bridge } from "../bridge.js";

interface Result { id: string; filename: string; snippet?: string; content?: string; doc_kind?: string }

export function ResearchView() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[] | null>(null);
  const [searched, setSearched] = useState(false);

  const search = async () => {
    if (!q.trim()) return;
    const res = await bridge.api<{ items: Result[] }>({ path: `/api/documents/search?q=${encodeURIComponent(q.trim())}&limit=20` });
    if (res.ok) { setResults(res.data.items ?? []); setSearched(true); }
  };

  const hl = (text: string) => {
    if (!q.trim()) return text;
    try {
      const terms = q.trim().split(/\s+/).filter(Boolean);
      const re = new RegExp(`(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "g");
      const parts = text.split(re);
      return parts.map((p, i) => (i % 2 === 1 ? <mark key={i} style={{ background: "var(--accent-soft)", color: "var(--accent-deep)", borderRadius: 2, padding: "0 2px" }}>{p}</mark> : p));
    } catch { return text; }
  };

  return (
    <div className="pg-root">
      <div className="pg-head">
        <div className="grow">
          <h1 className="pg-title">法律检索</h1>
          <div className="pg-sub">已上传材料的全文检索 · 关键词高亮</div>
        </div>
      </div>
      <div className="pg-body">
        <div className="doc-picker">
          <input
            className="input"
            style={{ flex: 1 }}
            value={q}
            placeholder="输入法律问题或关键词…（Enter 检索）"
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
          />
          <button className="btn primary" onClick={search}><svg className="ic"><use href="#i-search" /></svg>检索</button>
        </div>
        {results === null ? (
          <div className="empty">
            <svg className="ic" style={{ width: 36, height: 36, color: "var(--border-strong)" }}><use href="#i-search" /></svg>
            <div className="empty-t">输入关键词检索已上传的法律材料</div>
            <p className="empty-d">支持文件名与内容匹配，命中关键词自动高亮</p>
          </div>
        ) : results.length === 0 ? (
          <div className="empty">
            <div className="empty-t">未找到相关材料</div>
            <p className="empty-d">请先在「合同审查」页上传法条或案卷文档</p>
          </div>
        ) : (
          <div className="rows">
            {results.map((r) => (
              <div key={r.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: "10px 14px" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <b style={{ fontSize: 13 }}>{hl(r.filename || "未命名")}</b>
                  {r.doc_kind && <span className="badge">{r.doc_kind}</span>}
                </div>
                <div className="hint" style={{ marginTop: 4 }}>{hl((r.snippet || r.content || "").slice(0, 160))}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
