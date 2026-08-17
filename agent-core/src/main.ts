import { createInterface } from "node:readline/promises";
import { config } from "./config.js";
import { createLegalAgent } from "./agent.js";
import { allTools } from "./tools/index.js";

const agent = createLegalAgent();

/** 事件轨迹：工具调用与最终回复打到终端。 */
agent.subscribe((ev) => {
  const e = ev as Record<string, any>;
  if (e.type === "tool_execution_start") {
    console.log(`\n→ 调用工具 ${e.toolCall?.name ?? e.toolName ?? "?"} ...`);
  } else if (e.type === "tool_execution_end") {
    console.log(`← 工具完成`);
  } else if (e.type === "message_end" && e.message?.role === "assistant") {
    const text = (e.message.content ?? [])
      .filter((c: any) => c.type === "text")
      .map((c: any) => c.text)
      .join("");
    if (text) console.log(`\n${text}`);
  } else if (e.type === "agent_end") {
    console.log("\n--- 回合结束 ---");
  }
});

async function main() {
  if (!config.aiKey) {
    console.error("缺少 LEGAL_AI_KEY（AxonHub key），先 export 再启动。");
    process.exit(1);
  }
  console.log(
    `legal-agent-core 就绪 | 模型 ${config.modelId} @ ${config.aiBase} | 工具 ${allTools.length} 个 | 后端 ${config.apiBase}`,
  );
  console.log("输入问题，Ctrl-D 退出。\n");

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  for (;;) {
    let line: string;
    try {
      line = await rl.question("你> ");
    } catch {
      break; // stdin 关闭（Ctrl-D / 管道 EOF）
    }
    if (!line.trim()) continue;
    try {
      await agent.prompt(line);
    } catch (err) {
      console.error("[error]", err instanceof Error ? err.message : err);
    }
  }
  process.exit(0);
}

main().catch((err) => {
  console.error("[fatal]", err);
  process.exit(1);
});
