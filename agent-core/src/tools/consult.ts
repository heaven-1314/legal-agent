import type { AgentTool } from "@earendil-works/pi-agent-core";
import { Type } from "@earendil-works/pi-ai";
import { api } from "../api.js";

const params = Type.Object({
  question: Type.String({ description: "用户的法律问题原文" }),
});

/** 法律咨询：调 FastAPI /api/consult（系统提示词+历史由后端管理，结果落库）。 */
export const consultTool: AgentTool<typeof params> = {
  name: "legal_consult",
  label: "法律咨询",
  description:
    "回答一般法律咨询问题（基于中国大陆现行法律，带免责声明）。用户直接提出法律疑问时使用。",
  parameters: params,
  async execute(_toolCallId, p) {
    const data = await api<{ reply?: string; id?: string }>("/api/consult", {
      method: "POST",
      body: JSON.stringify({ question: p.question }),
    });
    const text =
      data.reply ??
      (typeof data === "string" ? data : JSON.stringify(data).slice(0, 2000));
    return { content: [{ type: "text", text }], details: data };
  },
};
