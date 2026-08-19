import { useState } from "react";
import { bridge } from "../bridge.js";
import { UploadButton } from "./UploadButton.js";

type Tab = "docs" | "laws" | "cases";

interface DocResult { id: string; filename: string; snippet?: string; content?: string; doc_kind?: string }
interface LawResult { law: string; article: string; title: string; text: string; category: string }
interface CaseResult { id: string; title: string; summary: string; created_at: string; type?: string; ruling?: string; law_ref?: string }

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: "docs", label: "文档", icon: "i-doc" },
  { key: "laws", label: "法条", icon: "i-book" },
  { key: "cases", label: "案例", icon: "i-folder" },
];

export function ResearchView() {
  const [tab, setTab] = useState<Tab>("docs");
  const [q, setQ] = useState("");
  const [docResults, setDocResults] = useState<DocResult[] | null>(null);
  const [lawResults, setLawResults] = useState<LawResult[]>([]);
  const [caseResults, setCaseResults] = useState<CaseResult[]>([]);
  const [busy, setBusy] = useState(false);

  const search = async () => {
    if (!q.trim()) return;
    setBusy(true);
    if (tab === "docs") {
      const res = await bridge.api<{ items: DocResult[] }>({ path: `/api/documents/search?q=${encodeURIComponent(q.trim())}&limit=20` });
      if (res.ok) setDocResults(res.data.items ?? []);
    } else if (tab === "laws") {
      const res = await bridge.api<{ items: LawResult[] }>({ path: `/api/laws?q=${encodeURIComponent(q.trim())}` });
      if (res.ok) setLawResults(res.data.items ?? []);
    }
    setBusy(false);
  };

  const searchLaws = async (category?: string) => {
    setBusy(true);
    const path = category ? `/api/laws?category=${category}` : `/api/laws`;
    const res = await bridge.api<{ items: LawResult[] }>({ path });
    if (res.ok) setLawResults(res.data.items ?? []);
    setBusy(false);
  };

  const loadCases = async () => {
    const res = await bridge.api<{ items: { title: string; type: string; summary: string; ruling: string; law_ref: string; source: string }[] }>({ path: "/api/laws/cases" });
    if (res.ok) {
      setCaseResults((res.data.items ?? []).map((c: any, i: number) => ({
        id: String(i), title: c.title, summary: c.summary, created_at: c.source || "",
        type: c.type, ruling: c.ruling, law_ref: c.law_ref,
      })));
    }
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
          <div className="pg-sub">文档 · 法条 · 案例三合一检索</div>
        </div>
      </div>
      <div className="pg-body">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {TABS.map((t) => (
            <button key={t.key} className={`btn ${tab === t.key ? "primary" : "outline"}`} onClick={() => {
              setTab(t.key);
              if (t.key === "laws") searchLaws();
              if (t.key === "cases") loadCases();
            }}>
              <svg className="ic"><use href={`#${t.icon}`} /></svg>{t.label}
            </button>
          ))}
        </div>

        {tab !== "cases" && (
          <div className="doc-picker">
            <input className="input" style={{ flex: 1 }} value={q}
              placeholder={tab === "docs" ? "搜索已上传材料…" : "搜索法条名、条号或关键词…"}
              onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} />
            <button className="btn primary" onClick={search} disabled={busy || !q.trim()}>
              <svg className="ic"><use href="#i-search" /></svg>检索
            </button>
          </div>
        )}

        {tab === "docs" && (
          <>
            {docResults === null ? (
              <div className="empty">
                <svg className="ic" style={{ width: 36, height: 36, color: "var(--border-strong)" }}><use href="#i-search" /></svg>
                <div className="empty-t">检索已上传的法律材料</div>
                <p className="empty-d">支持文件名与内容匹配，命中关键词自动高亮</p>
                <UploadButton onUploaded={() => setDocResults(null)} label="上传材料" />
              </div>
            ) : docResults.length === 0 ? (
              <div className="empty"><div className="empty-t">未找到相关材料</div></div>
            ) : (
              <div className="rows">
                {docResults.map((r) => (
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
          </>
        )}

        {tab === "laws" && (
          <>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[["", "全部"], ["labor_contract", "劳动法"], ["civil", "民法典"], ["criminal", "刑法"], ["administrative", "行政法"], ["procedure", "诉讼法"], ["company", "公司法"]].map(([id, label]) => (
              <button key={id} className="btn outline sm" onClick={() => searchLaws(id || undefined)}>{label}</button>
            ))}
          </div>
          <div className="rows">
            {lawResults.length === 0 ? (
              <div className="empty"><div className="empty-t">输入关键词或点击分类浏览法条</div></div>
            ) : lawResults.map((law, i) => (
              <div key={i} className="card" style={{ marginBottom: 0 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                  <span className="badge b-low">{law.law}</span>
                  <b style={{ fontSize: 13.5 }}>{law.article} · {law.title}</b>
                </div>
                <div style={{ borderLeft: "2px solid var(--accent-line)", paddingLeft: 12, fontSize: 13, lineHeight: 1.7 }}>{hl(law.text)}</div>
              </div>
            ))}
          </div>
          </>
        )}

        {tab === "cases" && (
          <div className="rows">
            {caseResults.length === 0 ? (
              <div className="empty">
                <div className="empty-t">暂无本地案例</div>
                <p className="empty-d">这里显示你创建的仲裁案件。公开案例检索将在后续版本接入。</p>
              </div>
            ) : caseResults.map((c) => (
              <div key={c.id} className="card" style={{ marginBottom: 0 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                  {c.type && <span className="badge b-accent">{c.type}</span>}
                  <b style={{ fontSize: 13.5, color: "var(--fg-strong)" }}>{c.title}</b>
                </div>
                <div style={{ fontSize: 12.5, lineHeight: 1.7, color: "var(--fg)" }}>{c.summary}</div>
                {c.ruling && (
                  <div style={{ marginTop: 6, padding: "6px 10px", background: "var(--accent-soft)", borderRadius: "var(--r-sm)", fontSize: 12, color: "var(--accent-deep)" }}>
                    ⚖️ {c.ruling}
                  </div>
                )}
                {c.law_ref && <div className="hint" style={{ marginTop: 4 }}>法条依据：{c.law_ref}</div>}
                {c.created_at && <div className="hint" style={{ marginTop: 2 }}>来源：{c.created_at}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
