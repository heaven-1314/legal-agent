import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage } from "../bridge.js";

const EXAMPLES = [
  "入职未签合同被辞退",
  "公司拖欠了 3 个月工资",
  "公司单方面调岗降薪",
  "工伤认定流程是什么",
];

export function ChatView(props: {
  messages: ChatMessage[];
  busy: boolean;
  ready: boolean;
  onSend: (text: string) => void;
  onGoSettings: () => void;
}) {
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [props.messages, props.busy]);

  const send = () => {
    const text = input.trim();
    if (!text || props.busy) return;
    setInput("");
    props.onSend(text);
  };

  return (
    <div className="chat">
      <div className="chat-list" ref={listRef}>
        {props.messages.length === 0 && (
          <div className="empty">
            <div className="empty-title">面向中国大陆法律的办案 Agent</div>
            <div className="empty-sub">Pi Agent 内核驱动 · 擅长劳动争议与劳动仲裁 · 支持案件夹、合同审查、文书起草</div>
            <div className="empty-examples">
              {EXAMPLES.map((e) => (
                <button key={e} className="example" onClick={() => setInput(e)}>
                  {e}
                </button>
              ))}
            </div>
            {!props.ready && (
              <div className="setup-tip">
                Agent 未连接——先到
                <button className="link" onClick={props.onGoSettings}>设置</button>
                填写模型网关与 API Key。
              </div>
            )}
          </div>
        )}
        {props.messages.map((m, i) => {
          if (m.role === "tool") return <div key={i} className="tool-line">▸ 调用 {m.text}</div>;
          if (m.role === "error")
            return (
              <div key={i} className="error-card">
                <span>{m.text}</span>
                {m.action === "settings" && (
                  <button className="btn sm" onClick={props.onGoSettings}>去设置</button>
                )}
              </div>
            );
          return (
            <div key={i} className={`bubble ${m.role}`}>
              {m.role === "assistant" ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.text}</ReactMarkdown>
              ) : (
                m.text
              )}
            </div>
          );
        })}
        {props.busy && <div className="busy-line" aria-live="polite">思考中<span className="dots">…</span></div>}
      </div>

      <div className="composer">
        <textarea
          value={input}
          rows={2}
          placeholder="输入法律问题或办案指令（Enter 发送，Shift+Enter 换行）"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <button className="btn primary" onClick={send} disabled={props.busy || !input.trim()}>
          发送
        </button>
      </div>
    </div>
  );
}
