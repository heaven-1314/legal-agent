import type { AgentTool } from "@earendil-works/pi-agent-core";
import { Type } from "@earendil-works/pi-ai";
import { api } from "../api.js";

const searchParams = Type.Object({
  q: Type.Optional(Type.String({ description: "搜索关键词，如「违法解除」、「二倍工资」、「竞业限制」" })),
  category: Type.Optional(Type.String({ description: "分类：劳动合同法 / 劳动法 / 民法典" })),
});

const casesParams = Type.Object({
  q: Type.Optional(Type.String({ description: "案例关键词，如「试用期解除」" })),
});

/** 法律法规数据库检索 */
export const lawSearchTool: AgentTool<typeof searchParams> = {
  name: "legal_law_search",
  label: "法条库检索",
  description: "检索国家法律法规条文（包含《劳动合同法》《劳动法》《民法典》等130+法条及实务解读）。在需要引用精确法条编号及法条原文时使用。",
  parameters: searchParams,
  async execute(_id, p) {
    const params = new URLSearchParams();
    if (p.q) params.set("q", p.q);
    if (p.category) params.set("category", p.category);
    const qs = params.toString() ? `?${params.toString()}` : "";
    const data = await api(`/api/laws${qs}`);
    return {
      content: [{ type: "text", text: JSON.stringify(data).slice(0, 4000) }],
      details: data,
    };
  },
};

/** 典型案例库检索 */
export const lawCasesTool: AgentTool<typeof casesParams> = {
  name: "legal_case_precedents",
  label: "类案库检索",
  description: "检索典型法律判例、争议焦点与仲裁/法院裁判思路要旨。辅助分析案件胜诉率与主张支持倾向时使用。",
  parameters: casesParams,
  async execute() {
    const data = await api("/api/laws/cases");
    return {
      content: [{ type: "text", text: JSON.stringify(data).slice(0, 4000) }],
      details: data,
    };
  },
};
