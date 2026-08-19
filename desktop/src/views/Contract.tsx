import { useCallback, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { bridge } from "../bridge.js";
import { ErrorBanner, UploadButton, apiErr } from "./UploadButton.js";

interface Doc { id: string; filename: string; doc_kind: string; text_chars: number; content?: string }
interface ReviewResult { run_id: string; filename: string; opinion_markdown: string }

export function ContractView() {
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [down, setDown] = useState(false);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Doc | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [error, setError] = useState("");
  const [uploaded, setUploaded] = useState("");
  const [exported, setExported] = useState("");
  const [preview, setPreview] = useState("");

  const load = useCallback(async (query: string) => {
    const path = query ? `/api/documents/search?q=${encodeURIComponent(query)}&limit=20` : "/api/documents";
    const res = await bridge.api<{ items: Doc[] }>({ path });
    if (res.ok) { setDocs(res.data.items); setDown(false); } else setDown(true);
  }, []);

  useEffect(() => { load(""); }, [load]);



  const loadPreview = async () => {
    if (preview) { setPreview(""); return; }
    if (!selected) return;
    const res = await bridge.api<{ content: string }>({ path: `/api/documents/${selected.id}/content` });
    if (res.ok && res.data.content) setPreview(res.data.content.slice(0, 5000));
    else setPreview("（无法读取该文档内容）");
  };

  const run = async () => {
    if (!selected) return;
    setBusy(true); setError(""); setResult(null); setExported("");
    const res = await bridge.api<ReviewResult>({ method: "POST", path: "/api/review/contract", body: { document_id: selected.id } });
    setBusy(false);
    if (res.ok) setResult(res.data);
    else setError(apiErr(res, "审查失败"));
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
              <UploadButton onUploaded={() => { setUploaded("上传成功"); load(q.trim()); }} onError={setError} />
              <button className="btn primary" onClick={run} disabled={!selected || busy}>{busy ? "审查中，约 1-2 分钟…" : "发起审查"}</button>
            </div>

            {docs === null ? (
              <div className="empty-d">加载文档…</div>
            ) : docs.length === 0 ? (
              <div className="empty">
                <svg className="ic" style={{ width: 36, height: 36, color: "var(--border-strong)" }}><use href="#i-contract" /></svg>
                <div className="empty-t">还没有可审查的文档</div>
                <p className="empty-d">上传你的第一份合同（txt / md / pdf / docx），AI 将按检查单逐项核对风险</p>
                <UploadButton onUploaded={() => load(q.trim())} onError={setError} label="上传第一份合同" />
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

            {selected && (
              <div className="card" style={{ marginTop: 12 }}>
                <div className="card-head">
                  <span className="card-title">📄 {selected.filename}</span>
                  <span className="hint">{selected.text_chars.toLocaleString()} 字</span>
                  <button className="btn outline sm" style={{ marginLeft: "auto" }} onClick={loadPreview}>
                    {preview ? "收起" : "查看内容"}
                  </button>
                </div>
                {preview && (
                  <div style={{ maxHeight: 300, overflowY: "auto", background: "var(--surface-2)", borderRadius: "var(--r-md)", padding: 14, fontSize: 13, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
                    {preview}
                  </div>
                )}
              </div>
            )}

            {busy && <div className="diag-hint">模型正在逐项核对检查单，请勿关闭窗口…</div>}
            {error && <ErrorBanner message={error} onRetry={() => setError("")} />}
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
