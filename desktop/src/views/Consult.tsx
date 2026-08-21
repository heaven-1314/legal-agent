import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage } from "../bridge.js";
import { UploadButton } from "./UploadButton.js";

const EXAMPLES = ["入职未签合同被辞退", "公司拖欠了 3 个月工资", "公司单方面调岗降薪", "工伤认定流程是什么"];

interface Session {
  id: string;
  title: string;
  messages: ChatMessage[];
  updated_at: string;
}

function loadSessions(): Session[] {
  try {
    const raw = localStorage.getItem("legal-consult-sessions");
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveSessions(sessions: Session[]) {
  try { localStorage.setItem("legal-consult-sessions", JSON.stringify(sessions)); } catch {}
}

export function ConsultView(props: {
  messages: ChatMessage[];
  busy: boolean;
  ready: boolean;
  onSend: (text: string) => void;
  onGoSettings: () => void;
  onNewSession?: () => void;
  onLoadSession?: (messages: ChatMessage[]) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<string | null>(null);

  useEffect(() => { setSessions(loadSessions()); }, []);

  // 消息变化时自动保存
  useEffect(() => {
    if (props.messages.length > 0) {
      const title = props.messages.find(m => m.role === "user")?.text.slice(0, 30) || "新会话";
      const existing = sessions.find(s => s.id === activeSession);
      if (existing) {
        existing.messages = props.messages;
        existing.updated_at = new Date().toISOString();
      } else {
        const newSession: Session = {
          id: Date.now().toString(36),
          title, messages: props.messages, updated_at: new Date().toISOString(),
        };
        sessions.unshift(newSession);
        setActiveSession(newSession.id);
      }
      saveSessions([...sessions]);
    }
  }, [props.messages]);

  const newSession = () => {
    setActiveSession(null);
    // 需要通知 App 清空消息
    if (props.onNewSession) props.onNewSession();
  };

  const switchSession = (session: Session) => {
    setActiveSession(session.id);
    if (props.onLoadSession) props.onLoadSession(session.messages);
  };

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
        <div style={{ display: "flex", gap: 12, flex: 1, minHeight: 0 }}>
        <div className="card" style={{ width: 180, flex: "none", overflowY: "auto", alignSelf: "stretch", padding: "8px 6px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 6, padding: "0 6px" }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>历史会话</span>
            <button className="btn ghost sm" style={{ marginLeft: "auto", padding: "2px 6px" }} onClick={newSession} title="新会话">
              <svg className="ic" style={{ width: 12, height: 12 }}><use href="#i-plus" /></svg>
            </button>
          </div>
          {sessions.length === 0 && <div className="hint" style={{ padding: "0 6px", fontSize: 11 }}>暂无历史</div>}
          {sessions.map((s) => (
            <button key={s.id} className={`btn ${activeSession === s.id ? "primary" : "ghost"}`}
              style={{ width: "100%", justifyContent: "flex-start", marginBottom: 2, fontSize: 11.5, padding: "4px 8px", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}
              onClick={() => switchSession(s)} title={s.title}>
              {s.title}
            </button>
          ))}
        </div>
        <div className="chat-wrap" style={{ flex: 1 }}>
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
                    {m.actionCards && m.actionCards.length > 0 && (
                      <div className="action-cards-grid" style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                        {m.actionCards.map((card, cidx) => (
                          <div
                            key={cidx}
                            className="card action-card"
                            style={{
                              padding: "10px 14px",
                              background: "var(--surface-2)",
                              border: "1px solid var(--accent-line)",
                              borderRadius: "var(--r-md)",
                            }}
                          >
                            {card.type === "case_created" && (
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                                <div>
                                  <div style={{ fontWeight: 600, color: "var(--accent-deep)", fontSize: 13 }}>
                                    📁 已自动建立办案档案：{card.title}
                                  </div>
                                  <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>
                                    单位：{card.employer} · 阶段：{card.stage} {card.dispute_amount ? `· 涉及金额 ${card.dispute_amount}` : ""}
                                  </div>
                                </div>
                                <button
                                  className="btn primary sm"
                                  onClick={() => {
                                    location.hash = "case";
                                  }}
                                >
                                  查看案件详情 →
                                </button>
                              </div>
                            )}

                            {card.type === "contract_review" && (
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                                <div>
                                  <div style={{ fontWeight: 600, color: "var(--accent-deep)", fontSize: 13 }}>
                                    📄 {card.title}
                                  </div>
                                  <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>
                                    {card.hint}
                                  </div>
                                </div>
                                <button
                                  className="btn outline sm"
                                  onClick={() => {
                                    location.hash = "contract";
                                  }}
                                >
                                  去审查合同 →
                                </button>
                              </div>
                            )}

                            {card.type === "draft_suggest" && (
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                                <div>
                                  <div style={{ fontWeight: 600, color: "var(--accent-deep)", fontSize: 13 }}>
                                    📝 推荐文书：{card.template}
                                  </div>
                                  <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>
                                    基于当前案情一键填充起草格式并生成 Word
                                  </div>
                                </div>
                                <button
                                  className="btn outline sm"
                                  onClick={() => {
                                    location.hash = "docgen";
                                  }}
                                >
                                  一键起草 →
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
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
      <UploadButton onUploaded={() => {}} label="" />
      <button className="btn primary send" onClick={send} disabled={props.busy || !text.trim()}>
        <svg className="ic"><use href="#i-send" /></svg>发送
      </button>
    </div>
  );
}
