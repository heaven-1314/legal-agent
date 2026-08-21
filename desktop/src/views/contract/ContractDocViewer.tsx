import React from "react";

interface RiskItem {
  severity: "high" | "medium" | "low" | "info";
  quote: string;
}

interface ContractDocViewerProps {
  filename: string;
  docContent: string;
  paragraphs: string[];
  risks: RiskItem[];
  focusedQuote: string;
  viewerRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
}

export function ContractDocViewer({
  filename,
  docContent,
  paragraphs,
  risks,
  focusedQuote,
  viewerRef,
  onClose,
}: ContractDocViewerProps) {
  return (
    <div className="contract-doc-pane">
      <div className="doc-pane-head">
        <div className="row" style={{ gap: 8 }}>
          <svg className="ic" style={{ color: "var(--accent)" }}>
            <use href="#i-doc" />
          </svg>
          <b style={{ fontSize: 13, color: "var(--fg-strong)" }}>{filename}</b>
          <span className="badge b-neutral">{docContent.length.toLocaleString()} 字</span>
        </div>
        <button className="btn outline sm" onClick={onClose}>
          切换文件
        </button>
      </div>

      <div className="doc-viewer" ref={viewerRef as any}>
        {paragraphs.length === 0 ? (
          <div className="muted" style={{ textAlign: "center", padding: "60px 0" }}>
            正在解析文档内容…
          </div>
        ) : (
          paragraphs.map((p, idx) => {
            const matchedRisk = risks.find(
              (r) => r.quote && p.includes(r.quote.trim().slice(0, 25))
            );
            let riskClass = "";
            if (matchedRisk) {
              riskClass =
                matchedRisk.severity === "high"
                  ? "has-risk-high"
                  : matchedRisk.severity === "medium"
                  ? "has-risk-mid"
                  : "";
            }

            return (
              <div
                key={idx}
                className={`doc-clause-block ${riskClass} ${
                  focusedQuote && p.includes(focusedQuote.slice(0, 25)) ? "flash-focus" : ""
                }`}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span className="muted" style={{ fontSize: 11, fontFamily: "var(--font-mono)" }}>
                    § {(idx + 1).toString().padStart(2, "0")}
                  </span>
                  {matchedRisk && (
                    <span
                      className={`badge ${
                        matchedRisk.severity === "high" ? "b-high" : "b-mid"
                      }`}
                      style={{ height: 18, fontSize: 10.5 }}
                    >
                      {matchedRisk.severity === "high" ? "🔴 高风险条款" : "🟡 建议修改"}
                    </span>
                  )}
                </div>
                <div style={{ whiteSpace: "pre-wrap" }}>{p}</div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
