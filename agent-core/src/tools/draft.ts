import type { AgentTool } from "@earendil-works/pi-agent-core";
import { Type } from "@earendil-works/pi-ai";
import { api } from "../api.js";

const templatesParams = Type.Object({});
const createParams = Type.Object({
  template_id: Type.String({ description: "模板 ID（先用 legal_draft_templates 查可用模板）" }),
  facts: Type.String({ description: "案件事实与背景，作为文书生成的素材" }),
  title: Type.Optional(Type.String({ description: "文书标题" })),
  extra: Type.Optional(Type.String({ description: "其他要求（语气、侧重等）" })),
  matter_id: Type.Optional(Type.String({ description: "归属案件 ID（可选）" })),
  source_document_id: Type.Optional(Type.String({ description: "来源文档 ID（可选）" })),
});

export const draftTemplatesTool: AgentTool<typeof templatesParams> = {
  name: "legal_draft_templates",
  label: "文书模板列表",
  description: "查看可用的法律文书模板（起诉状、答辩状、律师函等）。起草前先调用确认模板 ID。",
  parameters: templatesParams,
  async execute() {
    const data = await api("/api/draft/templates");
    return { content: [{ type: "text", text: JSON.stringify(data).slice(0, 3000) }], details: data };
  },
};

export const draftCreateTool: AgentTool<typeof createParams> = {
  name: "legal_draft_create",
  label: "起草文书",
  description: "按模板起草法律文书（基于给定事实生成全文，落库可下载）。",
  parameters: createParams,
  async execute(_id, p) {
    const data = await api("/api/draft", { method: "POST", body: JSON.stringify(p) });
    return { content: [{ type: "text", text: JSON.stringify(data).slice(0, 6000) }], details: data };
  },
};
