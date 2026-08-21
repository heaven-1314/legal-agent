import { useCallback, useEffect, useMemo, useState } from "react";
import { bridge } from "../bridge.js";
import { ErrorBanner, apiErr } from "./UploadButton.js";
import { CaseDetail, type CaseData } from "./case/CaseDetail.js";
import { CreateCaseForm } from "./case/CreateCaseForm.js";

type CategoryFilter = "all" | "civil" | "criminal" | "non_litigation";

interface CaseSummary {
  id: string;
  title: string;
  case_type?: string;
  stage_type_label?: string;
  employee: string;
  employer: string;
  city: string;
  dispute_amount?: string;
  stage: string;
  stage_index: number;
  created_at: string;
  updated_at: string;
}

interface MatterRow {
  id: string;
  title: string;
  client_name: string | null;
  doc_count: number;
  updated_at: string;
}

export function CaseView() {
  const [cases, setCases] = useState<CaseSummary[] | null>(null);
  const [folders, setFolders] = useState<MatterRow[] | null>(null);
  const [down, setDown] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [folderForm, setFolderForm] = useState(false);
  const [catFilter, setCatFilter] = useState<CategoryFilter>("all");

  const refresh = useCallback(async () => {
    const [labor, matters] = await Promise.all([
      bridge.api<{ items: CaseSummary[] }>({ path: "/api/labor/cases" }),
      bridge.api<{ items: MatterRow[] }>({ path: "/api/matters" }),
    ]);
    if (labor.ok) {
      setCases(labor.data.items || []);
      setDown(false);
    } else {
      setDown(true);
      setCases([]);
    }
    if (matters.ok) {
      setFolders(matters.data.items || []);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const civilCount = useMemo(() => (cases || []).filter((c) => (c.case_type || "civil") === "civil").length, [cases]);
  const criminalCount = useMemo(() => (cases || []).filter((c) => c.case_type === "criminal").length, [cases]);
  const nonLitCount = useMemo(() => (cases || []).filter((c) => c.case_type === "non_litigation").length, [cases]);

  const filteredCases = useMemo(() => {
    if (!cases) return [];
    if (catFilter === "civil") return cases.filter((c) => (c.case_type || "civil") === "civil");
    if (catFilter === "criminal") return cases.filter((c) => c.case_type === "criminal");
    if (catFilter === "non_litigation") return cases.filter((c) => c.case_type === "non_litigation");
    return cases;
  }, [cases, catFilter]);

  if (selected) {
    return <CaseDetail caseId={selected} onBack={() => { setSelected(null); refresh(); }} />;
  }

  return (
    <div className="pg-root">
      <div className="pg-head">
        <div className="grow">
          <h1 className="pg-title">案件管理工作台</h1>
          <div className="pg-sub">
            民商事 · 刑事辩护 · 非诉专项 全流程阶段流转与办案档案
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn outline" onClick={() => setFolderForm(true)}>
            <svg className="ic"><use href="#i-folder" /></svg>
            新建案件夹
          </button>
          <button className="btn primary" onClick={() => setCreating(true)}>
            <svg className="ic"><use href="#i-plus" /></svg>
            新建案件 / 事务
          </button>
        </div>
      </div>

      <div className="pg-body">
        {error && <ErrorBanner message={error} onRetry={() => setError("")} />}

        {down ? (
          <div className="card" style={{ textAlign: "center", padding: "48px 20px" }}>
            <svg className="ic" style={{ width: 36, height: 36, color: "var(--border-strong)", marginInline: "auto" }}>
              <use href="#i-alert" />
            </svg>
            <div className="empty-t" style={{ marginTop: 10 }}>工具后端未连接</div>
            <p className="empty-d" style={{ marginTop: 4 }}>请到「设置」检查后端服务连接状态。</p>
            <button className="btn outline sm" style={{ marginTop: 12 }} onClick={refresh}>重试</button>
          </div>
        ) : (
          <>
            {/* 案件夹区域 */}
            {folders !== null && folders.length > 0 && (
              <div className="card">
                <div className="card-head">
                  <span className="card-title">📁 案件夹归档（{folders.length}）</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
                  {folders.map((f) => (
                    <div
                      key={f.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 12px",
                        background: "var(--surface-2)",
                        borderRadius: "var(--r-md)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <div>
                        <b style={{ fontSize: 13, color: "var(--fg-strong)" }}>{f.title}</b>
                        <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
                          {f.client_name || "未记录委托人"}
                        </div>
                      </div>
                      <span className="badge b-neutral">{f.doc_count} 份材料</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 三大分类筛选 Tabs */}
            <div className="tabs">
              <button
                className={`tab ${catFilter === "all" ? "on" : ""}`}
                onClick={() => setCatFilter("all")}
              >
                全部在办案件 <b>({cases?.length || 0})</b>
              </button>
              <button
                className={`tab ${catFilter === "civil" ? "on" : ""}`}
                onClick={() => setCatFilter("civil")}
              >
                ⚖️ 民商事 <b>({civilCount})</b>
              </button>
              <button
                className={`tab ${catFilter === "criminal" ? "on" : ""}`}
                onClick={() => setCatFilter("criminal")}
              >
                🛡️ 刑事辩护 <b>({criminalCount})</b>
              </button>
              <button
                className={`tab ${catFilter === "non_litigation" ? "on" : ""}`}
                onClick={() => setCatFilter("non_litigation")}
              >
                📑 非诉业务 <b>({nonLitCount})</b>
              </button>
            </div>

            {/* 新建案件与新建案件夹表单 */}
            {creating && (
              <CreateCaseForm
                onCancel={() => setCreating(false)}
                onError={setError}
                onCreated={async () => {
                  setCreating(false);
                  setError("");
                  await refresh();
                }}
              />
            )}

            {folderForm && (
              <CreateFolderForm
                onCancel={() => setFolderForm(false)}
                onError={setError}
                onCreated={async () => {
                  setFolderForm(false);
                  setError("");
                  await refresh();
                }}
              />
            )}

            {/* 案件列表 */}
            {cases === null ? (
              <div className="card"><div className="empty-d">加载案件列表…</div></div>
            ) : filteredCases.length === 0 && !creating ? (
              <div className="card" style={{ textAlign: "center", padding: "48px 20px" }}>
                <svg className="ic" style={{ width: 40, height: 40, color: "var(--border-strong)", marginInline: "auto" }}>
                  <use href="#i-folder" />
                </svg>
                <div className="empty-t" style={{ marginTop: 10 }}>当前分类暂无案件</div>
                <p className="empty-d" style={{ marginTop: 4 }}>点击右上「新建案件 / 事务」开始录入民商事、刑事或非诉案件</p>
                <button className="btn primary sm" style={{ marginTop: 12 }} onClick={() => setCreating(true)}>
                  新建第一个案件
                </button>
              </div>
            ) : (
              <div className="rows">
                {filteredCases.map((c) => {
                  const ctype = c.case_type || "civil";
                  const typeLabel = ctype === "civil" ? "⚖️ 民商事" : ctype === "criminal" ? "🛡️ 刑事" : "📑 非诉";
                  const badgeClass = ctype === "civil" ? "b-accent" : ctype === "criminal" ? "b-high" : "b-low";

                  return (
                    <button
                      key={c.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        width: "100%",
                        textAlign: "left",
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--r-md)",
                        padding: "12px 16px",
                        cursor: "pointer",
                        boxShadow: "var(--shadow-1)",
                        transition: "var(--t-state)",
                      }}
                      onClick={() => setSelected(c.id)}
                    >
                      <div className="grow">
                        <div className="row" style={{ gap: 8 }}>
                          <span className={`badge ${badgeClass}`}>{typeLabel}</span>
                          <b style={{ fontSize: 13.5, color: "var(--fg-strong)" }}>{c.title}</b>
                        </div>
                        <div className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>
                          当事人：{c.employee} vs {c.employer}
                          {c.city ? ` · ${c.city}` : ""}
                          {c.dispute_amount ? ` · 涉及：${c.dispute_amount}` : ""}
                        </div>
                      </div>
                      <div className="row" style={{ gap: 8 }}>
                        <span className="badge b-neutral" style={{ height: 24 }}>
                          当前阶段：{c.stage}
                        </span>
                        <span className="btn outline sm">办案工作台 →</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function CreateFolderForm(props: {
  onCancel: () => void;
  onCreated: () => void;
  onError: (msg: string) => void;
}) {
  const [f, setF] = useState({ title: "", client_name: "" });
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!f.title.trim()) return;
    setBusy(true);
    const res = await bridge.api({
      method: "POST",
      path: "/api/matters",
      body: {
        title: f.title.trim(),
        ...(f.client_name.trim() ? { client_name: f.client_name.trim() } : {}),
      },
    });
    setBusy(false);
    if (res.ok) {
      props.onCreated();
    } else {
      props.onError(apiErr(res, "创建案件夹失败"));
    }
  };

  return (
    <div className="card" style={{ marginTop: 14 }}>
      <div className="card-head">
        <span className="card-title">📁 新建案件夹（案件容器）</span>
      </div>
      <div className="gw-row" style={{ marginBottom: 10 }}>
        <div className="field" style={{ flex: 1, minWidth: 200 }}>
          <div className="lab">案件夹名称 *</div>
          <input
            className="input"
            value={f.title}
            onChange={(e) => setF({ ...f, title: e.target.value })}
            placeholder="如：某某集团破产重整 / 张某系列诉讼"
          />
        </div>
        <div className="field" style={{ flex: 1, minWidth: 200 }}>
          <div className="lab">委托人</div>
          <input
            className="input"
            value={f.client_name}
            onChange={(e) => setF({ ...f, client_name: e.target.value })}
            placeholder="委托单位或个人名称"
          />
        </div>
      </div>
      <div className="form-actions">
        <button
          className="btn primary"
          onClick={submit}
          disabled={busy || !f.title.trim()}
        >
          {busy ? "创建中…" : "确认创建"}
        </button>
        <button className="btn outline" onClick={props.onCancel}>
          取消
        </button>
      </div>
    </div>
  );
}
