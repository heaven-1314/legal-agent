import type { AgentTool } from "@earendil-works/pi-agent-core";
import { Type } from "@earendil-works/pi-ai";
import { api } from "../api.js";

const listParams = Type.Object({});
const createParams = Type.Object({
  title: Type.String({ description: "案件名称，如「张某诉某公司劳动争议」" }),
  client_name: Type.Optional(Type.String({ description: "委托人姓名" })),
  notes: Type.Optional(Type.String({ description: "案件备注" })),
});

/** 案件夹（matter）：办案的容器，文档/审查/文书都挂在案件下。 */
export const matterListTool: AgentTool<typeof listParams> = {
  name: "legal_matter_list",
  label: "案件列表",
  description: "列出全部案件夹（含每个案件的文档数）。用户问「有哪些案件/案子」时使用。",
  parameters: listParams,
  async execute() {
    const data = await api("/api/matters");
    return { content: [{ type: "text", text: JSON.stringify(data).slice(0, 4000) }], details: data };
  },
};

export const matterCreateTool: AgentTool<typeof createParams> = {
  name: "legal_matter_create",
  label: "新建案件",
  description: "新建一个案件夹。开始处理新纠纷时先建案件，后续文档和文书都归入该案件。",
  parameters: createParams,
  async execute(_id, p) {
    const data = await api("/api/matters", { method: "POST", body: JSON.stringify(p) });
    return { content: [{ type: "text", text: JSON.stringify(data).slice(0, 2000) }], details: data };
  },
};
