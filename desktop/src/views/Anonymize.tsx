import { useState } from "react";
import { Page } from "./Matters.js";

/** 脱敏工具（旧页为占位，此处做最简实现：正则脱敏手机号/身份证/银行卡，纯前端本地处理）。 */
const RULES: { name: string; re: RegExp }[] = [
  { name: "手机号", re: /1[3-9]\d(?=\d{4})\d{4}/g },
  { name: "身份证", re: /\d{6}(?=\d{8}[\dXx])\d{8}[\dXx]/g },
  { name: "银行卡", re: /\b\d{16,19}\b/g },
];

export function anonymize(text: string): string {
  let out = text;
  for (const { re } of RULES) {
    out = out.replace(re, (m) => m.slice(0, 3) + "****" + m.slice(-4));
  }
  return out;
}

export function AnonymizeView() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [copied, setCopied] = useState(false);

  return (
    <Page title="脱敏工具">
      <div className="calc-grid">
        <div className="card">
          <h3>原文</h3>
          <textarea
            className="facts-input"
            rows={12}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="粘贴含手机号/身份证/银行卡号的文本，本地处理不上传"
          />
          <div className="settings-actions">
            <button
              className="btn primary"
              disabled={!input.trim()}
              onClick={() => { setOutput(anonymize(input)); setCopied(false); }}
            >
              脱敏
            </button>
          </div>
        </div>
        <div className="card">
          <h3>脱敏结果</h3>
          <textarea className="facts-input" rows={12} value={output} readOnly placeholder="脱敏后文本" />
          <div className="settings-actions">
            <button
              className="btn"
              disabled={!output}
              onClick={() => { navigator.clipboard.writeText(output); setCopied(true); }}
            >
              {copied ? "已复制" : "复制"}
            </button>
          </div>
        </div>
      </div>
    </Page>
  );
}
