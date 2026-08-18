import { useEffect, useState } from "react";
import { bridge } from "../bridge.js";
import { Page } from "./Matters.js";

interface Stats {
  matters: number | null;
  docs: number | null;
  model: string;
}

const QUICK: { hash: string; icon: string; title: string; desc: string }[] = [
  { hash: "#chat", icon: "💬", title: "智能咨询", desc: "多轮对话分析" },
  { hash: "#calculator", icon: "🧮", title: "赔偿计算", desc: "经济补偿/二倍工资" },
  { hash: "#review", icon: "📋", title: "合同审查", desc: "风险识别+批注" },
  { hash: "#drafts", icon: "📝", title: "文书生成", desc: "仲裁申请书" },
];

export function DashboardView() {
  const [stats, setStats] = useState<Stats>({ matters: null, docs: null, model: "—" });
  const [down, setDown] = useState(false);

  useEffect(() => {
    Promise.all([
      bridge.api<{ items: unknown[] }>({ path: "/api/matters" }),
      bridge.api<{ items: unknown[] }>({ path: "/api/documents" }),
    ]).then(([m, d]) => {
      if (m.ok && d.ok) {
        setStats({ matters: m.data.items.length, docs: d.data.items.length, model: "AI 就绪" });
      } else {
        setDown(true);
      }
    });
  }, []);

  return (
    <Page title="仪表盘">
      <div className="stats">
        <StatCard icon="📁" value={stats.matters} label="进行中案件" />
        <StatCard icon="📄" value={stats.docs} label="文档材料" />
        <StatCard icon="🤖" value={down ? "未连接" : stats.model} label="当前模型" small />
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <h3>快捷操作</h3>
        <div className="qa-grid">
          {QUICK.map((q) => (
            <button key={q.hash} className="qa" onClick={() => (location.hash = q.hash)}>
              <span className="qa-icon">{q.icon}</span>
              <span>
                <span className="qa-t">{q.title}</span>
                <span className="qa-d">{q.desc}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </Page>
  );
}

function StatCard(props: { icon: string; value: number | string | null; label: string; small?: boolean }) {
  return (
    <div className="stat-card">
      <div className="stat-icon">{props.icon}</div>
      <div className={props.small ? "stat-value small" : "stat-value"}>
        {props.value === null ? "…" : props.value}
      </div>
      <div className="stat-label">{props.label}</div>
    </div>
  );
}
