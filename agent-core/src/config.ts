/** legal-agent-core 配置：全部来自环境变量，密钥不落码。 */

export const config = {
  /** 模型网关（AxonHub，OpenAI 兼容）。 */
  aiBase: process.env.LEGAL_AI_BASE ?? "http://127.0.0.1:5004/v1",
  aiKey: process.env.LEGAL_AI_KEY ?? "",
  modelId: process.env.LEGAL_AI_MODEL ?? "glm-5.2",

  /** 工具后端（legal-agent FastAPI）。 */
  apiBase: process.env.LEGAL_API_BASE ?? "http://127.0.0.1:8091",
  apiToken: process.env.LEGAL_API_TOKEN ?? "dev-local-token",
};
