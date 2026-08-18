import { Page } from "./Matters.js";

/** 多平台 AI 对比（移植旧页静态对比卡，数据来源 Web Lawyer 社区测试）。 */
const ITEMS = [
  { icon: "🟢", name: "Codex (GPT)", score: "5.0", note: "条款修订最细最专业。Agent 执行力最强。" },
  { icon: "🔵", name: "WorkBuddy (GLM)", score: "4.2", note: "法律逻辑清晰。Plan 模式先拆解再执行。" },
  { icon: "🟠", name: "Trae (豆包)", score: "3.5", note: "免费版可用，Skill 调用正常。" },
  { icon: "🟡", name: "Kimi Work", score: "3.0", note: "检索能力有提升，法律分析偏浅。" },
];

export function CompareView() {
  return (
    <Page title="多平台 AI 对比">
      <div className="loading" style={{ padding: "0 0 14px" }}>基于 Web Lawyer 社区测试数据 · 合同审查场景</div>
      <div className="compare-grid">
        {ITEMS.map((it) => (
          <div key={it.name} className="card compare-card">
            <div className="compare-head">{it.icon} {it.name}</div>
            <div className="compare-score">{it.score}</div>
            <div className="compare-note">{it.note}</div>
          </div>
        ))}
      </div>
    </Page>
  );
}
