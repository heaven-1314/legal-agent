import React, { useState } from "react";

export interface RiskItem {
  checklist_id: string;
  title: string;
  severity: "high" | "medium" | "low" | "info";
  finding: string;
  quote: string;
  suggestion: string;
}

export interface ReviewData {
  summary: string;
  risks: RiskItem[];
  missing_clauses: string[];
  disclaimer: string;
}

interface ContractReviewPaneProps {
  result: ReviewData | null;
  busy: boolean;
  onRun: () => void;
  onScrollToQuote: (quote: string) => void;
  onAdoptSuggestion: (quote: string, suggestion: string, index: number) => void;
  adoptedIndices: Set<number>;
}

export function ContractReviewPane({
  result,
  busy,
  onRun,
  onScrollToQuote,
  onAdoptSuggestion,
  adoptedIndices,
}: ContractReviewPaneProps) {
  const [activeTab, setActiveTab] = useState<"all" | "high" | "medium" | "low" | "missing">("all");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const risks = result?.risks || [];
  const missingClauses = result?.missing_clauses || [];

  const highCount = risks.filter((r) => r.severity === "high").length;
  const medCount = risks.filter((r) => r.severity === "medium").length;
  const lowCount = risks.filter((r) => r.severity === "low" || r.severity === "info").length;

  const filteredRisks = risks.filter((r) => {
    if (activeTab === "high") return r.severity === "high";
    if (activeTab === "medium") return r.severity === "medium";
    if (activeTab === "low") return r.severity === "low" || r.severity === "info";
    return true;
  });

  const copyText = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1800);
  };

  return (
    <div className="contract-review-pane">
      <div className="review-pane-head">
        <div className="row" style={{ gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-strong)" }}>
            AI 审查报告与风险定位
          </span>
          {result && <span className="badge b-low">已完成</span>}
        </div>
        {result && (
          <span className="muted" style={{ fontSize: 11 }}>
            共发现 {risks.length} 处风险
          </span>
        )}
      </div>

      <div className="review-feed">
        {!result && !busy && (
          <div style={{ textAlign: "center", padding: "80px 20px" }}>
            <svg className="ic" style={{ width: 44, height: 44, color: "var(--border-strong)" }}>
              <use href="#i-contract" />
            </svg>
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 12, color: "var(--fg-strong)" }}>
              尚未对该合同发起审查
            </div>
            <p className="muted" style={{ fontSize: 12, marginTop: 6, maxWidth: 320, marginInline: "auto" }}>
              点击上方「发起智能审查」按钮，AI 将按法务标准逐项核验违约责任、争议管辖及履约风险。
            </p>
            <button className="btn primary sm" onClick={onRun} style={{ marginTop: 16 }}>
              立即审查此合同
            </button>
          </div>
        )}

        {busy && (
          <div style={{ textAlign: "center", padding: "80px 20px" }}>
            <div className="spin" style={{ width: 28, height: 28, marginInline: "auto", display: "block" }} />
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 16, color: "var(--fg-strong)" }}>
              AI 智能审查进行中…
            </div>
            <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
              正在依据《民法典》及商业交易检查单逐项核验条款合法性与商业平衡，约需 30-60 秒。
            </p>
          </div>
        )}

        {result && (
          <>
            {/* 风险概览 KPI 卡片 */}
            <div className="card" style={{ padding: "14px 16px", background: "var(--surface-2)" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-strong)", marginBottom: 6 }}>
                📋 审查总览
              </div>
              <div style={{ fontSize: 12.5, lineHeight: 1.6, color: "var(--fg)" }}>
                {result.summary}
              </div>
              <div className="row" style={{ gap: 10, marginTop: 12 }}>
                <span className="badge b-high">高风险 {highCount}</span>
                <span className="badge b-mid">中风险 {medCount}</span>
                <span className="badge b-low">建议优化 {lowCount}</span>
                {missingClauses.length > 0 && (
                  <span className="badge b-accent">缺失条款 {missingClauses.length}</span>
                )}
              </div>
            </div>

            {/* 风险等级过滤 Tabs */}
            <div className="tabs" style={{ marginTop: 4 }}>
              <button
                className={`tab ${activeTab === "all" ? "on" : ""}`}
                onClick={() => setActiveTab("all")}
              >
                全部 <b>({risks.length})</b>
              </button>
              <button
                className={`tab ${activeTab === "high" ? "on" : ""}`}
                onClick={() => setActiveTab("high")}
              >
                🔴 高风险 <b>({highCount})</b>
              </button>
              <button
                className={`tab ${activeTab === "medium" ? "on" : ""}`}
                onClick={() => setActiveTab("medium")}
              >
                🟡 中风险 <b>({medCount})</b>
              </button>
              <button
                className={`tab ${activeTab === "low" ? "on" : ""}`}
                onClick={() => setActiveTab("low")}
              >
                🟢 建议 <b>({lowCount})</b>
              </button>
              {missingClauses.length > 0 && (
                <button
                  className={`tab ${activeTab === "missing" ? "on" : ""}`}
                  onClick={() => setActiveTab("missing")}
                >
                  ⚠️ 缺失 <b>({missingClauses.length})</b>
                </button>
              )}
            </div>

            {/* 缺失条款视图 */}
            {activeTab === "missing" && (
              <div className="rows">
                {missingClauses.map((clause, idx) => (
                  <div key={idx} className="card" style={{ padding: "12px 14px" }}>
                    <div style={{ fontWeight: 600, color: "var(--risk-high-text)", fontSize: 13 }}>
                      ⚠️ 缺少必备条款：{clause}
                    </div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                      该合同未检索到有关【{clause}】的明确约定，可能在履约过程中引发举证困难或争议。
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 风险项列表与 Diff 修订建议 */}
            {activeTab !== "missing" && (
              <div className="rows">
                {filteredRisks.map((r, idx) => {
                  const isAdopted = adoptedIndices.has(idx);

                  return (
                    <div key={idx} className="risk-card">
                      <div
                        className="risk-card-head"
                        onClick={() => onScrollToQuote(r.quote)}
                        title="点击可在左侧正文定位高亮此条款"
                      >
                        <div className="risk-card-title">
                          <span
                            className={`badge ${
                              r.severity === "high"
                                ? "b-high"
                                : r.severity === "medium"
                                ? "b-mid"
                                : "b-low"
                            }`}
                          >
                            {r.severity === "high"
                              ? "高风险"
                              : r.severity === "medium"
                              ? "中风险"
                              : "建议"}
                          </span>
                          <span>{r.title}</span>
                        </div>
                        <button className="btn ghost sm" style={{ padding: "0 6px" }}>
                          定位原文 →
                        </button>
                      </div>

                      <div className="risk-card-body">
                        <div style={{ color: "var(--fg)", fontSize: 12.5 }}>{r.finding}</div>

                        {r.quote && (
                          <div className="quote-box">
                            <b>命中条款：</b>“{r.quote}”
                          </div>
                        )}

                        {r.suggestion && (
                          <div className="diff-container">
                            <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--accent)" }}>
                              💡 AI 专业修订建议与替换：
                            </div>
                            {r.quote && (
                              <div className="diff-del">
                                - 原文：{r.quote}
                              </div>
                            )}
                            <div className="diff-ins">
                              + 修订：{r.suggestion}
                            </div>

                            <div className="diff-actions">
                              {r.quote && (
                                <button
                                  className="btn primary sm"
                                  disabled={isAdopted}
                                  onClick={() => onAdoptSuggestion(r.quote, r.suggestion, idx)}
                                >
                                  {isAdopted ? "✓ 已采纳修改" : "采纳并替换原文"}
                                </button>
                              )}
                              <button
                                className="btn outline sm"
                                onClick={() => copyText(r.suggestion, idx)}
                              >
                                {copiedIndex === idx ? "已复制" : "复制建议条款"}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="muted" style={{ fontSize: 11, textAlign: "center", marginTop: 12 }}>
              {result.disclaimer}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
