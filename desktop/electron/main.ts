import { spawn, type ChildProcess } from "node:child_process";
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import readline from "node:readline/promises";
import path from "node:path";
import { app, BrowserWindow, ipcMain } from "electron";

/**
 * Electron 主进程：窗口 + 托管 agent-core 子进程（stdio 行 JSON，Tether 同款形态）。
 * 设置持久化在 ~/.legal-workbench/config.json；保存后热重启 agent 子进程。
 */

const ROOT = path.join(__dirname, "..");
const AGENT_DIR = path.join(ROOT, "..", "agent-core");
const TSX = path.join(AGENT_DIR, "node_modules", ".bin", "tsx");
const SETTINGS_FILE = path.join(app.getPath("home"), ".legal-workbench", "config.json");

export interface AgentSettings {
  aiBase: string;
  aiKey: string;
  modelId: string;
  apiBase: string;
  apiToken: string;
}

const DEFAULTS: AgentSettings = {
  aiBase: "http://127.0.0.1:5004/v1",
  aiKey: "",
  modelId: "glm-5.2",
  apiBase: "http://127.0.0.1:8091",
  apiToken: "dev-local-token",
};

function loadSettings(): AgentSettings {
  try {
    return { ...DEFAULTS, ...JSON.parse(readFileSync(SETTINGS_FILE, "utf-8")) };
  } catch {
    return { ...DEFAULTS };
  }
}

function saveSettings(s: AgentSettings): void {
  mkdirSync(path.dirname(SETTINGS_FILE), { recursive: true });
  writeFileSync(SETTINGS_FILE, JSON.stringify(s, null, 2));
}

let win: BrowserWindow | null = null;
let child: ChildProcess | null = null;
let agentReady = false;
let uiReady = false;
let lastPrompt = "";
const pendingAutoPrompt = process.env.AUTO_PROMPT ?? "";

function debug(line: string): void {
  if (process.env.DEBUG_FILE) appendFileSync(process.env.DEBUG_FILE, `${line}\n`);
}

function send(event: unknown): void {
  debug(`[main→ui] ${JSON.stringify(event).slice(0, 300)}`);
  win?.webContents.send("agent:event", event);
}

function pushStatus(): void {
  send({ type: "agent_status", ready: agentReady, model: loadSettings().modelId });
}

/** 开发态：tsx 跑仓库源码；打包态：Electron 自带 Node 跑 bundle 单文件。 */
function spawnAgent(): void {
  const s = loadSettings();
  const isPackaged = app.isPackaged;
  const command = isPackaged ? process.execPath : TSX;
  const args = isPackaged
    ? [path.join(process.resourcesPath, "agent-server.bundle.mjs")]
    : ["src/agent-server.ts"];
  const cwd = isPackaged ? process.resourcesPath : AGENT_DIR;
  const env = {
    ...process.env,
    LEGAL_AI_BASE: s.aiBase,
    LEGAL_AI_KEY: s.aiKey,
    LEGAL_AI_MODEL: s.modelId,
    LEGAL_API_BASE: s.apiBase,
    LEGAL_API_TOKEN: s.apiToken,
  };

  child = spawn(command, args, {
    cwd,
    env: { ...env, ...(isPackaged ? { ELECTRON_RUN_AS_NODE: "1" } : {}) },
    stdio: ["pipe", "pipe", "inherit"],
  });
  debug(`[main] agent-core spawn pid=${child.pid}`);

  const rl = readline.createInterface({ input: child.stdout! });
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
      pushStatus();
      maybeAutoPrompt();
    }
    send(msg);
    if (msg.type === "agent_end") maybeAutoCapture();
  });
  child.on("exit", (code) => {
    agentReady = false;
    pushStatus();
    send({
      type: "error",
      fatal: true,
      message:
        code === 1
          ? "Agent 进程启动失败：请检查设置中的模型网关地址与 API Key。"
          : `Agent 进程已退出（${code}）。保存设置后会自动重启。`,
    });
  });
}

function restartAgent(): void {
  child?.kill();
  spawnAgent();
}

/** 无头验证钩子：AUTO_PROMPT 自动发问，CAPTURE 在回合结束后截图。 */
function maybeAutoPrompt(): void {
  if (pendingAutoPrompt && agentReady && uiReady && lastPrompt !== pendingAutoPrompt) {
    lastPrompt = pendingAutoPrompt;
    send({ type: "user_echo", text: pendingAutoPrompt });
    child?.stdin?.write(`${JSON.stringify({ type: "prompt", text: pendingAutoPrompt })}\n`);
  }
}
async function maybeAutoCapture(): Promise<void> {
  const target = process.env.CAPTURE;
  if (!target || !win) return;
  await new Promise((r) => setTimeout(r, 1500)); // 等 React 渲染完最后一条消息
  // DOM 文本证据优先于截图：抓页面文本 + 关键元素状态落盘
  const dom = await win.webContents.executeJavaScript("document.body.innerText");
  appendFileSync(
    process.env.DEBUG_FILE ?? "/dev/null",
    `\n[dom]\n${dom}\n[dom-classes] nav-active=${await win.webContents.executeJavaScript("document.querySelector('.nav-item.active')?.textContent ?? 'NONE'")} user-bubble=${await win.webContents.executeJavaScript("document.querySelectorAll('.bubble.user').length")} assistant-bubble=${await win.webContents.executeJavaScript("document.querySelectorAll('.bubble.assistant').length")}\n`,
  );
  const img = await win.webContents.capturePage();
  writeFileSync(target, img.toPNG());
  if (process.env.QUIT_AFTER_CAPTURE) app.quit();
}

app.whenReady().then(() => {
  spawnAgent();

  ipcMain.handle("settings:get", () => {
    const s = loadSettings();
    return { ...s, aiKey: s.aiKey ? `${s.aiKey.slice(0, 8)}…` : "", aiKeySet: Boolean(s.aiKey) };
  });
  ipcMain.handle("settings:set", (_e, patch: Partial<AgentSettings>) => {
    const cur = loadSettings();
    const next: AgentSettings = {
      aiBase: patch.aiBase?.trim() || cur.aiBase,
      // 空字符串或掩码占位表示「沿用旧值」
      aiKey: !patch.aiKey || patch.aiKey.includes("…") ? cur.aiKey : patch.aiKey.trim(),
      modelId: patch.modelId?.trim() || cur.modelId,
      apiBase: patch.apiBase?.trim() || cur.apiBase,
      apiToken: patch.apiToken?.trim() || cur.apiToken,
    };
    saveSettings(next);
    restartAgent();
    return { ok: true };
  });
  ipcMain.handle("agent:prompt", (_e, text: string) => {
    if (!child || !agentReady) {
      send({ type: "error", message: "Agent 未就绪，请先在设置中完成配置。" });
      return;
    }
    child.stdin?.write(`${JSON.stringify({ type: "prompt", text })}\n`);
  });
  ipcMain.on("ui:ready", () => {
    uiReady = true;
    pushStatus();
    maybeAutoPrompt();
  });

  win = new BrowserWindow({
    width: 1120,
    height: 740,
    title: "法律工作台",
    backgroundColor: "#f7f8f7",
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
    child?.kill();
  });
});

app.on("window-all-closed", () => {
  app.quit();
});
