import { useCallback, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { bridge } from "../bridge.js";
import { ErrorBanner, UploadButton, apiErr } from "./UploadButton.js";

interface Doc { id: string; filename: string; text_chars: number }
interface Note { id: string; title?: string; filename?: string; created_at?: string; content?: string; summary?: string }

export function DueDiligenceView() {
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [down, setDown] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");
  const [notes, setNotes] = useState<Note[]>([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [d, n] = await Promise.all([
      bridge.api<{ items: Doc[] }>({ path: "/api/documents" }),
      bridge.api<{ items: Note[] }>({ path: "/api/dossier/notes" }),
    ]);
    if (d.ok) setDocs(d.data.items); else setDown(true);
    if (n.ok) setNotes(n.data.items ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const run = async () => {
    if (picked.length === 0) return;
    setBusy(true); setError(""); setResult("");
    const path = picked.length === 1 ? "/api/dossier/read" : "/api/dossier/read-batch";
    const body = picked.length === 1
      ? { document_id: picked[0], ...(question.trim() ? { question: question.trim() } : {}) }
      : { document_ids: picked, ...(question.trim() ? { question: question.trim() } : {}) };
    const res = await bridge.api<{ note?: string; summary?: string; content?: string }>({ method: "POST", path, body });
    setBusy(false);
    if (res.ok) { setResult(res.data.note ?? res.data.summary ?? res.data.content ?? ""); load(); }
    else setError(apiErr(res, "阅卷失败"));
  };

  return (
    <div className="pg-root">
      <div className="pg-head">
        <div className="grow">
          <h1 className="pg-title">尽职调查（阅卷）</h1>
          <div className="pg-sub">选材料 · 定向问题 · AI 提炼主体 / 时间线 / 争点</div>
        </div>
      </div>
      <div className="pg-body">
        {down ? (
          <div className="empty"><div className="empty-t">工具后端未连接</div></div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "minmax(280px,4fr) minmax(320px,7fr)", gap: 14, flex: 1, minHeight: 0 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="card">
                <div className="set-sec" style={{ marginBottom: "8px" }}>材料选择（{picked.length} / {docs?.length ?? 0}）</div>
                {docs === null ? <div className="hint">加载…</div> : docs.length === 0 ? <div style={{ textAlign: "center", padding: "12px 0" }}><div className="hint" style={{ marginBottom: 8 }}>无阅卷材料</div><UploadButton onUploaded={load} onError={setError} label="上传阅卷材料" /></div> : docs.map((d) => (
                  <label key={d.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", fontSize: 13, borderBottom: "1px solid var(--border)", cursor: "pointer" }}>
                    <input type="checkbox" checked={picked.includes(d.id)} onChange={() => toggle(d.id)} />
                    <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.filename}</span>
                    <span className="hint">{d.text_chars.toLocaleString()}字</span>
                  </label>
                ))}
              </div>
              <div className="card">
                <div className="set-sec" style={{ marginBottom: "8px" }}>针对性问题（可选）</div>
                <textarea className="textarea" rows={4} value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="如：梳理时间线 / 双方争议焦点是什么" />
                <button className="btn primary" style={{ width: "100%", marginTop: 10 }} onClick={run} disabled={busy || picked.length === 0}>
                  {busy ? "阅卷中…" : `开始阅卷（${picked.length} 份材料）`}
                </button>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, minHeight: 0 }}>
              {error && <ErrorBanner message={error} onRetry={() => setError("")} />}
              {busy && <div className="card"><div className="diag-hint">AI 正在解析材料…</div></div>}
              {result && (
                <div className="card">
                  <div className="set-sec" style={{ marginBottom: "8px" }}>AI 阅卷结果</div>
                  <div className="bubble-md"><ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown></div>
                </div>
              )}
              <div className="card">
                <div className="set-sec" style={{ marginBottom: "8px" }}>历史笔记（{notes.length}）</div>
                {notes.length === 0 && <div className="hint">暂无历史笔记</div>}
                {notes.slice(0, 6).map((n) => (
                  <div key={n.id} style={{ padding: "7px 0", borderBottom: "1px solid var(--border)" }}>
                    <b style={{ fontSize: 12.5 }}>{n.title || n.filename || n.id.slice(0, 8)}</b>
                    <div className="hint">{(n.content || n.summary || "").slice(0, 120)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
