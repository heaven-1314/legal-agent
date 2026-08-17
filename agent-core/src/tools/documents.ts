import type { AgentTool } from "@earendil-works/pi-agent-core";
import { Type } from "@earendil-works/pi-ai";
import { api } from "../api.js";

const searchParams = Type.Object({
  q: Type.String({ description: "搜索关键词（子串匹配文件名和内容）" }),
  limit: Type.Optional(Type.Number({ description: "返回条数上限，默认 10" })),
});
const listParams = Type.Object({});

export const documentSearchTool: AgentTool<typeof searchParams> = {
  name: "legal_document_search",
  label: "搜文档",
  description: "按关键词搜索已上传的案件文档（合同、判决书、证据等），返回文档 ID 和摘要。",
  parameters: searchParams,
  async execute(_id, p) {
    const limit = p.limit ?? 10;
    const data = await api(
      `/api/documents/search?q=${encodeURIComponent(p.q)}&limit=${limit}`,
    );
    return { content: [{ type: "text", text: JSON.stringify(data).slice(0, 4000) }], details: data };
  },
};

export const documentListTool: AgentTool<typeof listParams> = {
  name: "legal_document_list",
  label: "文档列表",
  description: "列出已上传的全部文档。用户问「传了哪些文件/文档」时使用。",
  parameters: listParams,
  async execute() {
    const data = await api("/api/documents");
    return { content: [{ type: "text", text: JSON.stringify(data).slice(0, 4000) }], details: data };
  },
};
