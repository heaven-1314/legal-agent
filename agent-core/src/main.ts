import { createInterface } from "node:readline/promises";
import { Agent, type AgentEvent } from "@earendil-works/pi-agent-core";
import { config } from "./config.js";
import { glm52, streamFn } from "./model.js";
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

const agent = new Agent({
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

/** 事件轨迹：工具调用与最终回复打到终端。 */
agent.subscribe((ev: AgentEvent) => {
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
