import type { StreamFn } from "@earendil-works/pi-agent-core";
import type { Model } from "@earendil-works/pi-ai";
import { streamSimple } from "@earendil-works/pi-ai/api/openai-completions";
import { config } from "./config.js";

/** 经 AxonHub 网关的 GLM-5.2：openai-completions 兼容端点。 */
export const glm52: Model<"openai-completions"> = {
  id: config.modelId,
  name: "GLM-5.2 (AxonHub)",
  api: "openai-completions",
  provider: "axonhub",
  baseUrl: config.aiBase,
  reasoning: false,
  input: ["text"],
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  contextWindow: 128_000,
  maxTokens: 8_192,
};

/** Agent 的 StreamFn 要接受任意 Api；本工程只有 openai-completions 一种，收窄转发。 */
export const streamFn: StreamFn = (model, context, options) =>
  streamSimple(model as Model<"openai-completions">, context, options as never);
