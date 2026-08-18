import { useCallback, useEffect, useState } from "react";
import { bridge } from "../bridge.js";

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
interface LaborCase {
  id: string;
  title: string;
  employee: string;
  employer: string;
  city: string;
  dispute_amount: string;
  claim_summary: string;
  stage_index: number;
  stage: Stage;
  stage_flow: Stage[];
  stage_notes: { stage: string; note: string; at: string }[];
  todos: Todo[];
}
interface LaborCaseSummary {
  id: string;
  title: string;
  employee: string;
  employer: string;
  city: string;
  dispute_amount: string;
  stage: string;
  updated_at: string;
}

export function MattersView() {
  const [cases, setCases] = useState<LaborCaseSummary[] | null>(null);
  const [down, setDown] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const refresh = useCallback(async () => {
    const res = await bridge.api<{ items: LaborCaseSummary[] }>({ path: "/api/labor/cases" });
    if (res.ok) {
      setCases(res.data.items);
      setDown(false);
    } else {
      setDown(true);
      setCases([]);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (down)
    return (
      <Page title="劳动仲裁案件">
        <BackendDown />
      </Page>
    );

  if (selected)
    return (
      <CaseDetail
        caseId={selected}
        onBack={() => {
          setSelected(null);
          refresh();
        }}
      />
    );

  return (
    <Page
      title="劳动仲裁案件"
      action={
        <button className="btn primary" onClick={() => setCreating(true)}>
          新建案件
        </button>
      }
    >
      {cases === null ? (
        <Loading />
      ) : cases.length === 0 && !creating ? (
        <div className="empty">
          <div className="empty-title">还没有劳动仲裁案件</div>
          <div className="empty-sub">新建后会自动生成 8 阶段办案进度表</div>
        </div>
      ) : (
        <div className="rows">
          {cases.map((c) => (
            <button key={c.id} className="row" onClick={() => setSelected(c.id)}>
              <span className="row-main">
                <span className="row-title">{c.title}</span>
                <span className="row-sub">
                  {c.employee} 诉 {c.employer}
                  {c.city ? ` · ${c.city}` : ""}
                </span>
              </span>
              <span className="badge">{c.stage}</span>
            </button>
          ))}
        </div>
      )}
      {creating && (
        <CreateCaseForm
          onCancel={() => setCreating(false)}
          onCreated={async () => {
            setCreating(false);
            await refresh();
          }}
        />
      )}
    </Page>
  );
}

function CaseDetail(props: { caseId: string; onBack: () => void }) {
  const [data, setData] = useState<LaborCase | null>(null);
  const [busy, setBusy] = useState(false);
  const [todoText, setTodoText] = useState("");
  const [region, setRegion] = useState<Record<string, string> | null>(null);

  const load = useCallback(async () => {
    const res = await bridge.api<LaborCase>({ path: `/api/labor/cases/${props.caseId}` });
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
    setBusy(true);
    await bridge.api({ method: "POST", path: `/api/labor/cases/${props.caseId}/advance`, body: {} });
    await load();
    setBusy(false);
  };
  const addTodo = async () => {
    if (!todoText.trim()) return;
    await bridge.api({
      method: "POST",
      path: `/api/labor/cases/${props.caseId}/todos`,
      body: { title: todoText.trim() },
    });
    setTodoText("");
    await load();
  };
  const doneTodo = async (id: string) => {
    await bridge.api({ method: "POST", path: `/api/labor/todos/${id}/done` });
    await load();
  };

  if (!data) return <Page title="案件详情"><Loading /></Page>;

  const openTodos = data.todos.filter((t) => !t.done);

  return (
    <Page
      title={data.title}
      action={
        <button className="btn" onClick={props.onBack}>
          ← 返回
        </button>
      }
    >
      <div className="case-meta">
        {data.employee} 诉 {data.employer}
        {data.city ? ` · ${data.city}` : ""}
        {data.dispute_amount ? ` · 争议金额 ${data.dispute_amount}` : ""}
        {openTodos.length > 0 && <span className="badge warn">{openTodos.length} 项待办</span>}
      </div>

      <div className="stepper" role="list">
        {data.stage_flow.map((s, i) => (
          <div key={s.key} className={`step ${i < data.stage_index ? "past" : ""} ${i === data.stage_index ? "now" : ""}`} role="listitem">
            <span className="step-dot" />
            <span className="step-name">{s.name}</span>
            {i === data.stage_index && <span className="step-hint">{s.hint}</span>}
          </div>
        ))}
      </div>

      <div className="case-actions">
        <button className="btn primary" onClick={advance} disabled={busy || data.stage_index >= 7}>
          {busy ? "处理中…" : `推进到「${data.stage_flow[data.stage_index + 1]?.name ?? "已到最后阶段"}」`}
        </button>
      </div>

      <div className="case-cols">
        <div className="card">
          <h3>待办</h3>
          <div className="todo-add">
            <input
              value={todoText}
              placeholder="新增待办，如「收集工资流水」"
              onChange={(e) => setTodoText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTodo()}
            />
            <button className="btn sm" onClick={addTodo}>添加</button>
          </div>
          {data.todos.length === 0 && <div className="empty-sub">暂无待办</div>}
          {data.todos.map((t) => (
            <label key={t.id} className={`todo ${t.done ? "done" : ""}`}>
              <input type="checkbox" checked={t.done} disabled={t.done} onChange={() => doneTodo(t.id)} />
              {t.title}
            </label>
          ))}
        </div>
        {region && (
          <div className="card">
            <h3>规则参考{data.city ? ` · ${data.city}` : ""}</h3>
            <dl className="region-list">
              {Object.entries(region).map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>
    </Page>
  );
}

function CreateCaseForm(props: { onCancel: () => void; onCreated: () => void }) {
  const [f, setF] = useState({ title: "", employee: "", employer: "", city: "", claim_summary: "" });
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!f.title || !f.employee || !f.employer) return;
    setBusy(true);
    const res = await bridge.api({ method: "POST", path: "/api/labor/cases", body: f });
    setBusy(false);
    if (res.ok) props.onCreated();
  };
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF({ ...f, [k]: e.target.value });

  return (
    <div className="card form-card">
      <h3>新建劳动仲裁案件</h3>
      <label className="field">
        <span className="field-label">案件名称 *</span>
        <input value={f.title} onChange={set("title")} placeholder="如：张某诉某公司违法解除案" />
      </label>
      <div className="form-grid">
        <label className="field">
          <span className="field-label">劳动者 *</span>
          <input value={f.employee} onChange={set("employee")} />
        </label>
        <label className="field">
          <span className="field-label">用人单位 *</span>
          <input value={f.employer} onChange={set("employer")} />
        </label>
      </div>
      <div className="form-grid">
        <label className="field">
          <span className="field-label">城市</span>
          <input value={f.city} onChange={set("city")} placeholder="北京" />
        </label>
        <label className="field">
          <span className="field-label">诉求摘要</span>
          <input value={f.claim_summary} onChange={set("claim_summary")} placeholder="违法解除赔偿金 2N" />
        </label>
      </div>
      <div className="settings-actions">
        <button className="btn primary" onClick={submit} disabled={busy || !f.title || !f.employee || !f.employer}>
          {busy ? "创建中…" : "创建"}
        </button>
        <button className="btn" onClick={props.onCancel}>取消</button>
      </div>
    </div>
  );
}

export function Page(props: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="page">
      <div className="page-head">
        <h2>{props.title}</h2>
        {props.action}
      </div>
      {props.children}
    </div>
  );
}

export function Loading() {
  return <div className="loading">加载中…</div>;
}

export function BackendDown() {
  return (
    <div className="empty">
      <div className="empty-title">工具后端未连接</div>
      <div className="empty-sub">
        案件、审查、文书功能需要 legal-agent 后端。请确认后端已启动，并在「设置」中核对地址。
      </div>
    </div>
  );
}
