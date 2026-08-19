import { useEffect, useState } from "react";
import { bridge } from "../bridge.js";

const QUICK: { hash: string; icon: string; title: string; desc: string }[] = [
  { hash: "#consult", icon: "i-chat", title: "发起智能咨询", desc: "多轮对话分析" },
  { hash: "#case", icon: "i-plus", title: "新建仲裁案", desc: "8 阶段进度" },
  { hash: "#contract", icon: "i-contract", title: "审查合同", desc: "风险识别" },
  { hash: "#docgen", icon: "i-pen", title: "起草文书", desc: "仲裁申请书" },
  { hash: "#calc", icon: "i-calc", title: "赔偿计算", desc: "2N / §82" },
  { hash: "#dd", icon: "i-scan", title: "尽职调查", desc: "AI 阅卷" },
];

export function DashboardView() {
  const [stats, setStats] = useState({ matters: null as number | null, docs: null as number | null, cases: null as number | null, todos: 0 });
  const [recent, setRecent] = useState<{ id: string; title: string; employee: string; employer: string; city: string; stage: string }[]>([]);
  const [model, setModel] = useState("—");
  const [todos, setTodos] = useState<{ id: string; title: string; case_title: string }[]>([]);

  useEffect(() => {
    Promise.all([
      bridge.api<{ items: unknown[] }>({ path: "/api/matters" }),
      bridge.api<{ items: unknown[] }>({ path: "/api/documents" }),
      bridge.api<{ items: { id: string; title: string; employee: string; employer: string; city: string; stage: string; todos?: { done: boolean }[] }[] }>({ path: "/api/labor/cases" }),
    ]).then(([m, d, l]) => {
      if (m.ok && d.ok && l.ok) {
        const openTodos = (l.data.items ?? []).flatMap((c) => (c.todos ?? []).filter((t) => !t.done)).length;
        setStats({ matters: m.data.items.length, docs: d.data.items.length, cases: l.data.items.length, todos: openTodos });
        setRecent((l.data.items ?? []).slice(0, 5));
      }
    });
    bridge.getSettings().then((s) => setModel(s.modelId));
    bridge.api<{ items: { id: string; title: string; case_title: string }[] }>({ path: "/api/labor/todos/open?limit=8" })
      .then((r) => r.ok && setTodos(r.data.items ?? []));
  }, []);

  return (
    <div className="pg-root">
      <div className="pg-head">
        <div className="grow">
          <h1 className="pg-title">仪表盘</h1>
          <div className="pg-sub">案件总览 · 今日工作 · 快捷操作</div>
        </div>
        <span className="badge b-low">Pi 内核 · {model}</span>
        <button className="btn outline" onClick={() => alert("周报导出功能开发中")}>
          <svg className="ic"><use href="#i-doc" /></svg>导出周报
        </button>
      </div>
      <div className="pg-body">
        <div className="stats">
          <button className="stat" onClick={() => location.hash = "case"}>
            <span className="stat-label">在办案件</span>
            <span className="stat-num">{stats.cases === null ? "…" : stats.cases}<small>件</small></span>
            <span className="stat-sub">劳动仲裁 · 点击查看</span>
          </button>
          <button className="stat" onClick={() => location.hash = "case"}>
            <span className="stat-label">案件夹</span>
            <span className="stat-num">{stats.matters === null ? "…" : stats.matters}<small>个</small></span>
            <span className="stat-sub">含子案件 · 点击查看</span>
          </button>
          <button className="stat" onClick={() => location.hash = "contract"}>
            <span className="stat-label">文档材料</span>
            <span className="stat-num">{stats.docs === null ? "…" : stats.docs}<small>份</small></span>
            <span className="stat-sub">已上传 · 点击审查</span>
          </button>
          <button className="stat" onClick={() => location.hash = "case"}>
            <span className="stat-label">待办事项</span>
            <span className="stat-num">{stats.todos}<small>项</small></span>
            <span className="stat-sub"><em className="hot">{todos.length > 0 ? `待处理 ${todos.length} 项` : "全部完成"}</em></span>
          </button>
        </div>

        <div className="card">
          <div className="set-sec" style={{ marginBottom: "10px" }}>快捷操作</div>
          <div className="quick">
            {QUICK.map((q) => (
              <button key={q.hash} className="qa" onClick={() => (location.hash = q.hash)}>
                <svg className="ic"><use href={`#${q.icon}`} /></svg>
                {q.title}
                <small>{q.desc}</small>
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="set-sec" style={{ marginBottom: "8px" }}>最近案件</div>
          {recent.length === 0 ? (
            <div className="empty-d">暂无案件。从快捷操作「新建仲裁案」开始。</div>
          ) : (
            recent.map((c) => (
              <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                <span>
                  <b style={{ fontSize: 13 }}>{c.title}</b>
                  <div className="hint">{c.employee} 诉 {c.employer}{c.city ? ` · ${c.city}` : ""}</div>
                </span>
                <span className="badge b-low">{c.stage}</span>
              </div>
            ))
          )}
        </div>
        <div className="card" style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
          <div className="set-sec" style={{ marginBottom: "8px" }}>今日待办</div>
          {todos.length === 0 ? (
            <div className="empty-d">暂无待办</div>
          ) : (
            todos.map((t) => (
              <div key={t.id} className="todo-item">
                <div className="todo-main">
                  <div className="todo-title">{t.title}</div>
                  <div className="todo-meta">
                    <span>📁 {t.case_title}</span>
                  </div>
                </div>
                <span className="badge b-mid">待处理</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
