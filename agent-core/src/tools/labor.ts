import type { AgentTool } from "@earendil-works/pi-agent-core";
import { Type } from "@earendil-works/pi-ai";
import { api } from "../api.js";

const createParams = Type.Object({
  title: Type.String({ description: "案件名称，如「张某诉某科技公司违法解除案」" }),
  employee: Type.String({ description: "劳动者姓名" }),
  employer: Type.String({ description: "用人单位名称" }),
  city: Type.Optional(Type.String({ description: "所在城市，如「北京」" })),
  dispute_amount: Type.Optional(Type.String({ description: "争议金额（可描述）" })),
  claim_summary: Type.Optional(Type.String({ description: "诉求概述" })),
});
const getParams = Type.Object({ case_id: Type.String({ description: "案件 ID" }) });
const advanceParams = Type.Object({
  case_id: Type.String({ description: "案件 ID" }),
  note: Type.Optional(Type.String({ description: "本阶段完成情况备注" })),
});
const todoParams = Type.Object({
  action: Type.Union([Type.Literal("add"), Type.Literal("done")], {
    description: "add=新增待办（需 case_id/title），done=完成待办（需 todo_id）",
  }),
  case_id: Type.Optional(Type.String({ description: "add 时必填：案件 ID" })),
  title: Type.Optional(Type.String({ description: "add 时必填：待办内容" })),
  due: Type.Optional(Type.String({ description: "截止日期" })),
  todo_id: Type.Optional(Type.String({ description: "done 时必填：待办 ID" })),
});
const regionParams = Type.Object({
  city: Type.Optional(Type.String({ description: "城市名（不填则返回支持的城市列表）" })),
});

/** 劳动仲裁（本工作台特色方向）：案件进度表 + 待办 + 地区规则。 */
export const laborCaseCreateTool: AgentTool<typeof createParams> = {
  name: "labor_case_create",
  label: "建劳动仲裁案件",
  description:
    "新建劳动仲裁案件并生成 8 阶段进度表（咨询评估→证据收集→申请准备→提交→受理答辩→开庭→裁决→执行）。用户要打劳动仲裁官司时使用。",
  parameters: createParams,
  async execute(_id, p) {
    const data = await api("/api/labor/cases", { method: "POST", body: JSON.stringify(p) });
    return { content: [{ type: "text", text: JSON.stringify(data).slice(0, 5000) }], details: data };
  },
};

export const laborCaseListTool: AgentTool<ReturnType<typeof Type.Object>> = {
  name: "labor_case_list",
  label: "劳动案件列表",
  description: "列出全部劳动仲裁案件及当前阶段。用户问「劳动仲裁的案子进展如何」时使用。",
  parameters: Type.Object({}),
  async execute() {
    const data = await api("/api/labor/cases");
    return { content: [{ type: "text", text: JSON.stringify(data).slice(0, 4000) }], details: data };
  },
};

export const laborCaseGetTool: AgentTool<typeof getParams> = {
  name: "labor_case_get",
  label: "劳动案件详情",
  description: "查劳动仲裁案件详情：8 阶段进度时间线、阶段备注、待办清单。查具体案件进展时使用。",
  parameters: getParams,
  async execute(_id, p) {
    const data = await api(`/api/labor/cases/${p.case_id}`);
    return { content: [{ type: "text", text: JSON.stringify(data).slice(0, 6000) }], details: data };
  },
};

export const laborCaseAdvanceTool: AgentTool<typeof advanceParams> = {
  name: "labor_case_advance",
  label: "推进案件阶段",
  description: "把劳动仲裁案件推进到下一阶段（如证据收集完成→进入申请准备）。用户告知进展时使用。",
  parameters: advanceParams,
  async execute(_id, p) {
    const { case_id, ...body } = p;
    const data = await api(`/api/labor/cases/${case_id}/advance`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return { content: [{ type: "text", text: JSON.stringify(data).slice(0, 5000) }], details: data };
  },
};

export const laborTodoTool: AgentTool<typeof todoParams> = {
  name: "labor_todo",
  label: "案件待办",
  description: "管理劳动仲裁案件的待办：action=add 新增（case_id+title），action=done 完成（todo_id）。",
  parameters: todoParams,
  async execute(_id, p) {
    if (p.action === "add") {
      if (!p.case_id || !p.title) throw new Error("add 需要 case_id 和 title");
      const data = await api(`/api/labor/cases/${p.case_id}/todos`, {
        method: "POST",
        body: JSON.stringify({ title: p.title, due: p.due ?? "" }),
      });
      return { content: [{ type: "text", text: JSON.stringify(data) }], details: data };
    }
    if (!p.todo_id) throw new Error("done 需要 todo_id");
    const data = await api(`/api/labor/todos/${p.todo_id}/done`, { method: "POST" });
    return { content: [{ type: "text", text: JSON.stringify(data) }], details: data };
  },
};

export const laborRegionTool: AgentTool<typeof regionParams> = {
  name: "labor_region_guide",
  label: "地区规则",
  description:
    "查劳动仲裁地区规则：全国统一规定（时效/管辖/一裁终局/审限/费用）+ 城市专属提示。涉及「在哪仲裁、时效多久」时使用。",
  parameters: regionParams,
  async execute(_id, p) {
    const qs = p.city ? `?city=${encodeURIComponent(p.city)}` : "";
    const data = await api(`/api/labor/regions${qs}`);
    return { content: [{ type: "text", text: JSON.stringify(data).slice(0, 5000) }], details: data };
  },
};
