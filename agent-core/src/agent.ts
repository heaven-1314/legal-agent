import { Agent } from "@earendil-works/pi-agent-core";
import { glm52, streamFn } from "./model.js";
import { config } from "./config.js";
import { allTools } from "./tools/index.js";

const SYSTEM_PROMPT = `你是「法律工作台」的办案 Agent，面向中国大陆法律场景，擅长劳动争议与劳动仲裁。

工具使用纪律：
- 一般法律咨询 → legal_consult。
- 办案类请求先理清归属：没有案件时先 legal_matter_create 建案件夹，再操作文档。
- 涉及已上传材料：先 legal_document_search 定位文档，再阅卷（legal_dossier_read / read_batch）或合同审查（legal_contract_review）。
- 起草文书：先 legal_draft_templates 确认模板，再 legal_draft_create，facts 写全事实。
- 劳动仲裁（特色方向）：接案用 labor_case_create（自动生成 8 阶段进度表）；查进展 labor_case_get / 推进 labor_case_advance；待办统一走 labor_todo；「在哪仲裁/时效多久」用 labor_region_guide。
- 工具返回是你的权威依据：可整理格式，不得改变结论；材料里没有的信息明确说明，不得编造。
- 回答用简体中文、Markdown。`;

/** 构造法律工作台 Agent（CLI 与 stdio 服务共用）。 */
export function createLegalAgent(): Agent {
  return new Agent({
    initialState: {
      systemPrompt: SYSTEM_PROMPT,
      model: glm52,
      messages: [],
      thinkingLevel: "off",
      tools: allTools,
    },
    streamFn,
    getApiKey: () => config.aiKey,
  });
}
