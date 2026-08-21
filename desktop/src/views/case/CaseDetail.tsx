import { useCallback, useEffect, useState } from "react";
import { bridge } from "../../bridge.js";
import { ErrorBanner, UploadButton, apiErr } from "../UploadButton.js";

interface Stage {
  key: string;
  name: string;
  hint: string;
  reached?: boolean;
}

interface Todo {
  id: string;
  title: string;
  due: string;
  done: boolean;
}

export interface CaseData {
  id: string;
  title: string;
  case_type?: string;
  employee: string;
  employer: string;
  city: string;
  dispute_amount: string;
  claim_summary: string;
  stage_index: number;
  stage: Stage;
  stage_flow: Stage[];
  todos: Todo[];
}

export function CaseDetail(props: { caseId: string; onBack: () => void }) {
  const [data, setData] = useState<CaseData | null>(null);
  const [busy, setBusy] = useState(false);
  const [todoText, setTodoText] = useState("");
  const [region, setRegion] = useState<Record<string, string> | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await bridge.api<CaseData>({ path: `/api/labor/cases/${props.caseId}` });
    if (res.ok) setData(res.data);
  }, [props.caseId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!data?.city) return;
    bridge
      .api<{ city_note: string; national: Record<string, string> }>({
        path: `/api/labor/regions?city=${encodeURIComponent(data.city)}`,
      })
      .then((r) => r.ok && setRegion({ ...r.data.national, 地区提示: r.data.city_note }));
  }, [data?.city]);

  const advance = async () => {
    if (!data) return;
    setBusy(true);
    const res = await bridge.api({
      method: "POST",
      path: `/api/labor/cases/${props.caseId}/advance`,
      body: {},
    });
    setBusy(false);
    if (!res.ok) {
      setError(apiErr(res, "推进阶段失败"));
      return;
    }
    setError("");
    await load();
  };

  const addTodo = async () => {
    if (!todoText.trim()) return;
    const res = await bridge.api({
      method: "POST",
      path: `/api/labor/cases/${props.caseId}/todos`,
      body: { title: todoText.trim() },
    });
    if (!res.ok) {
      setError(apiErr(res, "添加待办失败"));
      return;
    }
    setTodoText("");
    setError("");
    await load();
  };

  const deleteTodo = async (id: string) => {
    const res = await bridge.api({ method: "DELETE", path: `/api/labor/todos/${id}` });
    if (!res.ok) {
      setError(apiErr(res, "删除待办失败"));
      return;
    }
    await load();
  };

  const doneTodo = async (id: string) => {
    const res = await bridge.api({ method: "POST", path: `/api/labor/todos/${id}/done` });
    if (!res.ok) {
      setError(apiErr(res, "完成待办失败"));
      return;
    }
    await load();
  };

  if (!data) return <div className="pg-body"><div className="empty-d">加载案件详情…</div></div>;

  const openTodos = data.todos.filter((t) => !t.done);
  const ctype = data.case_type || "civil";
  const typeLabel = ctype === "civil" ? "⚖️ 民商事" : ctype === "criminal" ? "🛡️ 刑事辩护" : "📑 非诉业务";
  const typeBadgeClass = ctype === "civil" ? "b-accent" : ctype === "criminal" ? "b-high" : "b-low";

  return (
    <div className="pg-root">
      <div className="pg-head">
        <button className="btn outline sm" onClick={props.onBack}>
          <svg className="ic"><use href="#i-back" /></svg>
          返回列表
        </button>
        <div className="grow" style={{ marginLeft: 6 }}>
          <div className="row" style={{ gap: 8 }}>
            <span className={`badge ${typeBadgeClass}`}>{typeLabel}</span>
            <h1 className="pg-title" style={{ fontSize: 16 }}>{data.title}</h1>
          </div>
          <div className="pg-sub">
            当事人：{data.employee} vs {data.employer}
            {data.city ? ` · 管辖：${data.city}` : ""}
            {data.dispute_amount ? ` · 涉及：${data.dispute_amount}` : ""}
            {openTodos.length > 0 ? ` · ${openTodos.length} 项进行中待办` : ""}
          </div>
        </div>
        <UploadButton onUploaded={load} onError={setError} label="归档材料" />
      </div>

      <div className="pg-body">
        {error && <ErrorBanner message={error} onRetry={() => setError("")} />}

        {/* 动态阶段流程 Stepper */}
        <div className="card" style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontWeight: 600, fontSize: 13.5, color: "var(--fg-strong)" }}>
              🚩 办案全流程进度（当前：{data.stage.name}）
            </span>
            <button
              className="btn primary sm"
              onClick={advance}
              disabled={busy || data.stage_index >= data.stage_flow.length - 1}
            >
              {busy ? "推进中…" : data.stage_index >= data.stage_flow.length - 1 ? "已进入最终阶段" : `推进至「${data.stage_flow[data.stage_index + 1]?.name}」→`}
            </button>
          </div>

          <div className="stepper" style={{ gridTemplateColumns: `repeat(${data.stage_flow.length}, 1fr)` }}>
            {data.stage_flow.map((s, i) => (
              <div
                key={s.key}
                className={`step ${i < data.stage_index ? "past" : ""} ${i === data.stage_index ? "now" : ""}`}
              >
                <span className="step-dot" />
                <span className="step-name">{s.name}</span>
                {i === data.stage_index && <span className="step-hint">{s.hint}</span>}
              </div>
            ))}
          </div>
        </div>

        {/* 阶段专属检查单 */}
        <StageChecklist caseId={props.caseId} stageName={data.stage.name} onRefresh={load} />

        {/* 待办事项与法律规则参考 */}
        <div className="calc-grid">
          <div className="card">
            <div className="set-sec" style={{ marginBottom: "12px" }}>
              案件待办事项 ({openTodos.length} 待办 / 共 {data.todos.length} 项)
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <input
                className="input"
                style={{ flex: 1 }}
                value={todoText}
                placeholder="添加本案待办（如「调取微信聊天记录」）…"
                onChange={(e) => setTodoText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTodo()}
              />
              <button className="btn primary sm" onClick={addTodo}>
                添加
              </button>
            </div>

            {data.todos.length === 0 ? (
              <div className="empty-d" style={{ padding: "16px 0" }}>暂无待办，可上方添加或在检查单中一键生成</div>
            ) : (
              <div className="todo">
                {data.todos.map((t) => (
                  <div key={t.id} className="todo-item">
                    <input
                      type="checkbox"
                      checked={t.done}
                      disabled={t.done}
                      onChange={() => doneTodo(t.id)}
                      style={{ width: 16, height: 16, cursor: "pointer", accentColor: "var(--accent)" }}
                    />
                    <span style={{ flex: 1, textDecoration: t.done ? "line-through" : "none", color: t.done ? "var(--muted)" : "var(--fg)" }}>
                      {t.title}
                    </span>
                    <button
                      className="btn ghost sm"
                      style={{ padding: "2px 6px" }}
                      onClick={() => deleteTodo(t.id)}
                      title="删除"
                    >
                      <svg className="ic" style={{ width: 13, height: 13, color: "var(--risk-high)" }}><use href="#i-wclose" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 规则与裁判参考卡 */}
          {region && (
            <div className="card">
              <div className="set-sec" style={{ marginBottom: "12px" }}>
                法律规则参考 {data.city ? `· ${data.city}` : ""}
              </div>
              {Object.entries(region).map(([k, v]) => (
                <div key={k} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)" }}>{k}</div>
                  <div style={{ fontSize: 12.5, lineHeight: 1.6, color: "var(--fg)" }}>{v}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StageChecklist(props: { caseId: string; stageName: string; onRefresh?: () => void }) {
  const [items, setItems] = useState<{ title: string; done: boolean }[]>([]);
  const [loading, setLoading] = useState(true);

  const loadChecklist = useCallback(async () => {
    setLoading(true);
    const res = await bridge.api<{ items: { title: string; done: boolean }[] }>({
      path: `/api/labor/cases/${props.caseId}/stage-checklist`,
    });
    if (res.ok) setItems(res.data.items || []);
    setLoading(false);
  }, [props.caseId]);

  useEffect(() => {
    loadChecklist();
  }, [loadChecklist]);

  const generateTodos = async () => {
    const undone = items.filter((i) => !i.done);
    for (const item of undone) {
      await bridge.api({
        method: "POST",
        path: `/api/labor/cases/${props.caseId}/todos`,
        body: { title: item.title },
      });
    }
    loadChecklist();
    props.onRefresh?.();
  };

  if (loading) return <div className="card"><div className="empty-d">加载阶段检查单…</div></div>;
  if (items.length === 0) return null;

  const doneCount = items.filter((i) => i.done).length;

  return (
    <div className="card">
      <div className="card-head">
        <span className="card-title">📋 当前阶段重点检查单（{props.stageName}）</span>
        <span className="badge">{doneCount}/{items.length}</span>
        <button className="btn outline sm" style={{ marginLeft: "auto" }} onClick={generateTodos}>
          一键生成待办
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 8 }}>
        {items.map((item, idx) => (
          <div
            key={idx}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              background: item.done ? "var(--surface-2)" : "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--r-md)",
              opacity: item.done ? 0.6 : 1,
            }}
          >
            <input type="checkbox" checked={item.done} readOnly style={{ accentColor: "var(--accent)" }} />
            <span style={{ fontSize: 12.5, textDecoration: item.done ? "line-through" : "none" }}>{item.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
