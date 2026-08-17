import { spawn } from "node:child_process";
import { appendFileSync, writeFileSync } from "node:fs";
import readline from "node:readline/promises";
import path from "node:path";
import { app, BrowserWindow, ipcMain } from "electron";

/**
 * Electron 主进程：窗口 + 托管 agent-core 子进程（stdio 行 JSON，Tether 同款形态）。
 * 渲染层不直接接触 agent；一切经 preload 暴露的 IPC 契约。
 */

const ROOT = path.join(__dirname, "..");
const AGENT_DIR = path.join(ROOT, "..", "agent-core");
const TSX = path.join(AGENT_DIR, "node_modules", ".bin", "tsx");

let win: BrowserWindow | null = null;
let agentReady = false;
let uiReady = false;
const pendingAutoPrompt = process.env.AUTO_PROMPT ?? "";

function send(event: unknown): void {
  if (process.env.DEBUG_FILE) {
    appendFileSync(process.env.DEBUG_FILE, `[main→ui] ${JSON.stringify(event).slice(0, 300)}\n`);
  }
  win?.webContents.send("agent:event", event);
}

function startAgent() {
  const child = spawn(TSX, ["src/agent-server.ts"], {
    cwd: AGENT_DIR,
    env: { ...process.env },
    stdio: ["pipe", "pipe", "inherit"],
  });
  if (process.env.DEBUG_FILE) {
    appendFileSync(process.env.DEBUG_FILE, `[main] agent-core spawn pid=${child.pid}\n`);
  }
  const rl = readline.createInterface({ input: child.stdout });
  rl.on("line", (line: string) => {
    if (!line.trim()) return;
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(line);
    } catch {
      return;
    }
    if (msg.type === "ready") {
      agentReady = true;
      maybeAutoPrompt();
    }
    send(msg);
    if (msg.type === "agent_end") maybeAutoCapture();
  });
  child.on("exit", (code) => send({ type: "error", message: `agent-core exited (${code})` }));

  ipcMain.handle("agent:prompt", (_e, text: string) => {
    child.stdin.write(`${JSON.stringify({ type: "prompt", text })}\n`);
  });
  ipcMain.handle("agent:status", () => ({ agentReady }));
  ipcMain.on("ui:ready", () => {
    uiReady = true;
    maybeAutoPrompt();
  });
  return child;
}

/** 无头验证钩子：AUTO_PROMPT 自动发问，CAPTURE 在回合结束后截图（留渲染时间）。 */
function maybeAutoPrompt(): void {
  if (pendingAutoPrompt && agentReady && uiReady) {
    send({ type: "user_echo", text: pendingAutoPrompt });
    childRef.stdin?.write(`${JSON.stringify({ type: "prompt", text: pendingAutoPrompt })}\n`);
  }
}
async function maybeAutoCapture(): Promise<void> {
  const target = process.env.CAPTURE;
  if (!target || !win) return;
  await new Promise((r) => setTimeout(r, 1500)); // 等 React 渲染完最后一条消息
  const img = await win.webContents.capturePage();
  writeFileSync(target, img.toPNG());
  if (process.env.QUIT_AFTER_CAPTURE) app.quit();
}

let childRef: ReturnType<typeof startAgent>;

app.whenReady().then(() => {
  childRef = startAgent();
  win = new BrowserWindow({
    width: 1024,
    height: 720,
    title: "法律工作台",
    backgroundColor: "#fafafa",
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true },
  });
  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    win.loadURL(devUrl);
  } else {
    win.loadFile(path.join(ROOT, "dist", "index.html"));
  }
  win.on("closed", () => {
    win = null;
    childRef?.kill();
  });
});

app.on("window-all-closed", () => {
  app.quit();
});
