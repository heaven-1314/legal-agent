import { spawn, type ChildProcess } from "node:child_process";
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import readline from "node:readline/promises";
import path from "node:path";
import { app, BrowserWindow, dialog, ipcMain, Menu } from "electron";

/**
 * Electron 主进程：窗口 + 托管两个子进程（Tether 同款形态）。
 * - FastAPI sidecar（打包态）：本地数据，AI 网关配置注入
 * - agent-core（stdio 行 JSON）：对话 Agent
 * 设置持久化在 ~/.legal-workbench/config.json；保存后热重启。
 */

const ROOT = path.join(__dirname, "..");
const AGENT_DIR = path.join(ROOT, "..", "agent-core");
const TSX = path.join(AGENT_DIR, "node_modules", ".bin", "tsx");
const HOME_CONF = path.join(app.getPath("home"), ".legal-workbench");
const SETTINGS_FILE = path.join(HOME_CONF, "config.json");
const DATA_DIR = path.join(HOME_CONF, "data");

export interface AgentSettings {
  backendMode: "local" | "remote";
  aiBase: string;
  aiKey: string;
  modelId: string;
  apiBase: string;
  apiToken: string;
}

const DEFAULTS: AgentSettings = {
  backendMode: "local",
  // 公网网关（AxonHub）：用户机器开箱只需填 Key
  aiBase: "http://8.152.157.178:5004/v1",
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

/** 工具后端基址：本地 sidecar（打包态）或远程地址。 */
let sidecarPort = 0;

function apiBaseUrl(s: AgentSettings): string {
  if (s.backendMode === "local" && app.isPackaged && sidecarPort > 0) {
    return `http://127.0.0.1:${sidecarPort}`;
  }
  return s.apiBase;
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
    windowsHide: true, // Windows：隐藏子进程控制台窗口
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

/** FastAPI sidecar：打包态随主进程拉起，端口随机、数据本地、AI 配置注入。 */
let sidecar: ChildProcess | null = null;

function spawnSidecar(): void {
  if (!app.isPackaged) return; // 开发态用远程后端（服务器 8091）
  const s = loadSettings();
  const bin = path.join(process.resourcesPath, `legal-agent-sidecar${process.platform === "win32" ? ".exe" : ""}`);
  sidecarPort = 20000 + Math.floor(Math.random() * 20000);
  sidecar = spawn(bin, [], {
    env: {
      ...process.env,
      LEGAL_PORT: String(sidecarPort),
      LEGAL_AGENT_DATA: DATA_DIR,
      AI_BASE: s.aiBase,
      AI_KEY: s.aiKey,
      AI_MODEL: s.modelId,
    },
    stdio: ["ignore", "pipe", "inherit"],
    windowsHide: true, // Windows：隐藏 sidecar 控制台窗口
  });
  sidecar.stdout?.on("data", (d: Buffer) => debug(`[sidecar] ${d.toString().trim()}`));
  sidecar.on("exit", (code) => {
    debug(`[sidecar] exited (${code})`);
    sidecarPort = 0;
  });
}

async function waitSidecarReady(): Promise<boolean> {
  for (let i = 0; i < 40; i++) {
    if (sidecarPort === 0) return false;
    try {
      const res = await fetch(`http://127.0.0.1:${sidecarPort}/api/health`);
      if (res.ok) return true;
    } catch {
      /* 启动中，继续等 */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

function restartSidecar(): void {
  if (!app.isPackaged) return;
  sidecar?.kill();
  spawnSidecar();
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
  // 无头验证钩子：OPEN_VIEW 切初始页，OPEN_ACTION=click_first_row 点进详情
  if (process.env.OPEN_VIEW) {
    await new Promise((r) => setTimeout(r, 1200));
    if (process.env.OPEN_ACTION === "click_first_row") {
      await win.webContents.executeJavaScript("document.querySelector('.row')?.click()");
      await new Promise((r) => setTimeout(r, 900));
    }
    if (process.env.OPEN_ACTION === "review_flow") {
      // 自动审查链：等文档行渲染 → 选第一个 → 发起审查 → 轮询结果卡 → 导出（全程留痕）
      try {
        const step = async (label: string, js: string) => {
          const v = await win!.webContents.executeJavaScript(js);
          debug(`[flow] ${label} → ${JSON.stringify(v).slice(0, 80)}`);
          return v;
        };
        const waitFor = async (label: string, js: string, timeoutMs = 30000) => {
          const started = Date.now();
          for (;;) {
            if (await step(label, js)) return true;
            if (Date.now() - started > timeoutMs) {
              debug(`[flow] ${label} 超时`);
              return false;
            }
            await new Promise((r) => setTimeout(r, 1000));
          }
        };
        await step("hash", `location.hash = ${JSON.stringify(process.env.OPEN_VIEW)}`);
        await new Promise((r) => setTimeout(r, 1000));
        const hasRow = await waitFor("row", "Boolean(document.querySelector('.row'))", 30000);
        if (hasRow) {
          await step("click-row", "document.querySelector('.row')?.click() ?? 'none'");
          await new Promise((r) => setTimeout(r, 800));
          await step(
            "click-review",
            "[...document.querySelectorAll('button')].find(b => b.textContent?.includes('发起审查') && !b.disabled)?.click() ?? 'none'",
          );
          await waitFor(
            "export-btn",
            "Boolean([...document.querySelectorAll('button')].find(b => b.textContent?.includes('导出 Word')))",
            300000,
          );
          await new Promise((r) => setTimeout(r, 800));
          await step(
            "click-export",
            "[...document.querySelectorAll('button')].find(b => b.textContent?.includes('导出 Word'))?.click() ?? 'none'",
          );
          await new Promise((r) => setTimeout(r, 2500));
        }
      } catch (err) {
        debug(`[flow] 异常: ${err instanceof Error ? err.message : err}`);
      }
    }
  }
  // DOM 文本证据优先于截图：抓页面文本 + 关键元素状态落盘
  const dom = await win.webContents.executeJavaScript("document.body.innerText");
  appendFileSync(
    process.env.DEBUG_FILE ?? "/dev/null",
    `\n[dom]\n${dom}\n[dom-classes] nav-active=${await win.webContents.executeJavaScript("document.querySelector('.nav-item.active')?.textContent ?? 'NONE'")} user-bubble=${await win.webContents.executeJavaScript("document.querySelectorAll('.bubble.user').length")} assistant-bubble=${await win.webContents.executeJavaScript("document.querySelectorAll('.bubble.assistant').length")} steps=${await win.webContents.executeJavaScript("document.querySelectorAll('.step').length")} rows=${await win.webContents.executeJavaScript("document.querySelectorAll('.row').length")}\n`,
  );
  const img = await win.webContents.capturePage();
  writeFileSync(target, img.toPNG());
  if (process.env.QUIT_AFTER_CAPTURE) app.quit();
}

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null); // 移除 File/Edit/View 默认菜单（桌面应用形态）
  spawnSidecar();
  if (app.isPackaged) {
    // sidecar 就绪门控：等待健康后才创建窗口，避免竞态期 API 打死地址
    const ok = await waitSidecarReady();
    debug(`[sidecar] ready=${ok}`);
  }
  spawnAgent();

  ipcMain.handle("settings:get", () => {
    const s = loadSettings();
    return { ...s, aiKey: s.aiKey ? `${s.aiKey.slice(0, 8)}…` : "", aiKeySet: Boolean(s.aiKey) };
  });
  ipcMain.handle("settings:set", (_e, patch: Partial<AgentSettings>) => {
    const cur = loadSettings();
    const next: AgentSettings = {
      backendMode: patch.backendMode === "remote" ? "remote" : "local",
      aiBase: patch.aiBase?.trim() || cur.aiBase,
      // 空字符串或掩码占位表示「沿用旧值」
      aiKey: !patch.aiKey || patch.aiKey.includes("…") ? cur.aiKey : patch.aiKey.trim(),
      modelId: patch.modelId?.trim() || cur.modelId,
      apiBase: patch.apiBase?.trim() || cur.apiBase,
      apiToken: patch.apiToken?.trim() || cur.apiToken,
    };
    saveSettings(next);
    restartSidecar(); // AI 配置注入 sidecar，改了就重启生效
    // 延迟重启 agent，等 sidecar 先就绪
    setTimeout(() => restartAgent(), 2000);
    return { ok: true };
  });
  /** 工具后端统一代理：渲染层零网络，Bearer 在主进程注入。 */
  ipcMain.handle(
    "api",
    async (_e, req: { method?: string; path: string; body?: unknown }) => {
      const s = loadSettings();
      try {
        const res = await fetch(`${apiBaseUrl(s)}${req.path}`, {
          method: req.method ?? "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${s.apiToken}`,
          },
          body: req.body === undefined ? undefined : JSON.stringify(req.body),
        });
        const text = await res.text();
        return { ok: res.ok, status: res.status, data: text ? JSON.parse(text) : {} };
      } catch (err) {
        return {
          ok: false,
          status: 0,
          data: { message: `无法连接工具后端（${s.backendMode === "local" ? "本地服务" : s.apiBase}）` },
        };
      }
    },
  );

  /** 文档上传：系统文件对话框 + multipart POST /api/documents（渲染层零文件系统访问）。 */
  ipcMain.handle("upload:document", async () => {
    const picked = await dialog.showOpenDialog(win!, {
      properties: ["openFile"],
      filters: [{ name: "法律文档", extensions: ["txt", "md", "pdf", "docx", "doc", "jpg", "png"] }],
    });
    if (picked.canceled || !picked.filePaths[0]) return { ok: false, canceled: true, data: {} };
    const filePath = picked.filePaths[0];
    const s = loadSettings();
    try {
      const buf = readFileSync(filePath);
      const name = path.basename(filePath);
      const form = new FormData();
      form.append("file", new Blob([new Uint8Array(buf)]), name);
      const res = await fetch(`${apiBaseUrl(s)}/api/documents`, {
        method: "POST",
        headers: { Authorization: `Bearer ${s.apiToken}` },
        body: form,
      });
      const text = await res.text();
      return { ok: res.ok, canceled: false, data: text ? JSON.parse(text) : {} };
    } catch (err) {
      return { ok: false, canceled: false, data: { message: `上传失败：${err instanceof Error ? err.message : err}` } };
    }
  });

  /** Word 导出：保存对话框（无头验证可用 EXPORT_AUTO_PATH 固定路径）+ 主进程拉取落盘。 */
  ipcMain.handle(
    "export:docx",
    async (_e, req: { docPath: string; defaultName: string }) => {
      const s = loadSettings();
      let target = process.env.EXPORT_AUTO_PATH ?? "";
      if (!target) {
        const picked = await dialog.showSaveDialog(win!, {
          defaultPath: req.defaultName,
          filters: [{ name: "Word 文档", extensions: ["docx"] }],
        });
        if (picked.canceled || !picked.filePath) return { ok: false, canceled: true };
        target = picked.filePath;
      }
      try {
        const res = await fetch(`${apiBaseUrl(s)}${req.docPath}`, {
          headers: { Authorization: `Bearer ${s.apiToken}` },
        });
        if (!res.ok) {
          const text = await res.text();
          return { ok: false, canceled: false, message: `导出失败（${res.status}）：${text.slice(0, 150)}` };
        }
        writeFileSync(target, Buffer.from(await res.arrayBuffer()));
        return { ok: true, path: target };
      } catch (err) {
        return { ok: false, canceled: false, message: `导出失败：${err instanceof Error ? err.message : err}` };
      }
    },
  );

  /** 设置页「测试连接」：AI 网关连通性 + 工具后端健康，一次给出可读结论。 */
  /** 获取模型：拉网关 /models 返回可选模型 id 列表。 */
  ipcMain.handle("settings:models", async (_e, req: { aiBase?: string; aiKey?: string }) => {
    const s = loadSettings();
    const base = (req.aiBase || s.aiBase).replace(/\/+$/, "");
    const key = req.aiKey && !req.aiKey.includes("…") ? req.aiKey : s.aiKey;
    try {
      const res = await fetch(`${base}/models`, {
        headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(10000),
      });
      const text = await res.text();
      if (!res.ok) {
        return { ok: false, message: res.status === 401 ? "认证失败（401）：API Key 无效或已过期" : `网关响应异常（${res.status}）` };
      }
      const data = JSON.parse(text);
      const ids: string[] = (data.data ?? []).map((m: { id: string }) => m.id).filter(Boolean);
      return { ok: true, models: ids };
    } catch {
      return { ok: false, message: "无法连接网关：请检查地址（本机填 127.0.0.1，远程填公网地址）" };
    }
  });

  ipcMain.handle("settings:test", async () => {
    const s = loadSettings();
    const out: { ai: string; backend: string } = { ai: "", backend: "" };
    try {
      const res = await fetch(`${s.aiBase}/models`, {
        headers: { Authorization: `Bearer ${s.aiKey}` },
        signal: AbortSignal.timeout(8000),
      });
      out.ai =
        res.status === 401
          ? "网关可达，但 Key 无效（401）——请检查 API Key"
          : res.ok
            ? `网关连通 ✓（${s.modelId}）`
            : `网关响应异常（${res.status}）`;
    } catch {
      out.ai = "网关不可达——请检查地址（本机网关填 127.0.0.1，远程网关填公网 IP）";
    }
    try {
      const res = await fetch(`${apiBaseUrl(s)}/api/health`, { signal: AbortSignal.timeout(8000) });
      out.backend = res.ok
        ? s.backendMode === "local"
          ? "本地内置服务运行中 ✓"
          : "远程后端连通 ✓"
        : `后端响应异常（${res.status}）`;
    } catch {
      out.backend = s.backendMode === "local" ? "本地内置服务未启动" : "远程后端不可达";
    }
    return out;
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
    // 无对话场景（OPEN_VIEW 验证）也要能截图退出
    if (process.env.CAPTURE && !process.env.AUTO_PROMPT) {
      setTimeout(() => maybeAutoCapture(), 1800);
    }
  });

  win = new BrowserWindow({
    width: 1120,
    height: 740,
    title: "法律工作台",
    backgroundColor: "#f7f8f7",
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true },
  });
  const devUrl = process.env.VITE_DEV_SERVER_URL;
  const openView = process.env.OPEN_VIEW;
  if (devUrl) {
    win.loadURL(openView ? `${devUrl}#${openView}` : devUrl);
  } else {
    win.loadFile(path.join(ROOT, "dist", "index.html"), openView ? { hash: openView } : undefined);
  }
  win.on("closed", () => {
    win = null;
    child?.kill();
    sidecar?.kill();
  });
});

app.on("window-all-closed", () => {
  app.quit();
});
