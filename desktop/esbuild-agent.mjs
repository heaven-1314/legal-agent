import { build } from "esbuild";

/**
 * 把 agent-core 的 stdio 服务连同 Pi 依赖 bundle 成单文件 CJS，
 * 供打包后的桌面端用 Electron 自带 Node 运行（消除 tsx/仓库路径依赖）。
 */
await build({
  entryPoints: ["../agent-core/src/agent-server.ts"],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  outfile: "agent-server.bundle.mjs",
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
});
console.log("agent-server.bundle.mjs built");
