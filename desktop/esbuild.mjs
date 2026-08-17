import { build } from "esbuild";

/** 编译 Electron 主进程/preload 为 CJS（renderer 交给 Vite）。 */
for (const [entry, outfile] of [
  ["electron/main.ts", "dist-electron/main.js"],
  ["electron/preload.ts", "dist-electron/preload.js"],
]) {
  await build({
    entryPoints: [entry],
    bundle: true,
    platform: "node",
    target: "node20",
    format: "cjs",
    outfile,
    external: ["electron"],
  });
}
