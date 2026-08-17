import type { AgentTool } from "@earendil-works/pi-agent-core";
import { Type } from "@earendil-works/pi-ai";
import { api } from "../api.js";

const params = Type.Object({
  document_id: Type.String({ description: "合同文档 ID（先用 legal_document_search 找到）" }),
  checklist_id: Type.Optional(
    Type.String({ description: "审查清单 ID，默认 default-contract" }),
  ),
  matter_id: Type.Optional(Type.String({ description: "归属案件 ID（可选）" })),
});

/** 合同审查：按检查单逐项过合同文本，输出风险点。 */
export const contractReviewTool: AgentTool<typeof params> = {
  name: "legal_contract_review",
  label: "合同审查",
  description:
    "对已上传的合同文档做逐项风险审查（按检查单），输出风险等级与修改建议。用户要「审合同/查风险」时使用。",
  parameters: params,
  async execute(_id, p) {
    const data = await api("/api/review/contract", {
      method: "POST",
      body: JSON.stringify(p),
    });
    return { content: [{ type: "text", text: JSON.stringify(data).slice(0, 8000) }], details: data };
  },
};
