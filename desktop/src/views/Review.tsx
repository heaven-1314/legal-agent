import { useCallback, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { bridge } from "../bridge.js";
import { BackendDown, Loading, Page } from "./Matters.js";

interface Doc {
  id: string;
  filename: string;
  doc_kind: string;
  text_chars: number;
  created_at: string;
}
interface ReviewResult {
  filename: string;
  opinion_markdown: string;
}

export function ReviewView() {
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [down, setDown] = useState(false);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Doc | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async (query: string) => {
    const path = query
      ? `/api/documents/search?q=${encodeURIComponent(query)}&limit=20`
      : "/api/documents";
    const res = await bridge.api<{ items: Doc[] }>({ path });
    if (res.ok) {
      setDocs(res.data.items);
      setDown(false);
    } else {
      setDown(true);
    }
  }, []);

  useEffect(() => {
    load("");
  }, [load]);

  const run = async () => {
    if (!selected) return;
    setBusy(true);
    setError("");
    setResult(null);
    const res = await bridge.api<ReviewResult>({
      method: "POST",
      path: "/api/review/contract",
      body: { document_id: selected.id },
    });
    setBusy(false);
    if (res.ok) setResult(res.data);
    else setError((res.data as { detail?: string })?.detail ?? `审查失败（${res.status}）`);
  };

  if (down)
    return (
      <Page title="合同审查">
        <BackendDown />
      </Page>
    );

  return (
    <Page title="合同审查">
      <div className="doc-picker">
        <input
          className="doc-search"
          value={q}
          placeholder="搜索文档（文件名/内容）…"
          onChange={(e) => {
            setQ(e.target.value);
            load(e.target.value.trim());
          }}
        />
        <button className="btn primary" onClick={run} disabled={!selected || busy}>
          {busy ? "审查中，约 1-2 分钟…" : "发起审查"}
        </button>
      </div>

      {docs === null ? (
        <Loading />
      ) : docs.length === 0 ? (
        <div className="empty">
          <div className="empty-title">没有可审查的文档</div>
          <div className="empty-sub">先通过后端 API 上传合同文档，再回到这里发起审查</div>
        </div>
      ) : (
        <div className="rows">
          {docs.map((d) => (
            <button
              key={d.id}
              className={`row ${selected?.id === d.id ? "selected" : ""}`}
              onClick={() => setSelected(d)}
            >
              <span className="row-main">
                <span className="row-title">{d.filename}</span>
                <span className="row-sub">
                  {d.doc_kind || "文档"} · {d.text_chars.toLocaleString()} 字
                </span>
              </span>
              {selected?.id === d.id && <span className="badge ok">已选中</span>}
            </button>
          ))}
        </div>
      )}

      {busy && <div className="loading">模型正在逐项核对检查单，请勿关闭窗口…</div>}
      {error && <div className="error-card"><span>{error}</span></div>}
      {result && (
        <div className="card result-card">
          <h3>审查意见 · {result.filename}</h3>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.opinion_markdown}</ReactMarkdown>
        </div>
      )}
    </Page>
  );
}
