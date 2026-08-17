import type { AgentTool } from "@earendil-works/pi-agent-core";
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
import { matterCreateTool, matterListTool } from "./matters.js";
import { contractReviewTool } from "./review.js";

/** legal-agent 工具全集：六模块 + 劳动仲裁特色方向。 */
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
  // 劳动仲裁（特色）
  laborCaseCreateTool,
  laborCaseListTool,
  laborCaseGetTool,
  laborCaseAdvanceTool,
  laborTodoTool,
  laborRegionTool,
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
};
