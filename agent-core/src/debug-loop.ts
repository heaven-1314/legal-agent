import { Agent, type AgentEvent } from "@earendil-works/pi-agent-core";
import { config } from "./config.js";
import { glm52, streamFn } from "./model.js";
import { consultTool } from "./tools/consult.js";

/** 一次性调试脚本：跑一条 prompt，打全部事件 + 终态（排查 loop/流问题用）。 */
const agent = new Agent({
  initialState: {
    systemPrompt: "你是法律工作台 Agent。回答法律问题必须调用 legal_consult 工具。",
    model: glm52,
    messages: [],
    thinkingLevel: "off",
    tools: [consultTool],
  },
  streamFn,
  getApiKey: () => config.aiKey,
});

agent.subscribe((ev: AgentEvent) => {
  const e = ev as Record<string, any>;
  console.log(`[ev] ${e.type}: ${JSON.stringify(e).slice(0, 160)}`);
});

const q = process.argv[2] ?? "试用期最长可以约定多久？";
console.log(`[prompt] ${q}`);
await agent.prompt(q);

const s = agent.state as Record<string, any>;
console.log(`\n[state] errorMessage=${JSON.stringify(s.errorMessage)}`);
for (const m of s.messages as any[]) {
  const parts = (m.content as any[] | undefined)?.map((c) =>
    c.type === "text" ? `text:${c.text.slice(0, 100)}` : `${c.type}`,
  );
  console.log(`- ${m.role}: ${parts?.join(" | ")}`);
}
