import { useCallback, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { bridge } from "../bridge.js";

interface Doc { id: string; filename: string; doc_kind: string; text_chars: number }
interface ReviewResult { run_id: string; filename: string; opinion_markdown: string }

export function ContractView() {
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [down, setDown] = useState(false);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Doc | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [error, setError] = useState("");
  const [exported, setExported] = useState("");

  const load = useCallback(async (query: string) => {
    const path = query ? `/api/documents/search?q=${encodeURIComponent(query)}&limit=20` : "/api/documents";
    const res = await bridge.api<{ items: Doc[] }>({ path });
    if (res.ok) { setDocs(res.data.items); setDown(false); } else setDown(true);
  }, []);

  useEffect(() => { load(""); }, [load]);

  const upload = async () => {
    const res = await bridge.uploadDocument();
    if (res.ok) load(q.trim());
    else if (!res.canceled) setError(res.data?.message ?? "上传失败");
  };

  const run = async () => {
    if (!selected) return;
    setBusy(true); setError(""); setResult(null); setExported("");
    const res = await bridge.api<ReviewResult>({ method: "POST", path: "/api/review/contract", body: { document_id: selected.id } });
    setBusy(false);
    if (res.ok) setResult(res.data);
    else setError((res.data as { detail?: string })?.detail ?? `审查失败（${res.status}）`);
  };

  const exportDocx = async () => {
    if (!result) return;
    setExported("");
    const res = await bridge.exportDocx({ docPath: `/api/review/runs/${result.run_id}/download.docx`, defaultName: `审查意见-${result.filename}.docx` });
    if (res.ok) setExported(`已导出：${res.path}`);
    else if (!res.canceled) setError(res.message ?? "导出失败");
  };

  return (
    <div className="pg-root">
      <div className="pg-head">
        <div className="grow">
          <h1 className="pg-title">合同审查</h1>
          <div className="pg-sub">上传材料 · 按检查单逐项核对 · 风险分级 · 导出意见</div>
        </div>
      </div>
      <div className="pg-body">
        {down ? (
          <div className="empty">
            <div className="empty-t">工具后端未连接</div>
            <p className="empty-d">审查功能需要后端服务，请到「设置」检查。</p>
          </div>
        ) : (
          <>
            <div className="doc-picker">
              <input className="input" style={{ flex: 1 }} value={q} placeholder="搜索文档（文件名/内容）…" onChange={(e) => { setQ(e.target.value); load(e.target.value.trim()); }} />
              <button className="btn outline" onClick={upload}><svg className="ic"><use href="#i-doc" /></svg>上传文档</button>
              <button className="btn primary" onClick={run} disabled={!selected || busy}>{busy ? "审查中，约 1-2 分钟…" : "发起审查"}</button>
            </div>

            {docs === null ? (
              <div className="empty-d">加载文档…</div>
            ) : docs.length === 0 ? (
              <div className="empty">
                <div className="empty-t">没有可审查的文档</div>
                <p className="empty-d">点击「上传文档」选择本地合同文件</p>
              </div>
            ) : (
              <div className="rows">
                {docs.map((d) => (
                  <button key={d.id} className="row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", textAlign: "left", background: selected?.id === d.id ? "var(--accent-soft)" : "var(--surface)", border: `1px solid ${selected?.id === d.id ? "var(--accent-line)" : "var(--border)"}`, borderRadius: "var(--r-md)", padding: "9px 14px" }} onClick={() => setSelected(d)}>
                    <span>
                      <b style={{ fontSize: 13 }}>{d.filename}</b>
                      <div className="hint">{d.doc_kind || "文档"} · {d.text_chars.toLocaleString()} 字</div>
                    </span>
                    {selected?.id === d.id && <span className="badge b-low">已选中</span>}
                  </button>
                ))}
              </div>
            )}

            {busy && <div className="diag-hint">模型正在逐项核对检查单，请勿关闭窗口…</div>}
            {error && (
              <div className="banner-error show">
                <svg className="ic"><use href="#i-alert" /></svg>
                <span>{error}</span>
              </div>
            )}
            {result && (
              <div className="card">
                <div className="card-head">
                  <span className="card-title">审查意见 · {result.filename}</span>
                  <button className="btn outline sm" style={{ marginLeft: "auto" }} onClick={exportDocx}><svg className="ic"><use href="#i-doc" /></svg>导出 Word</button>
                </div>
                {exported && <div className="hint" style={{ color: "var(--risk-low)", marginBottom: 8 }}>{exported}</div>}
                <div className="bubble-md"><ReactMarkdown remarkPlugins={[remarkGfm]}>{result.opinion_markdown}</ReactMarkdown></div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
