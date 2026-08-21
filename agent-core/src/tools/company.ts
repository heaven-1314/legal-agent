import type { AgentTool } from "@earendil-works/pi-agent-core";
import { Type } from "@earendil-works/pi-ai";
import { api } from "../api.js";

const queryParams = Type.Object({
  keyword: Type.String({ description: "企业全称、简称或统一社会信用代码" }),
});

/** 企业工商信息查询（天眼查数据源） */
export const companyQueryTool: AgentTool<typeof queryParams> = {
  name: "legal_company_query",
  label: "企业工商查询",
  description: "查询企业工商登记公开信息，包括公司法定代表人、注册资本、成立日期、经营状态、统一社会信用代码、注册地址、经营范围等。核验对方当事人主体资格、确认适格被告时使用。",
  parameters: queryParams,
  async execute(_id, p) {
    const data = await api("/api/company/query", {
      method: "POST",
      body: JSON.stringify({ keyword: p.keyword }),
    });
    return {
      content: [{ type: "text", text: JSON.stringify(data).slice(0, 4000) }],
      details: data,
    };
  },
};
