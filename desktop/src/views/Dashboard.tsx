import { useEffect, useState } from "react";
import { bridge } from "../bridge.js";

const QUICK: { hash: string; icon: string; title: string; desc: string }[] = [
  { hash: "#consult", icon: "i-chat", title: "发起智能咨询", desc: "Agent 对话 · 16 工具" },
  { hash: "#case", icon: "i-folder", title: "新建劳动仲裁案", desc: "8 阶段全流程" },
  { hash: "#contract", icon: "i-contract", title: "审查合同", desc: "高 / 中 / 低风险分级" },
  { hash: "#docgen", icon: "i-pen", title: "生成文书", desc: "申请书 · 答辩状 · 函件" },
  { hash: "#calc", icon: "i-calc", title: "赔偿计算", desc: "经济补偿 · 工伤 · 加班费" },
  { hash: "#dd", icon: "i-scan", title: "尽职调查", desc: "AI 阅卷 · 争点提炼" },
];

const STAGE_NAMES = ["咨询评估", "证据收集", "申请准备", "提交仲裁", "受理答辩", "开庭审理", "裁决", "执行"];

interface RecentCase {
  id: string; title: string; employee: string; employer: string; city: string;
  stage: string; stage_index: number; updated_at: string;
}
interface OpenTodo {
  id: string; title: string; case_title: string; due: string; done: boolean;
}

