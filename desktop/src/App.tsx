import { useEffect, useState } from "react";
import { bridge, type ChatMessage } from "./bridge.js";
import { AnonymizeView } from "./views/Anonymize.js";
import { CalculatorView } from "./views/Calculator.js";
import { CompanyQueryView } from "./views/CompanyQuery.js";
import { CaseView } from "./views/Case.js";
import { ConsultView } from "./views/Consult.js";
import { ContractView } from "./views/Contract.js";
import { DashboardView } from "./views/Dashboard.js";
import { DraftsView } from "./views/Drafts.js";
import { DueDiligenceView } from "./views/DueDiligence.js";
import { EvidenceView } from "./views/Evidence.js";
import { KnowledgeView } from "./views/Knowledge.js";
import { ResearchView } from "./views/Research.js";
import { SettingsView } from "./views/Settings.js";

type View =
  | "dashboard" | "consult" | "case" | "contract" | "docgen" | "dd"
  | "research" | "calc" | "mask" | "evidence" | "kb" | "company" | "settings";

/** 侧栏四组（对照 reference-v1；多平台对比已移除）。 */
const NAV: { cap: string; items: { key: View; label: string; icon: string }[] }[] = [
  { cap: "工作台", items: [
    { key: "dashboard", label: "仪表盘", icon: "i-grid" },
    { key: "consult", label: "智能咨询", icon: "i-chat" },
  ]},
  { cap: "办案", items: [
    { key: "case", label: "案件管理", icon: "i-folder" },
    { key: "contract", label: "合同审查", icon: "i-contract" },
    { key: "docgen", label: "文书生成", icon: "i-pen" },
    { key: "dd", label: "尽职调查", icon: "i-scan" },
    { key: "research", label: "法律检索", icon: "i-search" },
    { key: "company", label: "企业查询", icon: "i-search" },
  ]},
  { cap: "工具", items: [
    { key: "calc", label: "赔偿计算器", icon: "i-calc" },
    { key: "mask", label: "脱敏工具", icon: "i-shield" },
  ]},
  { cap: "参考", items: [
    { key: "evidence", label: "证据指引", icon: "i-list" },
    { key: "kb", label: "知识库", icon: "i-book" },
  ]},
];

const VIEWS: View[] = [...NAV.flatMap((g) => g.items.map((i) => i.key)), "settings"];

export default function App() {
  const [view, setView] = useState<View>(() => {
    const h = (location.hash || "").replace("#", "");
    return (VIEWS.includes(h as View) ? h : "dashboard") as View;
  });
  const [ready, setReady] = useState(false);
  const [model, setModel] = useState("…");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);

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
        if (msg.model) setModel(String(msg.model));
      }
      if (msg.type === "assistant") setMessages((m) => [...m, { role: "assistant", text: String(msg.text) }]);
      if (msg.type === "user_echo") setMessages((m) => [...m, { role: "user", text: String(msg.text) }]);
      if (msg.type === "tool_start") setMessages((m) => [...m, { role: "tool", text: String(msg.name) }]);
      if (msg.type === "agent_end") setBusy(false);
      if (msg.type === "error") {
        setBusy(false);
        setMessages((m) => [...m, { role: "error", text: String(msg.message), action: msg.fatal ? "settings" : undefined }]);
      }
    });
    bridge.uiReady();
    return off;
  }, []);

  const send = async (text: string) => {
    if (!text.trim() || busy) return;
    setBusy(true);
    setMessages((m) => [...m, { role: "user", text }]);
    await bridge.prompt(text);
  };

  const nav = (v: View) => {
    setView(v);
    location.hash = v;
  };

  return (
    <div id="desk">
      <div id="stage">
        <div id="shell">
          <nav className="sb" aria-label="主导航">
            {NAV.map((g) => (
              <div key={g.cap} className="sb-group">
                <div className="sb-cap">{g.cap}</div>
                {g.items.map((it) => (
                  <button
                    key={it.key}
                    className={`sb-item ${view === it.key ? "active" : ""}`}
                    onClick={() => nav(it.key)}
                  >
                    <svg className="ic"><use href={`#${it.icon}`} /></svg>
                    {it.label}
                  </button>
                ))}
              </div>
            ))}
            <div className="sb-spacer"></div>
            <div
              className="kernel"
              role="button"
              tabIndex={0}
              onClick={() => nav("settings")}
              onKeyDown={(e) => e.key === "Enter" && nav("settings")}
            >
              <div className="kernel-top">
                <span className={`kdot ${ready ? "" : "off"}`}></span>
                Pi 内核 · {ready ? "运行中" : "未就绪"}
                <span className="ver">v1.4.2</span>
              </div>
              <div className="kernel-meta">
                <span>模型 <b>{model}</b></span>
                <span>工具 <b>16/16</b></span>
              </div>
            </div>
            <button className={`sb-item sb-settings ${view === "settings" ? "active" : ""}`} onClick={() => nav("settings")}>
              <svg className="ic"><use href="#i-sliders" /></svg>设置
            </button>
          </nav>
          <div className="main">
            <div key={view} className="page show page-enter">
              {view === "dashboard" && <DashboardView />}
              {view === "consult" && <ConsultView messages={messages} busy={busy} ready={ready} onSend={send} onGoSettings={() => nav("settings")} onNewSession={() => setMessages([])} onLoadSession={(msgs) => setMessages(msgs)} />}
              {view === "case" && <CaseView />}
              {view === "contract" && <ContractView />}
              {view === "docgen" && <DraftsView />}
              {view === "dd" && <DueDiligenceView />}
              {view === "research" && <ResearchView />}
              {view === "company" && <CompanyQueryView />}
              {view === "calc" && <CalculatorView />}
              {view === "mask" && <AnonymizeView />}
              {view === "evidence" && <EvidenceView />}
              {view === "kb" && <KnowledgeView />}
              {view === "settings" && <SettingsView onModelSaved={(m) => setModel(m)} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
