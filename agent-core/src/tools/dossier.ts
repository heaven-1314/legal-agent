import type { AgentTool } from "@earendil-works/pi-agent-core";
import { Type } from "@earendil-works/pi-ai";
import { api } from "../api.js";

const readParams = Type.Object({
  document_id: Type.String({ description: "文档 ID（先用 legal_document_search 找到）" }),
  question: Type.Optional(
    Type.String({ description: "针对文档的阅卷问题（不填则做整体摘要）" }),
  ),
  matter_id: Type.Optional(Type.String({ description: "归属案件 ID（可选）" })),
});
const batchParams = Type.Object({
  document_ids: Type.Array(Type.String(), { description: "文档 ID 列表（至少 1 个）" }),
  question: Type.Optional(Type.String({ description: "跨文档的阅卷问题" })),
  matter_id: Type.Optional(Type.String({ description: "归属案件 ID（可选）" })),
});

export const dossierReadTool: AgentTool<typeof readParams> = {
  name: "legal_dossier_read",
  label: "阅卷（单文档）",
  description: "阅读单个案件文档并回答问题或做摘要。用户说「看看这份材料/判决书讲了什么」时使用。",
  parameters: readParams,
  async execute(_id, p) {
    const data = await api("/api/dossier/read", { method: "POST", body: JSON.stringify(p) });
    return { content: [{ type: "text", text: JSON.stringify(data).slice(0, 6000) }], details: data };
  },
};

export const dossierReadBatchTool: AgentTool<typeof batchParams> = {
  name: "legal_dossier_read_batch",
  label: "阅卷（多文档）",
  description: "合并阅读多份文档并回答跨文档问题（事实梳理、时间线、矛盾点）。",
  parameters: batchParams,
  async execute(_id, p) {
    const data = await api("/api/dossier/read-batch", { method: "POST", body: JSON.stringify(p) });
    return { content: [{ type: "text", text: JSON.stringify(data).slice(0, 8000) }], details: data };
  },
};
