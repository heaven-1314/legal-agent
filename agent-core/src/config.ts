import { readFileSync } from "node:fs";

/** legal-agent-core 配置：环境变量优先；本机开发兜底读 AxonHub key 落盘文件。 */

function localAxonhubKey(): string {
  try {
    return readFileSync("/root/.claude/skills/vision/token.txt", "utf-8").trim();
  } catch {
    return "";
  }
}

export const config = {
  /** 模型网关（AxonHub，OpenAI 兼容）。 */
  aiBase: process.env.LEGAL_AI_BASE ?? "http://127.0.0.1:5004/v1",
  aiKey: process.env.LEGAL_AI_KEY || localAxonhubKey(),
  modelId: process.env.LEGAL_AI_MODEL ?? "glm-5.2",

  /** 工具后端（legal-agent FastAPI）。 */
  apiBase: process.env.LEGAL_API_BASE ?? "http://127.0.0.1:8091",
  apiToken: process.env.LEGAL_API_TOKEN ?? "dev-local-token",
};
