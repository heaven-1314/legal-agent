import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ChatMessage {
  role: "user" | "assistant" | "tool";
  text: string;
}

interface LegalAgentBridge {
  prompt: (text: string) => Promise<void>;
  status: () => Promise<{ agentReady: boolean }>;
  uiReady: () => void;
  onEvent: (cb: (msg: Record<string, any>) => void) => () => void;
}

const bridge: LegalAgentBridge = (window as any).legalAgent;

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [agentReady, setAgentReady] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const off = bridge.onEvent((msg) => {
      if (msg.type === "ready") setAgentReady(true);
      if (msg.type === "assistant") {
        setMessages((m) => [...m, { role: "assistant", text: msg.text }]);
      }
      if (msg.type === "user_echo") {
        setMessages((m) => [...m, { role: "user", text: msg.text }]);
      }
      if (msg.type === "tool_start") {
        setMessages((m) => [...m, { role: "tool", text: `→ ${msg.name}` }]);
      }
      if (msg.type === "error") {
        setMessages((m) => [...m, { role: "assistant", text: `⚠️ ${msg.message}` }]);
      }
      if (msg.type === "agent_end") setBusy(false);
    });
    bridge.status().then((s) => setAgentReady(s.agentReady));
    bridge.uiReady();
    return off;
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setBusy(true);
    setMessages((m) => [...m, { role: "user", text }]);
    await bridge.prompt(text);
  };

  return (
    <div className="app">
      <header className="header">
        <span className="title">法律工作台</span>
        <span className={`dot ${agentReady ? "on" : ""}`} title={agentReady ? "Agent 就绪" : "Agent 启动中"}>
          {agentReady ? "就绪" : "启动中…"}
        </span>
      </header>

      <div className="chat" ref={listRef}>
        {messages.length === 0 && (
          <div className="empty">
            面向中国大陆法律的办案 Agent · 擅长劳动争议与劳动仲裁
            <br />
            试试：「我在北京，试用期被口头辞退，帮我立案」
          </div>
        )}
        {messages.map((m, i) =>
          m.role === "tool" ? (
            <div key={i} className="tool-line">{m.text}</div>
          ) : (
            <div key={i} className={`bubble ${m.role}`}>
              {m.role === "assistant" ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.text}</ReactMarkdown>
              ) : (
                m.text
              )}
            </div>
          ),
        )}
        {busy && <div className="tool-line">思考中…</div>}
      </div>

      <footer className="composer">
        <textarea
          value={input}
          rows={2}
          placeholder="输入法律问题或办案指令…（Enter 发送，Shift+Enter 换行）"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <button onClick={send} disabled={busy || !input.trim()}>
          发送
        </button>
      </footer>
    </div>
  );
}
