import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { bridge } from "../bridge.js";
import { BackendDown, Loading, Page } from "./Matters.js";

interface Template {
  id: string;
  name: string;
  instruction: string;
}

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
  const [draftTitle, setDraftTitle] = useState("");
  const [error, setError] = useState("");
  const [exported, setExported] = useState("");

  const exportDocx = async () => {
    if (!draftId) return;
    setExported("");
    const res = await bridge.exportDocx({
      docPath: `/api/drafts/${draftId}/download.docx`,
      defaultName: `文书-${draftTitle || draftId.slice(0, 8)}.docx`,
    });
    if (res.ok) setExported(`已导出：${res.path}`);
    else if (!res.canceled) setError(res.message ?? "导出失败");
  };

  useEffect(() => {
    bridge.api<{ items: Template[] }>({ path: "/api/draft/templates" }).then((r) => {
      if (r.ok) {
        setTemplates(r.data.items);
        if (r.data.items[0]) setTpl(r.data.items[0].id);
      } else {
        setDown(true);
      }
    });
  }, []);

  const run = async () => {
    if (!tpl || !facts.trim()) return;
    setBusy(true);
    setError("");
    setDraft("");
    const res = await bridge.api<{ draft_id: string; draft: string }>({
      method: "POST",
      path: "/api/draft",
      body: { template_id: tpl, title, facts: facts.trim(), extra },
    });
    setBusy(false);
    if (res.ok) {
      setDraft(res.data.draft);
      setDraftId(res.data.draft_id);
      setDraftTitle(title);
    } else {
      setError((res.data as { detail?: string })?.detail ?? `起草失败（${res.status}）`);
    }
  };

  if (down)
    return (
      <Page title="文书起草">
        <BackendDown />
      </Page>
    );

  return (
    <Page title="文书起草">
      <div className="card form-card">
        <div className="form-grid">
          <label className="field">
            <span className="field-label">模板</span>
            {templates === null ? (
              <Loading />
            ) : (
              <select value={tpl} onChange={(e) => setTpl(e.target.value)}>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}
          </label>
          <label className="field">
            <span className="field-label">标题</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="可留空" />
          </label>
        </div>
        <label className="field">
          <span className="field-label">案件事实与背景 *</span>
          <textarea
            className="facts-input"
            rows={5}
            value={facts}
            onChange={(e) => setFacts(e.target.value)}
            placeholder="当事人、时间线、诉求、已掌握的证据……写越全，文书越准"
          />
        </label>
        <label className="field">
          <span className="field-label">其他要求</span>
          <input value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="语气、侧重、格式要求（可留空）" />
        </label>
        <div className="settings-actions">
          <button className="btn primary" onClick={run} disabled={busy || !facts.trim()}>
            {busy ? "起草中…" : "生成文书"}
          </button>
        </div>
      </div>

      {busy && <div className="loading">模型正在按模板生成文书…</div>}
      {error && <div className="error-card"><span>{error}</span></div>}
      {draft && (
        <div className="card result-card">
          <h3>
            文稿
            <button className="btn sm export-btn" onClick={exportDocx}>导出 Word</button>
          </h3>
          {exported && <div className="export-done">{exported}</div>}
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{draft}</ReactMarkdown>
        </div>
      )}
    </Page>
  );
}
