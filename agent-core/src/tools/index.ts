import type { AgentTool } from "@earendil-works/pi-agent-core";
import { companyQueryTool } from "./company.js";
import { consultTool } from "./consult.js";
import { dossierReadBatchTool, dossierReadTool } from "./dossier.js";
import { documentListTool, documentSearchTool } from "./documents.js";
import { draftCreateTool, draftTemplatesTool } from "./draft.js";
import {
  laborCaseAdvanceTool,
  laborCaseCreateTool,
  laborCaseGetTool,
  laborCaseListTool,
  laborRegionTool,
  laborTodoTool,
} from "./labor.js";
import { lawCasesTool, lawSearchTool } from "./laws.js";
import { matterCreateTool, matterListTool } from "./matters.js";
import { contractReviewTool } from "./review.js";
import { compensationCalcTool } from "./calc.js";

/** legal-agent 工具全集：全量 20 个办案与检索工具。 */
export const allTools: AgentTool<any>[] = [
  // 咨询
  consultTool,
  // 案件夹
  matterListTool,
  matterCreateTool,
  // 文档
  documentSearchTool,
  documentListTool,
  // 合同审查
  contractReviewTool,
  // 文书
  draftTemplatesTool,
  draftCreateTool,
  // 阅卷
  dossierReadTool,
  dossierReadBatchTool,
  // 劳动仲裁全流程
  laborCaseCreateTool,
  laborCaseListTool,
  laborCaseGetTool,
  laborCaseAdvanceTool,
  laborTodoTool,
  laborRegionTool,
  // 企业工商与主体核验
  companyQueryTool,
  // 法规与案例检索
  lawSearchTool,
  lawCasesTool,
  // 法定赔偿测算
  compensationCalcTool,
];

export {
  consultTool,
  matterListTool,
  matterCreateTool,
  documentSearchTool,
  documentListTool,
  contractReviewTool,
  draftTemplatesTool,
  draftCreateTool,
  dossierReadTool,
  dossierReadBatchTool,
  laborCaseCreateTool,
  laborCaseListTool,
  laborCaseGetTool,
  laborCaseAdvanceTool,
  laborTodoTool,
  laborRegionTool,
  companyQueryTool,
  lawSearchTool,
  lawCasesTool,
  compensationCalcTool,
};
