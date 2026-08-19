import { useCallback, useEffect, useState } from "react";
import { bridge } from "../bridge.js";
import { ErrorBanner, UploadButton, apiErr } from "./UploadButton.js";

interface Stage { key: string; name: string; hint: string; reached?: boolean }
interface Todo { id: string; title: string; due: string; done: boolean }
interface LaborCase {
  id: string; title: string; employee: string; employer: string; city: string;
  dispute_amount: string; claim_summary: string; stage_index: number;
  stage: Stage; stage_flow: Stage[]; todos: Todo[];
}
interface CaseSummary { id: string; title: string; employee: string; employer: string; city: string; stage: string; updated_at: string }
interface MatterRow { id: string; title: string; client_name: string | null; doc_count: number; updated_at: string }

export function CaseView() {
  const [cases, setCases] = useState<CaseSummary[] | null>(null);
  const [folders, setFolders] = useState<MatterRow[] | null>(null);
  const [down, setDown] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [folderForm, setFolderForm] = useState(false);

  const refresh = useCallback(async () => {
    const [labor, matters] = await Promise.all([
      bridge.api<{ items: CaseSummary[] }>({ path: "/api/labor/cases" }),
      bridge.api<{ items: MatterRow[] }>({ path: "/api/matters" }),
    ]);
    if (labor.ok) { setCases(labor.data.items); setDown(false); } else { setDown(true); setCases([]); }
    if (matters.ok) setFolders(matters.data.items);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  if (selected) return <CaseDetail caseId={selected} onBack={() => { setSelected(null); refresh(); }} />;

  return (
    <div className="pg-root">
      <div className="pg-head">
        <div className="grow">
          <h1 className="pg-title">案件管理</h1>
          <div className="pg-sub">案件夹 · 劳动仲裁 8 阶段进度 · 待办</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn outline" onClick={() => setFolderForm(true)}><svg className="ic"><use href="#i-folder" /></svg>新建案件夹</button>
          <button className="btn primary" onClick={() => setCreating(true)}><svg className="ic"><use href="#i-plus" /></svg>新建仲裁案</button>
        </div>
      </div>
      <div className="pg-body">
        {error && <ErrorBanner message={error} />}
        {down ? (
          <div className="empty">
            <svg className="ic" style={{ width: 36, height: 36, color: "var(--border-strong)" }}><use href="#i-alert" /></svg>
            <div className="empty-t">工具后端未连接</div>
            <p className="empty-d">请到「设置」点测试连接诊断。若刚启动，内置服务可能还在加载（几秒）。</p>
            <button className="btn outline" onClick={refresh}>重试</button>
          </div>
        ) : (
          <>
            {folders !== null && folders.length > 0 && (
              <div className="card">
                <div className="set-sec" style={{ marginBottom: "8px" }}>案件夹（{folders.length}）</div>
                {folders.map((f) => (
                  <div key={f.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                    <span><b style={{ fontSize: 13 }}>{f.title}</b><span className="hint" style={{ marginLeft: 8 }}>{f.client_name || "未记录委托人"}</span></span>
                    <span className="badge">{f.doc_count} 份材料</span>
                  </div>
                ))}
              </div>
            )}
            <div className="set-sec">劳动仲裁案件</div>
            {cases === null ? (
              <div className="empty-d">加载中…</div>
            ) : cases.length === 0 && !creating ? (
              <div className="empty">
                <svg className="ic" style={{ width: 36, height: 36, color: "var(--border-strong)" }}><use href="#i-folder" /></svg>
                <div className="empty-t">还没有劳动仲裁案件</div>
                <p className="empty-d">新建后会自动生成 8 阶段办案进度表</p>
                <button className="btn primary" onClick={() => setCreating(true)}><svg className="ic"><use href="#i-plus" /></svg>新建第一个仲裁案</button>
              </div>
            ) : (
              <div className="rows">
                {cases.map((c) => (
                  <button key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", textAlign: "left", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: "10px 14px", cursor: "pointer" }} onClick={() => setSelected(c.id)}>
                    <span>
                      <b style={{ fontSize: 13.5 }}>{c.title}</b>
                      <div className="hint">{c.employee} 诉 {c.employer}{c.city ? ` · ${c.city}` : ""}</div>
                    </span>
                    <span className="badge b-low">{c.stage}</span>
                  </button>
                ))}
              </div>
            )}
            {creating && <CreateCaseForm onCancel={() => setCreating(false)} onError={setError} onCreated={async () => { setCreating(false); setError(""); await refresh(); }} />}
            {folderForm && <CreateFolderForm onCancel={() => setFolderForm(false)} onError={setError} onCreated={async () => { setFolderForm(false); setError(""); await refresh(); }} />}
          </>
        )}
      </div>
    </div>
  );
}

function CaseDetail(props: { caseId: string; onBack: () => void }) {
  const [data, setData] = useState<LaborCase | null>(null);
  const [busy, setBusy] = useState(false);
  const [todoText, setTodoText] = useState("");
  const [region, setRegion] = useState<Record<string, string> | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await bridge.api<LaborCase>({ path: `/api/labor/cases/${props.caseId}` });
    if (res.ok) setData(res.data);
  }, [props.caseId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!data?.city) return;
    bridge.api<{ city_note: string; national: Record<string, string> }>({ path: `/api/labor/regions?city=${encodeURIComponent(data.city)}` })
      .then((r) => r.ok && setRegion({ ...r.data.national, 地区提示: r.data.city_note }));
  }, [data?.city]);

  const advance = async () => {
    setBusy(true);
    const res = await bridge.api({ method: "POST", path: `/api/labor/cases/${props.caseId}/advance`, body: {} });
    setBusy(false);
    if (!res.ok) { setError(apiErr(res, "推进失败")); return; }
    setError(""); await load();
  };
  const addTodo = async () => {
    if (!todoText.trim()) return;
    const res = await bridge.api({ method: "POST", path: `/api/labor/cases/${props.caseId}/todos`, body: { title: todoText.trim() } });
    if (!res.ok) { setError(apiErr(res, "添加待办失败")); return; }
    setTodoText(""); setError(""); await load();
  };
  const doneTodo = async (id: string) => {
    const res = await bridge.api({ method: "POST", path: `/api/labor/todos/${id}/done` });
    if (!res.ok) { setError(apiErr(res, "完成待办失败")); return; }
    await load();
  };

  if (!data) return <div className="pg-body"><div className="empty-d">加载案件详情…</div></div>;
  const openTodos = data.todos.filter((t) => !t.done);

  return (
    <div className="pg-root">
      <div className="pg-head">
        <button className="btn outline" onClick={props.onBack}><svg className="ic"><use href="#i-back" /></svg>返回</button>
        <div className="grow">
          <h1 className="pg-title">{data.title}</h1>
          <div className="pg-sub">{data.employee} 诉 {data.employer}{data.city ? ` · ${data.city}` : ""}{data.dispute_amount ? ` · 争议 ${data.dispute_amount}` : ""}{openTodos.length > 0 ? ` · ${openTodos.length} 项待办` : ""}</div>
        </div>
        <UploadButton onUploaded={load} onError={setError} label="上传案件材料" />
      </div>
      <div className="pg-body">
        {error && <ErrorBanner message={error} onRetry={() => setError("")} />}
        <div className="stepper">
          {data.stage_flow.map((s, i) => (
            <div key={s.key} className={`step ${i < data.stage_index ? "past" : ""} ${i === data.stage_index ? "now" : ""}`}>
              <span className="step-dot" />
              <span className="step-name">{s.name}</span>
              {i === data.stage_index && <span className="step-hint">{s.hint}</span>}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn primary" onClick={advance} disabled={busy || data.stage_index >= 7}>
            {busy ? "处理中…" : `推进到「${data.stage_flow[data.stage_index + 1]?.name ?? "已完成"}」`}
          </button>
        </div>
        <div className="case-cols">
          <div className="card">
            <div className="set-sec" style={{ marginBottom: "8px" }}>待办</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <input className="input" style={{ flex: 1 }} value={todoText} placeholder="新增待办，如「收集工资流水」" onChange={(e) => setTodoText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTodo()} />
              <button className="btn outline" onClick={addTodo}>添加</button>
            </div>
            {data.todos.length === 0 && <div className="empty-d">暂无待办</div>}
            {data.todos.map((t) => (
              <label key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", fontSize: 13, borderBottom: "1px solid var(--border)", opacity: t.done ? 0.5 : 1, textDecoration: t.done ? "line-through" : "none" }}>
                <input type="checkbox" checked={t.done} disabled={t.done} onChange={() => doneTodo(t.id)} />
                {t.title}
              </label>
            ))}
          </div>
          {region && (
            <div className="card">
              <div className="set-sec" style={{ marginBottom: "8px" }}>规则参考{data.city ? ` · ${data.city}` : ""}</div>
              {Object.entries(region).map(([k, v]) => (
                <div key={k} style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>{k}</div>
                  <div style={{ fontSize: 12.5, lineHeight: 1.55 }}>{v}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CreateCaseForm(props: { onCancel: () => void; onCreated: () => void; onError: (msg: string) => void }) {
  const [f, setF] = useState({ title: "", employee: "", employer: "", city: "", claim_summary: "" });
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!f.title || !f.employee || !f.employer) return;
    setBusy(true);
    const res = await bridge.api({ method: "POST", path: "/api/labor/cases", body: f });
    setBusy(false);
    if (res.ok) props.onCreated();
    else props.onError(apiErr(res, "创建失败"));
  };
  return (
    <div className="card">
      <div className="set-sec" style={{ marginBottom: "10px" }}>新建劳动仲裁案件</div>
      <div className="field"><div className="lab">案件名称 *</div>
        <input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="如：张某诉某公司违法解除案" />
      </div>
      <div className="gw-row">
        <div className="field"><div className="lab">劳动者 *</div><input className="input" value={f.employee} onChange={(e) => setF({ ...f, employee: e.target.value })} /></div>
        <div className="field"><div className="lab">用人单位 *</div><input className="input" value={f.employer} onChange={(e) => setF({ ...f, employer: e.target.value })} /></div>
      </div>
      <div className="gw-row">
        <div className="field"><div className="lab">城市</div><input className="input" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} placeholder="北京" /></div>
        <div className="field"><div className="lab">诉求摘要</div><input className="input" value={f.claim_summary} onChange={(e) => setF({ ...f, claim_summary: e.target.value })} placeholder="违法解除赔偿金 2N" /></div>
      </div>
      <div className="form-actions">
        <button className="btn primary" onClick={submit} disabled={busy || !f.title || !f.employee || !f.employer}>{busy ? "创建中…" : "创建"}</button>
        <button className="btn outline" onClick={props.onCancel}>取消</button>
      </div>
    </div>
  );
}

function CreateFolderForm(props: { onCancel: () => void; onCreated: () => void; onError: (msg: string) => void }) {
  const [f, setF] = useState({ title: "", client_name: "" });
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!f.title.trim()) return;
    setBusy(true);
    const res = await bridge.api({ method: "POST", path: "/api/matters", body: { title: f.title.trim(), ...(f.client_name.trim() ? { client_name: f.client_name.trim() } : {}) } });
    setBusy(false);
    if (res.ok) props.onCreated();
    else props.onError(apiErr(res, "创建失败"));
  };
  return (
    <div className="card">
      <div className="set-sec" style={{ marginBottom: "10px" }}>新建案件夹</div>
      <div className="gw-row">
        <div className="field"><div className="lab">案件夹名称 *</div><input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="如：张某劳动争议" /></div>
        <div className="field"><div className="lab">委托人</div><input className="input" value={f.client_name} onChange={(e) => setF({ ...f, client_name: e.target.value })} /></div>
      </div>
      <div className="form-actions">
        <button className="btn primary" onClick={submit} disabled={busy || !f.title.trim()}>{busy ? "创建中…" : "创建"}</button>
        <button className="btn outline" onClick={props.onCancel}>取消</button>
      </div>
    </div>
  );
}
