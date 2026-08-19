import { useEffect, useState } from "react";
import { bridge, type SettingsView as SettingsData } from "../bridge.js";

export function SettingsView(props: { onModelSaved?: (model: string) => void }) {
  const [s, setS] = useState<SettingsData | null>(null);
  const [keyInput, setKeyInput] = useState("");
  const [baseInput, setBaseInput] = useState("");
  const [models, setModels] = useState<string[] | null>(null);
  const [fetching, setFetching] = useState(false);
  const [fetchErr, setFetchErr] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ai: string; backend: string } | null>(null);

  useEffect(() => {
    bridge.getSettings().then((d) => {
      setS(d);
      setBaseInput(d.aiBase);
    });
  }, []);

  const fetchModels = async () => {
    setFetching(true);
    setFetchErr("");
    setMenuOpen(false);
    const res = await bridge.fetchModels({ aiBase: baseInput, aiKey: keyInput || undefined });
    setFetching(false);
    if (res.ok && res.models?.length) {
      setModels(res.models);
      setMenuOpen(true);
    } else {
      setFetchErr(res.message ?? (res.ok ? "网关未返回任何模型" : "拉取失败"));
    }
  };

  const pickModel = (m: string) => {
    if (s) setS({ ...s, modelId: m });
    setMenuOpen(false);
  };

  const save = async () => {
    if (!s) return;
    await bridge.setSettings({
      backendMode: s.backendMode,
      aiBase: baseInput || s.aiBase,
      aiKey: keyInput || undefined,
      modelId: s.modelId,
      apiBase: s.apiBase,
      apiToken: s.apiToken,
    });
    setSaved(true);
    props.onModelSaved?.(s.modelId);
    setTimeout(() => setSaved(false), 900);
  };

  if (!s) return <div className="pg-body"><div className="empty-d">读取设置…</div></div>;

  return (
    <div className="pg-root">
      <div className="pg-head">
        <div className="grow">
          <h1 className="pg-title">设置</h1>
          <div className="pg-sub">网关 · 内核 · 数据与隐私</div>
        </div>
      </div>
      <div className="pg-body">
        <div className="set-grid">
          <div className="card">
            <div className="set-sec" style={{ marginBottom: "14px" }}>AI 网关配置</div>
            <div className="gw-row">
              <div className="field" style={{ flex: "1", minWidth: "220px" }}>
                <div className="lab">网关地址</div>
                <input
                  className="input"
                  value={baseInput}
                  onChange={(e) => setBaseInput(e.target.value)}
                  placeholder="http://8.152.157.178:5004/v1"
                  spellCheck={false}
                />
              </div>
              <div className="field" style={{ flex: "1", minWidth: "220px" }}>
                <div className="lab">API 密钥{s.aiKeySet && <span className="hint">已配置 {s.aiKey}</span>}</div>
                <input
                  className="input"
                  type="password"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder={s.aiKeySet ? "留空保持不变" : "ah-… 或 sk-…"}
                  spellCheck={false}
                />
              </div>
            </div>

            <div className="gw-row" style={{ marginTop: "12px" }}>
              <div className="dd-wrap" style={{ flex: "1", minWidth: "280px" }}>
                <button
                  className="dd-trigger"
                  aria-haspopup="listbox"
                  aria-expanded={menuOpen}
                  onClick={() => models && setMenuOpen(!menuOpen)}
                >
                  <span className="lbl">推理模型</span>
                  <span className="val">{s.modelId}</span>
                  <svg className="ic chev" style={{ width: "13px", height: "13px" }}><use href="#i-chev" /></svg>
                </button>
                {menuOpen && models && (
                  <div className="dd-menu open" role="listbox">
                    <div className="dd-menu-h">可用模型 · {models.length} 个（来自网关）</div>
                    {models.map((m) => (
                      <button
                        key={m}
                        className={`dd-item ${m === s.modelId ? "on" : ""}`}
                        role="option"
                        aria-selected={m === s.modelId}
                        onClick={() => pickModel(m)}
                      >
                        <span className="mname">{m}</span>
                        <svg className="ic"><use href="#i-check" /></svg>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button className="btn primary" style={{ height: "36px" }} onClick={fetchModels} disabled={fetching}>
                {fetching && <span className="spin"></span>}
                <svg className="ic"><use href="#i-refresh" /></svg>
                <span>{fetching ? "拉取中…" : "获取模型"}</span>
              </button>
            </div>

            {fetchErr && (
              <div className="banner-error show" style={{ marginTop: "12px" }}>
                <svg className="ic"><use href="#i-alert" /></svg>
                <span><b>拉取失败</b>　{fetchErr}</span>
                <button className="btn outline sm" style={{ marginLeft: "auto", flex: "none" }} onClick={fetchModels}>重试</button>
              </div>
            )}

            <div className="form-row" style={{ marginTop: "12px" }}>
              <span className="lbl">数据存储 <span className="hint">案件、文档、待办存在哪里</span></span>
              <div className="mode-toggle">
                <button className={`mode-btn ${s.backendMode !== "remote" ? "on" : ""}`} onClick={() => setS({ ...s, backendMode: "local" })}>本机存储（推荐）</button>
                <button className={`mode-btn ${s.backendMode === "remote" ? "on" : ""}`} onClick={() => setS({ ...s, backendMode: "remote" })}>团队服务器</button>
              </div>
              <div className="hint" style={{ marginTop: 4 }}>
                {s.backendMode !== "remote"
                  ? "数据保存在本机 ~/.legal-workbench/，无需任何配置"
                  : "连接团队共享的后端服务器（仅团队协作场景需要）"}
              </div>
            </div>
            {s.backendMode === "remote" && (
              <div className="field">
                <div className="lab">远程后端地址</div>
                <input className="input" value={s.apiBase} onChange={(e) => setS({ ...s, apiBase: e.target.value })} spellCheck={false} />
              </div>
            )}

            <div className="form-actions">
              <button className="btn outline" onClick={async () => { setTesting(true); setTestResult(await bridge.testConnection()); setTesting(false); }} disabled={testing}>
                {testing ? "诊断中…" : "测试连接"}
              </button>
              <button className="btn primary" onClick={save} disabled={saved}>{saved ? "已保存，重启内核…" : "保存设置"}</button>
            </div>

            {testResult && (
              <div className="diag" style={{ marginTop: "12px" }}>
                <div className="diag-row"><span className={`diag-ic ${testResult.ai.includes("✓") ? "ok" : "err"}`}><svg className="ic"><use href={testResult.ai.includes("✓") ? "#i-check" : "#i-alert"} /></svg></span><span className="diag-name">AI 网关</span><span className="diag-ms">{testResult.ai}</span></div>
                <div className="diag-row"><span className={`diag-ic ${testResult.backend.includes("✓") ? "ok" : "err"}`}><svg className="ic"><use href={testResult.backend.includes("✓") ? "#i-check" : "#i-alert"} /></svg></span><span className="diag-name">工具后端</span><span className="diag-ms">{testResult.backend}</span></div>
              </div>
            )}
          </div>

          <div className="card">
            <div className="set-sec" style={{ marginBottom: "14px" }}>Agent 内核信息</div>
            <div className="hint" style={{ marginBottom: 10 }}>应用版本 <b style={{ color: "var(--accent)" }}>v0.4.2</b></div>
            <div className="kv">
              <div className="cell"><div className="k">Agent 内核</div><div className="v mono">Pi agent-core 0.84.2</div></div>
              <div className="cell"><div className="k">当前模型</div><div className="v">{s.modelId}</div></div>
              <div className="cell"><div className="k">已装载工具</div><div className="v">16 个</div></div>
              <div className="cell"><div className="k">数据位置</div><div className="v mono">{s.backendMode === "local" ? "本机 ~/.legal-workbench" : s.apiBase}</div></div>
            </div>
            <div className="toolgroups">
              <div className="tg"><b>咨询 <span className="n">×1</span></b><span>法律咨询</span></div>
              <div className="tg"><b>案件 <span className="n">×9</span></b><span>案件夹 · 劳动仲裁进度 · 待办 · 地区规则</span></div>
              <div className="tg"><b>审查 <span className="n">×1</span></b><span>合同风险审查</span></div>
              <div className="tg"><b>文书 <span className="n">×2</span></b><span>模板 · 起草</span></div>
              <div className="tg"><b>阅卷 <span className="n">×2</span></b><span>单文档 · 多文档</span></div>
              <div className="tg"><b>检索 <span className="n">×1</span></b><span>文档搜索</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
