import { useEffect, useState } from "react";
import { bridge, type ChatMessage } from "./bridge.js";
import { AnonymizeView } from "./views/Anonymize.js";
import { CalculatorView } from "./views/Calculator.js";
import { ChatView } from "./views/Chat.js";
import { CompareView } from "./views/Compare.js";
import { DashboardView } from "./views/Dashboard.js";
import { DraftsView } from "./views/Drafts.js";
import { DueDiligenceView } from "./views/DueDiligence.js";
import { EvidenceView } from "./views/Evidence.js";
import { KnowledgeView } from "./views/Knowledge.js";
import { MattersView } from "./views/Matters.js";
import { ResearchView } from "./views/Research.js";
import { ReviewView } from "./views/Review.js";
import { SettingsView } from "./views/Settings.js";

type View =
  | "dashboard" | "chat" | "research" | "review" | "calculator" | "drafts"
  | "evidence" | "dd" | "knowledge" | "anonymize" | "compare" | "matters" | "settings";

/** 侧栏按旧 Web 页 12 模块顺序 + 设置。 */
const NAV: { key: View; label: string; hint: string }[] = [
  { key: "dashboard", label: "仪表盘", hint: "总览与快捷入口" },
  { key: "chat", label: "智能咨询", hint: "Agent 多轮对话" },
  { key: "research", label: "法律检索", hint: "材料全文检索" },
  { key: "review", label: "合同审查", hint: "风险识别+批注" },
  { key: "calculator", label: "赔偿计算器", hint: "经济补偿/二倍工资" },
  { key: "drafts", label: "文书生成", hint: "模板化起草" },
  { key: "evidence", label: "证据指引", hint: "按主张类型" },
  { key: "dd", label: "尽职调查", hint: "AI 阅卷提炼" },
  { key: "knowledge", label: "知识库", hint: "核心法条" },
  { key: "anonymize", label: "脱敏工具", hint: "本地处理" },
  { key: "compare", label: "多平台对比", hint: "AI 能力横评" },
  { key: "matters", label: "案件管理", hint: "案件夹+仲裁进度" },
  { key: "settings", label: "设置", hint: "网关与密钥" },
];

const VIEWS: View[] = [
  "dashboard", "chat", "research", "review", "calculator", "drafts",
  "evidence", "dd", "knowledge", "anonymize", "compare", "matters", "settings",
];

export default function App() {
  const [view, setView] = useState<View>(() => {
    const h = (location.hash || "").replace("#", "");
    return (VIEWS.includes(h as View) ? h : "chat") as View;
  });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [needSetup, setNeedSetup] = useState(false);

  useEffect(() => {
    const onHash = () => {
      const h = (location.hash || "").replace("#", "");
      if (VIEWS.includes(h as View)) setView(h as View);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    const off = bridge.onEvent((msg) => {
      if (msg.type === "agent_status") {
        setReady(Boolean(msg.ready));
        setNeedSetup(!msg.ready);
      }
      if (msg.type === "assistant") {
        setMessages((m) => [...m, { role: "assistant", text: String(msg.text) }]);
      }
      if (msg.type === "user_echo") {
        setMessages((m) => [...m, { role: "user", text: String(msg.text) }]);
      }
      if (msg.type === "tool_start") {
        setMessages((m) => [...m, { role: "tool", text: String(msg.name) }]);
      }
      if (msg.type === "agent_end") {
        setBusy(false);
        setNeedSetup(false);
      }
      if (msg.type === "error") {
        setBusy(false);
        if (msg.fatal) {
          setReady(false);
          setNeedSetup(true);
        }
        setMessages((m) => [
          ...m,
          { role: "error", text: String(msg.message), action: msg.fatal ? "settings" : undefined },
        ]);
      }
    });
    bridge.uiReady();
    return off;
  }, []);

  const send = async (text: string) => {
    if (!text.trim() || busy) return;
    setNeedSetup(false);
    setBusy(true);
    setMessages((m) => [...m, { role: "user", text }]);
    await bridge.prompt(text);
  };

  const statusLabel = ready ? "就绪" : needSetup ? "未配置" : "连接中";

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">
          <div className="brand-name">法律工作台</div>
          <div className="brand-sub">LEGAL WORKBENCH</div>
        </div>
        <nav className="nav">
          {NAV.map((n) => (
            <button
              key={n.key}
              className={`nav-item ${view === n.key ? "active" : ""}`}
              onClick={() => setView(n.key)}
            >
              <span className="nav-label">{n.label}</span>
              <span className="nav-hint">{n.hint}</span>
            </button>
          ))}
        </nav>
        <div className={`side-status ${ready ? "ok" : "warn"}`}>
          <span className="dot" />
          {statusLabel}
        </div>
      </aside>
      <main className="main">
        {view === "dashboard" && <DashboardView />}
        {view === "chat" && <ChatView messages={messages} busy={busy} ready={ready} onSend={send} onGoSettings={() => setView("settings")} />}
        {view === "research" && <ResearchView />}
        {view === "review" && <ReviewView />}
        {view === "calculator" && <CalculatorView />}
        {view === "drafts" && <DraftsView />}
        {view === "evidence" && <EvidenceView />}
        {view === "dd" && <DueDiligenceView />}
        {view === "knowledge" && <KnowledgeView />}
        {view === "anonymize" && <AnonymizeView />}
        {view === "compare" && <CompareView />}
        {view === "matters" && <MattersView />}
        {view === "settings" && <SettingsView onSaved={() => setView("chat")} />}
      </main>
    </div>
  );
}