export function DashboardView() {
  const [stats, setStats] = useState({ matters: null as number | null, docs: null as number | null, cases: null as number | null, reviews: null as number | null });
  const [recent, setRecent] = useState<RecentCase[]>([]);
  const [todos, setTodos] = useState<OpenTodo[]>([]);
  const [model, setModel] = useState("—");

  useEffect(() => {
    Promise.all([
      bridge.api<{ items: unknown[] }>({ path: "/api/matters" }),
      bridge.api<{ items: unknown[] }>({ path: "/api/documents" }),
      bridge.api<{ items: RecentCase[] }>({ path: "/api/labor/cases" }),
      bridge.api<{ items: unknown[] }>({ path: "/api/review/runs?limit=5" }),
    ]).then(([m, d, l, r]) => {
      if (m.ok && d.ok && l.ok) {
        setStats({ matters: m.data.items.length, docs: d.data.items.length, cases: l.data.items.length, reviews: r.ok ? r.data.items.length : 0 });
        setRecent((l.data.items ?? []).slice(0, 5));
      }
    });
    bridge.getSettings().then((s) => setModel(s.modelId));
    bridge.api<{ items: OpenTodo[] }>({ path: "/api/labor/todos/open?limit=8" })
      .then((r) => r.ok && setTodos(r.data.items ?? []));
  }, []);

  const completeTodo = async (id: string) => {
    await bridge.api({ method: "POST", path: `/api/labor/todos/${id}/done` });
    setTodos((t) => t.filter((x) => x.id !== id));
  };

  const today = new Date();
  const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日 星期${["日","一","二","三","四","五","六"][today.getDay()]}`;

  return (
    <div className="pg-root">
      <div className="pg-head">
        <div className="grow">
          <h1 className="pg-title">仪表盘</h1>
          <div className="pg-sub">{dateStr} · Pi 内核 · {model}</div>
        </div>
        <button className="btn outline" onClick={() => alert("周报导出功能开发中")}>
          <svg className="ic"><use href="#i-doc" /></svg>导出周报
        </button>
        <button className="btn primary" onClick={() => location.hash = "case"}>
          <svg className="ic"><use href="#i-plus" /></svg>新建案件
        </button>
      </div>
      <div className="pg-body">
        <div className="stats">
          <button className="stat" onClick={() => location.hash = "case"}>
            <span className="stat-label">在办案件</span>
            <span className="stat-num">{stats.cases === null ? "…" : stats.cases}<small>件</small></span>
            <span className="stat-sub">劳动仲裁 · 点击查看</span>
          </button>
          <button className="stat" onClick={() => location.hash = "contract"}>
            <span className="stat-label">待审查合同</span>
            <span className="stat-num">{stats.docs === null ? "…" : stats.docs}<small>份</small></span>
            <span className="stat-sub">已上传文档</span>
          </button>
          <button className="stat" onClick={() => location.hash = "case"}>
            <span className="stat-label">待办事项</span>
            <span className="stat-num">{todos.length}<small>项</small></span>
            <span className="stat-sub"><em className="hot">{todos.length > 0 ? `${todos.length} 项待处理` : "全部完成"}</em></span>
          </button>
          <button className="stat" onClick={() => location.hash = "case"}>
            <span className="stat-label">案件夹</span>
            <span className="stat-num">{stats.matters === null ? "…" : stats.matters}<small>个</small></span>
            <span className="stat-sub">含子案件</span>
          </button>
        </div>

        <div className="card">
          <div className="card-head"><span className="card-title">快捷操作</span></div>
          <div className="quick">
            {QUICK.map((q) => (
              <button key={q.hash} className="qa" onClick={() => location.hash = q.hash}>
                <svg className="ic"><use href={`#${q.icon}`} /></svg>
                {q.title}
                <small>{q.desc}</small>
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 318px", gap: 16, flex: 1, minHeight: 0 }}>
          <div className="card" style={{ padding: "8px 6px 4px", overflowY: "auto" }}>
            <div className="card-head" style={{ padding: "6px 12px 8px", marginBottom: 4 }}>
              <span className="card-title">最近案件</span>
              <button className="more" onClick={() => location.hash = "case"}>全部 {stats.cases ?? 0} 件 →</button>
            </div>
            {recent.length === 0 ? (
              <div className="empty-d" style={{ padding: "20px 12px" }}>暂无案件。点击右上「新建案件」开始。</div>
            ) : (
              <table className="table">
                <thead><tr><th>案件</th><th>类型</th><th>阶段</th><th>状态</th></tr></thead>
                <tbody>
                  {recent.map((c) => (
                    <tr key={c.id} style={{ cursor: "pointer" }} onClick={() => location.hash = "case"}>
                      <td>
                        <div className="t-case">
                          {c.title}
                          <small>{c.employee} 诉 {c.employer}{c.city ? ` · ${c.city}` : ""}</small>
                        </div>
                      </td>
                      <td><span className="badge b-accent">劳动仲裁</span></td>
                      <td>
                        <span className="dots8">
                          {STAGE_NAMES.map((_, i) => (
                            <i key={i} className={i < c.stage_index ? "on" : i === c.stage_index ? "cur" : ""} />
                          ))}
                        </span>
                        <small className="muted" style={{ marginLeft: 6 }}>{c.stage}</small>
                      </td>
                      <td><span className="badge b-low">进行中</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16, minHeight: 0 }}>
            <div className="card">
              <div className="card-head">
                <span className="card-title">今日待办</span>
                {todos.length > 0 && <span className="badge b-mid" style={{ marginLeft: "auto" }}>{todos.length} 项</span>}
              </div>
              <div className="todo">
                {todos.length === 0 ? (
                  <div className="empty-d" style={{ padding: "12px 0" }}>暂无待办</div>
                ) : (
                  todos.map((t) => (
                    <div key={t.id} className="todo-item">
                      <label className="check" style={{ paddingTop: 1 }}>
                        <input type="checkbox" aria-label="完成待办" onChange={() => completeTodo(t.id)} />
                      </label>
                      <div className="todo-main">
                        <div className="todo-title">{t.title}</div>
                        <div className="todo-meta"><span>📁 {t.case_title}</span></div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="card" style={{ flex: 1 }}>
              <div className="card-head"><span className="card-title">内核动态</span></div>
              <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 2 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>当前模型</span><b className="mono" style={{ color: "var(--fg-strong)" }}>{model}</b></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>已装载工具</span><b className="mono" style={{ color: "var(--fg-strong)" }}>16 个</b></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>文档材料</span><b className="mono" style={{ color: "var(--fg-strong)" }}>{stats.docs ?? 0} 份</b></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>审查记录</span><b className="mono" style={{ color: "var(--fg-strong)" }}>{stats.reviews ?? 0} 条</b></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
