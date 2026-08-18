import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { bridge } from "../bridge.js";

interface Template { id: string; name: string; instruction: string }

export function DraftsView() {
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [down, setDown] = useState(false);
  const [tpl, setTpl] = useState("");
  const [title, setTitle] = useState("");
  const [facts, setFacts] = useState("");
  const [extra, setExtra] = useState("");
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState("");
  const [draftId, setDraftId] = useState("");
  const [error, setError] = useState("");
  const [exported, setExported] = useState("");

  useEffect(() => {
    bridge.api<{ items: Template[] }>({ path: "/api/draft/templates" }).then((r) => {
      if (r.ok) { setTemplates(r.data.items); if (r.data.items[0]) setTpl(r.data.items[0].id); }
      else setDown(true);
    });
  }, []);

  const run = async () => {
    if (!tpl || !facts.trim()) return;
    setBusy(true); setError(""); setDraft(""); setExported("");
    const res = await bridge.api<{ draft_id: string; draft: string }>({ method: "POST", path: "/api/draft", body: { template_id: tpl, title, facts: facts.trim(), extra } });
    setBusy(false);
    if (res.ok) { setDraft(res.data.draft); setDraftId(res.data.draft_id); }
    else setError((res.data as { detail?: string })?.detail ?? `起草失败（${res.status}）`);
  };

  const exportDocx = async () => {
    if (!draftId) return;
    setExported("");
    const res = await bridge.exportDocx({ docPath: `/api/drafts/${draftId}/download.docx`, defaultName: `文书-${title || draftId.slice(0, 8)}.docx` });
    if (res.ok) setExported(`已导出：${res.path}`);
    else if (!res.canceled) setError(res.message ?? "导出失败");
  };

  return (
    <div className="pg-root">
      <div className="pg-head">
        <div className="grow">
          <h1 className="pg-title">文书生成</h1>
          <div className="pg-sub">选择模板 · 输入案件事实 · 生成 · 导出 Word</div>
        </div>
      </div>
      <div className="pg-body">
        {down ? (
          <div className="empty"><div className="empty-t">工具后端未连接</div></div>
        ) : (
          <div className="calc-grid">
            <div className="card">
              <div className="gw-row">
                <div className="field"><div className="lab">模板</div>
                  {templates === null ? <div className="hint">加载模板…</div> : (
                    <select className="select" value={tpl} onChange={(e) => setTpl(e.target.value)}>
                      {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  )}
                </div>
                <div className="field"><div className="lab">标题</div>
                  <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="可留空" />
                </div>
              </div>
              <div className="field"><div className="lab">案件事实与背景 *</div>
                <textarea className="textarea" rows={6} value={facts} onChange={(e) => setFacts(e.target.value)} placeholder="当事人、时间线、诉求、已掌握的证据……写越全，文书越准" />
              </div>
              <div className="field"><div className="lab">其他要求</div>
                <input className="input" value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="语气、侧重、格式（可留空）" />
              </div>
              <div className="form-actions">
                <button className="btn primary" onClick={run} disabled={busy || !facts.trim()}>{busy ? "起草中…" : "生成文书"}</button>
              </div>
            </div>
            <div>
              {busy && <div className="card"><div className="diag-hint">模型正在按模板生成文书…</div></div>}
              {error && <div className="banner-error show"><svg className="ic"><use href="#i-alert" /></svg><span>{error}</span></div>}
              {draft && (
                <div className="card">
                  <div className="card-head">
                    <span className="card-title">文稿</span>
                    <button className="btn outline sm" style={{ marginLeft: "auto" }} onClick={exportDocx}><svg className="ic"><use href="#i-doc" /></svg>导出 Word</button>
                  </div>
                  {exported && <div className="hint" style={{ color: "var(--risk-low)", marginBottom: 8 }}>{exported}</div>}
                  <div className="bubble-md"><ReactMarkdown remarkPlugins={[remarkGfm]}>{draft}</ReactMarkdown></div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
