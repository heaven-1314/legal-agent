import { useState } from "react";
import { bridge } from "../bridge.js";
import { BackendDown, Page } from "./Matters.js";

interface Result {
  id: string;
  filename: string;
  snippet?: string;
  content?: string;
}

export function ResearchView() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[] | null>(null);
  const [down, setDown] = useState(false);

  const search = async () => {
    if (!q.trim()) return;
    const res = await bridge.api<{ items: Result[] }>({
      path: `/api/documents/search?q=${encodeURIComponent(q.trim())}&limit=20`,
    });
    if (res.ok) setResults(res.data.items ?? []);
    else setDown(true);
  };

  return (
    <Page title="法律检索">
      {down ? <BackendDown /> : (
        <>
          <div className="doc-picker">
            <input
              className="doc-search"
              value={q}
              placeholder="输入法律问题或关键词…"
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
            />
            <button className="btn primary" onClick={search}>检索</button>
          </div>
          {results === null ? (
            <div className="loading" style={{ textAlign: "center", padding: "40px 0" }}>
              输入关键词检索已上传的法律材料
            </div>
          ) : results.length === 0 ? (
            <div className="loading" style={{ textAlign: "center", padding: "40px 0" }}>
              未找到相关材料。请先在「审查」页或后端上传文档。
            </div>
          ) : (
            <div className="rows">
              {results.map((r) => (
                <div key={r.id} className="row" style={{ cursor: "default" }}>
                  <span className="row-main">
                    <span className="row-title">{r.filename || "未命名"}</span>
                    <span className="row-sub">{(r.snippet || r.content || "").slice(0, 160)}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Page>
  );
}
