import { useEffect, useState } from "react";
import { bridge, type SettingsView } from "../bridge.js";

export function SettingsView(props: { onSaved: () => void }) {
  const [s, setS] = useState<SettingsView | null>(null);
  const [keyInput, setKeyInput] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    bridge.getSettings().then(setS);
  }, []);

  if (!s) return <div className="settings"><div className="empty-sub">读取设置…</div></div>;

  const save = async () => {
    await bridge.setSettings({
      aiBase: s.aiBase,
      aiKey: keyInput || undefined,
      modelId: s.modelId,
      apiBase: s.apiBase,
      apiToken: s.apiToken,
    });
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      props.onSaved();
    }, 900);
  };

  return (
    <div className="settings">
      <h2>连接设置</h2>
      <p className="settings-lead">Agent 通过 OpenAI 兼容网关调用模型。保存后会自动重启 Agent。</p>

      <label className="field">
        <span className="field-label">模型网关地址</span>
        <input
          value={s.aiBase}
          onChange={(e) => setS({ ...s, aiBase: e.target.value })}
          placeholder="http://127.0.0.1:5004/v1"
          spellCheck={false}
        />
      </label>

      <label className="field">
        <span className="field-label">API Key {s.aiKeySet && <em className="field-note">已配置 {s.aiKey}</em>}</span>
        <input
          type="password"
          value={keyInput}
          onChange={(e) => setKeyInput(e.target.value)}
          placeholder={s.aiKeySet ? "留空保持不变" : "ah-… 或 sk-…"}
          spellCheck={false}
        />
      </label>

      <label className="field">
        <span className="field-label">模型名</span>
        <input
          value={s.modelId}
          onChange={(e) => setS({ ...s, modelId: e.target.value })}
          spellCheck={false}
        />
      </label>

      <label className="field">
        <span className="field-label">工具后端（案件/文档/审查）</span>
        <div className="mode-toggle">
          <button
            className={`mode-btn ${s.backendMode !== "remote" ? "on" : ""}`}
            onClick={() => setS({ ...s, backendMode: "local" })}
          >
            本地内置服务（推荐）
          </button>
          <button
            className={`mode-btn ${s.backendMode === "remote" ? "on" : ""}`}
            onClick={() => setS({ ...s, backendMode: "remote" })}
          >
            连接远程后端
          </button>
        </div>
      </label>

      {s.backendMode === "remote" && (
        <label className="field">
          <span className="field-label">远程后端地址</span>
          <input
            value={s.apiBase}
            onChange={(e) => setS({ ...s, apiBase: e.target.value })}
            placeholder="http://127.0.0.1:8091"
            spellCheck={false}
          />
        </label>
      )}

      <div className="settings-actions">
        <button className="btn primary" onClick={save} disabled={saved}>
          {saved ? "已保存，正在重启 Agent…" : "保存并重启"}
        </button>
      </div>
    </div>
  );
}
