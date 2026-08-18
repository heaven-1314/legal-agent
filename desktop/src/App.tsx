import { useEffect, useState } from "react";
import { bridge, type ChatMessage } from "./bridge.js";
import { ChatView } from "./views/Chat.js";
import { DraftsView } from "./views/Drafts.js";
import { MattersView } from "./views/Matters.js";
import { ReviewView } from "./views/Review.js";
import { SettingsView } from "./views/Settings.js";

type View = "chat" | "matters" | "review" | "drafts" | "settings";

const NAV: { key: View; label: string; hint: string }[] = [
  { key: "chat", label: "对话", hint: "咨询与办案指令" },
  { key: "matters", label: "办案", hint: "案件与仲裁进度" },
  { key: "review", label: "审查", hint: "合同风险审查" },
  { key: "drafts", label: "文书", hint: "模板化起草" },
  { key: "settings", label: "设置", hint: "网关与密钥" },
];

const VIEWS: View[] = ["chat", "matters", "review", "drafts", "settings"];

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
        {view === "chat" && <ChatView messages={messages} busy={busy} ready={ready} onSend={send} onGoSettings={() => setView("settings")} />}
        {view === "matters" && <MattersView />}
        {view === "review" && <ReviewView />}
        {view === "drafts" && <DraftsView />}
        {view === "settings" && <SettingsView onSaved={() => setView("chat")} />}
      </main>
    </div>
  );
}
