import { useCallback, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { bridge } from "../bridge.js";
import { BackendDown, Loading, Page } from "./Matters.js";

interface Doc { id: string; filename: string }
interface Note { id: string; title?: string; filename?: string; created_at?: string; content?: string; summary?: string }

/** 尽职调查（阅卷）：选文档 → AI 提炼主体/时间线/争点；笔记列表。 */
export function DueDiligenceView() {
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [down, setDown] = useState(false);
  const [selected, setSelected] = useState("");
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
    if (d.ok) setDocs(d.data.items);
    else setDown(true);
    if (n.ok) setNotes(n.data.items ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const run = async () => {
    if (!selected) return;
    setBusy(true);
    setError("");
    setResult("");
    const res = await bridge.api<{ note?: string; summary?: string; content?: string }>({
      method: "POST",
      path: "/api/dossier/read",
      body: question.trim() ? { document_id: selected, question: question.trim() } : { document_id: selected },
    });
    setBusy(false);
    if (res.ok) {
      setResult(res.data.note ?? res.data.summary ?? res.data.content ?? "");
      load();
    } else {
      setError((res.data as { detail?: string })?.detail ?? `阅卷失败（${res.status}）`);
    }
  };

  if (down) return <Page title="尽职调查"><BackendDown /></Page>;

  return (
    <Page title="尽职调查">
      <div className="doc-picker">
        <select className="doc-search" value={selected} onChange={(e) => setSelected(e.target.value)}>
          <option value="">选择已上传材料…</option>
          {docs?.map((d) => <option key={d.id} value={d.id}>{d.filename}</option>)}
        </select>
        <button className="btn primary" onClick={run} disabled={!selected || busy}>
          {busy ? "阅卷中…" : "开始阅卷"}
        </button>
      </div>
      <label className="field" style={{ maxWidth: "64ch" }}>
        <span className="field-label">针对性问题（可选，不填则整体提炼）</span>
        <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="如：梳理时间线 / 双方争议焦点是什么" />
      </label>

      {busy && <Loading />}
      {error && <div className="error-card"><span>{error}</span></div>}
      {result && (
        <div className="card result-card">
          <h3>阅卷结果</h3>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
        </div>
      )}

      <div className="card" style={{ marginTop: 16 }}>
        <h3>阅卷笔记（{notes.length}）</h3>
        {notes.length === 0 && <div className="empty-sub">暂无历史笔记</div>}
        <div className="rows">
          {notes.map((n) => (
            <div key={n.id} className="row" style={{ cursor: "default" }}>
              <span className="row-main">
                <span className="row-title">{n.title || n.filename || n.id.slice(0, 8)}</span>
                <span className="row-sub">{(n.content || n.summary || "").slice(0, 120)}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </Page>
  );
}
