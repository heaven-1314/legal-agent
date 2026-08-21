import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { bridge } from "../bridge.js";
import { ErrorBanner, UploadButton, apiErr } from "./UploadButton.js";
import { ContractDocViewer } from "./contract/ContractDocViewer.js";
import { ContractReviewPane, type ReviewData, type RiskItem } from "./contract/ContractReviewPane.js";

interface Doc {
  id: string;
  filename: string;
  doc_kind: string;
  text_chars: number;
  content?: string;
}

interface ReviewResult {
  run_id: string;
  document_id: string;
  filename: string;
  review?: ReviewData;
  opinion_markdown: string;
  download_docx?: string;
}

interface ChecklistMeta {
  id: string;
  name: string;
}

export function ContractView() {
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [down, setDown] = useState(false);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Doc | null>(null);
  const [checklists, setChecklists] = useState<ChecklistMeta[]>([]);
  const [selectedChecklist, setSelectedChecklist] = useState<string>("default-contract");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [error, setError] = useState("");
  const [uploaded, setUploaded] = useState("");
  const [exported, setExported] = useState("");
  const [docContent, setDocContent] = useState<string>("");
  const [focusedQuote, setFocusedQuote] = useState<string>("");
  const [adoptedIndices, setAdoptedIndices] = useState<Set<number>>(new Set());

  const docViewerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (query: string) => {
    const path = query
      ? `/api/documents/search?q=${encodeURIComponent(query)}&limit=30`
      : "/api/documents";
    const res = await bridge.api<{ items: Doc[] }>({ path });
    if (res.ok) {
      setDocs(res.data.items || []);
      setDown(false);
    } else {
      setDown(true);
    }
  }, []);

  const loadChecklists = useCallback(async () => {
    const res = await bridge.api<{ items: ChecklistMeta[] }>({ path: "/api/review/checklists" });
    if (res.ok && res.data.items) {
      setChecklists(res.data.items);
    }
  }, []);

  useEffect(() => {
    load("");
    loadChecklists();
  }, [load, loadChecklists]);

  const handleSelectDoc = async (doc: Doc) => {
    setSelected(doc);
    setError("");
    setResult(null);
    setExported("");
    setAdoptedIndices(new Set());
    const res = await bridge.api<{ content: string }>({ path: `/api/documents/${doc.id}/content` });
    if (res.ok && res.data.content) {
      setDocContent(res.data.content);
    } else {
      setDocContent("（未能提取到文档正文文本）");
    }
  };

  const run = async () => {
    if (!selected) return;
    setBusy(true);
    setError("");
    setResult(null);
    setExported("");
    setAdoptedIndices(new Set());

    const res = await bridge.api<ReviewResult>({
      method: "POST",
      path: "/api/review/contract",
      body: {
        document_id: selected.id,
        checklist_id: selectedChecklist,
      },
    });

    setBusy(false);
    if (res.ok) {
      setResult(res.data);
      if (!res.data.review && res.data.opinion_markdown) {
        setResult({
          ...res.data,
          review: {
            summary: "审查已完成，请在右侧查看详细意见。",
            risks: [],
            missing_clauses: [],
            disclaimer: "本结果由 AI 生成，仅供内部讨论参考。",
          },
        });
      }
    } else {
      setError(apiErr(res, "审查失败，请检查网络或 AI 接口配置"));
    }
  };

  const exportDocx = async () => {
    if (!result) return;
    setExported("");
    const res = await bridge.exportDocx({
      docPath: `/api/review/runs/${result.run_id}/download.docx`,
      defaultName: `审查意见-${result.filename}.docx`,
    });
    if (res.ok) {
      setExported(`已成功导出审查意见书：${res.path || result.filename}`);
    } else if (!res.canceled) {
      setError(res.message ?? "导出失败");
    }
  };

  const adoptSuggestion = (originalQuote: string, suggestion: string, index: number) => {
    if (!originalQuote || !docContent.includes(originalQuote)) {
      setError(`未在正文中完全匹配到原文：${originalQuote.slice(0, 30)}...`);
      return;
    }
    const updated = docContent.replace(originalQuote, suggestion);
    setDocContent(updated);
    setAdoptedIndices((prev) => new Set(prev).add(index));
    setFocusedQuote(suggestion);
  };

  const scrollToQuote = (quote: string) => {
    if (!quote) return;
    setFocusedQuote(quote);
    const viewer = docViewerRef.current;
    if (!viewer) return;

    const blocks = viewer.querySelectorAll(".doc-clause-block");
    for (const el of Array.from(blocks)) {
      if (el.textContent?.includes(quote.trim().slice(0, 30))) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.remove("flash-focus");
        void (el as HTMLElement).offsetWidth;
        el.classList.add("flash-focus");
        break;
      }
    }
  };

  const paragraphs = useMemo(() => {
    if (!docContent) return [];
    return docContent.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  }, [docContent]);

  return (
    <div className="pg-root">
      <div className="pg-head">
        <div className="grow">
          <h1 className="pg-title">合同智能审查工作台</h1>
          <div className="pg-sub">
            条款智能解析 · 深度风险归因 · 红绿 Diff 修订建议 · 原文穿透与一键采纳导出
          </div>
        </div>
        {result && (
          <div className="row" style={{ gap: 8 }}>
            <button className="btn outline sm" onClick={exportDocx}>
              <svg className="ic"><use href="#i-doc" /></svg>
              导出 Word 意见书
            </button>
          </div>
        )}
      </div>

      <div className="pg-body" style={{ paddingBottom: 16 }}>
        {down ? (
          <div className="card" style={{ textAlign: "center", padding: "48px 24px" }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: "var(--risk-high)" }}>工具后端未连接</div>
            <p className="muted" style={{ marginTop: 8 }}>审查功能依赖本地或远程 FastAPI 接口，请前往「设置」确认连接。</p>
          </div>
        ) : (
          <div className="contract-workspace">
            <div className="contract-toolbar">
              <div style={{ minWidth: 240, flex: "1 1 280px" }}>
                <input
                  className="input"
                  value={q}
                  placeholder="搜索合同材料（文件名/条款）…"
                  onChange={(e) => {
                    setQ(e.target.value);
                    load(e.target.value.trim());
                  }}
                />
              </div>

              <div style={{ width: 180, flexShrink: 0 }}>
                <select
                  className="select"
                  value={selectedChecklist}
                  onChange={(e) => setSelectedChecklist(e.target.value)}
                >
                  <option value="default-contract">通用商业合同审查</option>
                  {checklists.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <UploadButton
                onUploaded={() => {
                  setUploaded("上传成功");
                  load(q.trim());
                }}
                onError={setError}
                label="上传合同"
              />

              <button
                className="btn primary"
                onClick={run}
                disabled={!selected || busy}
                style={{ minWidth: 120 }}
              >
                {busy ? (
                  <>
                    <span className="spin" style={{ display: "inline-block", marginRight: 6 }} />
                    AI 深度审查中…
                  </>
                ) : (
                  <>
                    <svg className="ic"><use href="#i-contract" /></svg>
                    发起智能审查
                  </>
                )}
              </button>
            </div>

            {uploaded && <div className="badge b-low" style={{ alignSelf: "flex-start" }}>{uploaded}</div>}
            {exported && <div className="badge b-low" style={{ alignSelf: "flex-start" }}>{exported}</div>}
            {error && <ErrorBanner message={error} onRetry={() => setError("")} />}

            {docs && docs.length > 0 && !selected && (
              <div className="card">
                <div className="card-head">
                  <span className="card-title">📚 待审查文档库 ({docs.length})</span>
                  <span className="hint">点击一份文档进入双栏沉浸式审查</span>
                </div>
                <div className="rows" style={{ maxHeight: 320, overflowY: "auto" }}>
                  {docs.map((d) => (
                    <button
                      key={d.id}
                      className="row"
                      style={{
                        padding: "10px 14px",
                        borderRadius: "var(--r-md)",
                        border: "1px solid var(--border)",
                        background: "var(--surface)",
                        textAlign: "left",
                        cursor: "pointer",
                      }}
                      onClick={() => handleSelectDoc(d)}
                    >
                      <svg className="ic" style={{ color: "var(--accent)" }}><use href="#i-contract" /></svg>
                      <div className="grow" style={{ marginLeft: 8 }}>
                        <b style={{ fontSize: 13.5, color: "var(--fg-strong)" }}>{d.filename}</b>
                        <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>
                          {d.doc_kind || "合同"} · {d.text_chars.toLocaleString()} 字符
                        </div>
                      </div>
                      <span className="btn outline sm">载入工作台</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selected && (
              <div className="contract-split">
                <ContractDocViewer
                  filename={selected.filename}
                  docContent={docContent}
                  paragraphs={paragraphs}
                  risks={result?.review?.risks || []}
                  focusedQuote={focusedQuote}
                  viewerRef={docViewerRef}
                  onClose={() => setSelected(null)}
                />

                <ContractReviewPane
                  result={result?.review || null}
                  busy={busy}
                  onRun={run}
                  onScrollToQuote={scrollToQuote}
                  onAdoptSuggestion={adoptSuggestion}
                  adoptedIndices={adoptedIndices}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
