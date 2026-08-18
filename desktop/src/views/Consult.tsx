import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage } from "../bridge.js";

const EXAMPLES = ["入职未签合同被辞退", "公司拖欠了 3 个月工资", "公司单方面调岗降薪", "工伤认定流程是什么"];

export function ConsultView(props: {
  messages: ChatMessage[];
  busy: boolean;
  ready: boolean;
  onSend: (text: string) => void;
  onGoSettings: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight });
  }, [props.messages, props.busy]);

  return (
    <div className="pg-root">
      <div className="pg-head">
        <div className="grow">
          <h1 className="pg-title">智能咨询</h1>
          <div className="pg-sub">Pi Agent 内核驱动 · 多轮对话 · 自动调用 16 个办案工具</div>
        </div>
        <span className={`badge ${props.ready ? "b-low" : "b-mid"}`}>{props.ready ? "内核就绪" : "未就绪"}</span>
      </div>
      <div className="pg-body">
        <div className="chat-wrap">
          <div className="chat-scroll" ref={ref}>
            {props.messages.length === 0 && (
              <div className="chat-hero">
                <div className="hero-mark">律</div>
                <div className="hero-t">您好，我是法律智能助手</div>
                <p className="hero-d">描述您的情况，我会分析权益、匹配法条，并在需要时自动调用办案工具（立案 / 审查 / 文书 / 阅卷）。</p>
                <div className="hero-ex">
                  {EXAMPLES.map((e) => (
                    <button key={e} className="ex-chip" onClick={() => props.onSend(e)}>{e}</button>
                  ))}
                </div>
                {!props.ready && (
                  <p className="hero-warn">
                    Agent 未连接——先到
                    <button className="linkish" onClick={props.onGoSettings}>设置</button>
                    填写网关地址与 API Key。
                  </p>
                )}
              </div>
            )}
            {props.messages.map((m, i) =>
              m.role === "tool" ? (
                <div key={i} className="tool-trace">
                  <svg className="ic"><use href="#i-scan" /></svg>
                  <span>调用工具</span><b>{m.text}</b><span className="tstat ok">完成</span>
                </div>
              ) : m.role === "error" ? (
                <div key={i} className="banner-error show">
                  <svg className="ic"><use href="#i-alert" /></svg>
                  <span>{m.text}</span>
                  {m.action === "settings" && <button className="btn outline sm" style={{ marginLeft: "auto", flex: "none" }} onClick={props.onGoSettings}>去设置</button>}
                </div>
              ) : (
                <div key={i} className={`msg ${m.role === "user" ? "u" : "a"}`}>
                  <div className="ava">{m.role === "user" ? "我" : "律"}</div>
                  <div className="bubble">
                    {m.role === "assistant" ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.text}</ReactMarkdown> : m.text}
                  </div>
                </div>
              ),
            )}
            {props.busy && (
              <div className="msg a">
                <div className="ava">律</div>
                <div className="bubble thinking"><span></span><span></span><span></span></div>
              </div>
            )}
          </div>
          <Composer busy={props.busy} onSend={props.onSend} />
        </div>
      </div>
    </div>
  );
}

function Composer(props: { busy: boolean; onSend: (t: string) => void }) {
  const [text, setText] = useState("");
  const send = () => {
    const t = text.trim();
    if (!t || props.busy) return;
    setText("");
    props.onSend(t);
  };
  return (
    <div className="chat-input">
      <textarea
        className="textarea"
        rows={1}
        value={text}
        placeholder="输入法律问题…（Enter 发送，Shift+Enter 换行）"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
          }
        }}
      />
      <button className="btn primary send" onClick={send} disabled={props.busy || !text.trim()}>
        <svg className="ic"><use href="#i-send" /></svg>发送
      </button>
    </div>
  );
}
