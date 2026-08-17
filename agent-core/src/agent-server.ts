import readline from "node:readline/promises";
import type { AgentEvent } from "@earendil-works/pi-agent-core";
import { createLegalAgent } from "./agent.js";
import { config } from "./config.js";

/**
 * stdio 服务入口（Tether 同款通信形态）：行分隔 JSON。
 * 入：{"type":"prompt","text":"..."}
 * 出：{"type":"ready"|"tool_start"|"tool_end"|"assistant"|"agent_end"|"error", ...}
 */
if (!config.aiKey) {
  process.stdout.write(`${JSON.stringify({ type: "error", message: "missing LEGAL_AI_KEY" })}\n`);
  process.exit(1);
}

const agent = createLegalAgent();
const out = (msg: Record<string, unknown>) => process.stdout.write(`${JSON.stringify(msg)}\n`);

// 读端（如 head/管道）提前关闭时静默退出，避免 EPIPE 崩溃
process.stdout.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EPIPE") process.exit(0);
  throw err;
});

agent.subscribe((ev: AgentEvent) => {
  const e = ev as Record<string, any>;
  if (e.type === "tool_execution_start") {
    out({ type: "tool_start", name: e.toolCall?.name ?? e.toolName ?? "?" });
  } else if (e.type === "tool_execution_end") {
    out({ type: "tool_end" });
  } else if (e.type === "message_end" && e.message?.role === "assistant") {
    const text = (e.message.content ?? [])
      .filter((c: any) => c.type === "text")
      .map((c: any) => c.text)
      .join("");
    if (text) out({ type: "assistant", text });
  } else if (e.type === "agent_end") {
    out({ type: "agent_end" });
  }
});

const rl = readline.createInterface({ input: process.stdin });
out({ type: "ready", tools: agent.state.tools.length, model: config.modelId });

for await (const line of rl) {
  if (!line.trim()) continue;
  let req: { type?: string; text?: string };
  try {
    req = JSON.parse(line);
  } catch {
    out({ type: "error", message: "bad json" });
    continue;
  }
  if (req.type === "prompt" && req.text) {
    try {
      await agent.prompt(req.text);
    } catch (err) {
      out({ type: "error", message: err instanceof Error ? err.message : String(err) });
    }
  }
}
