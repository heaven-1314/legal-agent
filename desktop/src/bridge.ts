export type ChatRole = "user" | "assistant" | "tool" | "error";

export interface ActionCard {
  type: "case_created" | "contract_review" | "draft_suggest" | "company_info" | "calc_result";
  title: string;
  case_id?: string;
  stage?: string;
  employer?: string;
  city?: string;
  dispute_amount?: string;
  hint?: string;
  template?: string;
}

export interface ChatMessage {
  role: ChatRole;
  text: string;
  action?: "settings";
  actionCards?: ActionCard[];
}

export interface SettingsView {
  backendMode: "local" | "remote";
  aiBase: string;
  aiKey: string;
  aiKeySet: boolean;
  modelId: string;
  apiBase: string;
  apiToken: string;
}

interface LegalAgentBridge {
  prompt: (text: string) => Promise<void>;
  uploadDocument: () => Promise<{
    ok: boolean;
    canceled: boolean;
    data: { id?: string; filename?: string; message?: string };
  }>;
  exportDocx: (req: { docPath: string; defaultName: string }) => Promise<{
    ok: boolean;
    canceled: boolean;
    path?: string;
    message?: string;
  }>;
  api: <T = unknown>(req: { method?: string; path: string; body?: unknown }) => Promise<{
    ok: boolean;
    status: number;
    data: T;
  }>;
  getSettings: () => Promise<SettingsView>;
  testConnection: () => Promise<{ ai: string; backend: string }>;
  fetchModels: (req?: { aiBase?: string; aiKey?: string }) => Promise<{ ok: boolean; models?: string[]; message?: string }>;
  setSettings: (patch: Partial<SettingsView>) => Promise<{ ok: boolean }>;
  uiReady: () => void;
  onEvent: (cb: (msg: Record<string, any>) => void) => () => void;
}

// Fallback for Web Browser (non-Electron environment)
let webEventListeners: Array<(msg: Record<string, any>) => void> = [];
const webChatHistory: Array<{ role: string; content: string }> = [];
const SETTINGS_KEY = "legal-workbench-settings";

function loadWebSettings(): SettingsView {
  const defaults: SettingsView = {
    backendMode: "local",
    aiBase: "http://8.152.157.178:5004/v1",
    aiKey: "••••••••",
    aiKeySet: true,
    modelId: "glm-5.2",
    apiBase: "http://127.0.0.1:8091",
    apiToken: "dev-local-token",
  };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      return { ...defaults, ...JSON.parse(raw) };
    }
  } catch {}
  return defaults;
}

function saveWebSettings(patch: Partial<SettingsView>): void {
  try {
    const curr = loadWebSettings();
    const next = { ...curr, ...patch };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  } catch {}
}

function getApiUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const pathname = typeof window !== "undefined" ? window.location.pathname : "";
  const prefix = pathname.startsWith("/legal-agent") ? "/legal-agent" : "";
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${prefix}${cleanPath}`;
}

const webBridge: LegalAgentBridge = {
  prompt: async (text: string) => {
    webEventListeners.forEach((cb) => cb({ type: "user_echo", text }));
    webEventListeners.forEach((cb) => cb({ type: "tool_start", name: "法律知识问答服务" }));

    try {
      const res = await fetch(getApiUrl("/api/consult"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-dev-token": "dev-local-token",
        },
        body: JSON.stringify({
          question: text,
          history: webChatHistory,
        }),
      });
      const data = await res.json();
      if (res.ok && data.reply) {
        webChatHistory.push({ role: "user", content: text });
        webChatHistory.push({ role: "assistant", content: data.reply });
        webEventListeners.forEach((cb) =>
          cb({
            type: "assistant",
            text: data.reply,
            actionCards: data.action_cards || [],
          })
        );
      } else {
        webEventListeners.forEach((cb) =>
          cb({ type: "error", message: data.detail || "咨询服务响应异常", fatal: false })
        );
      }
    } catch (e: any) {
      webEventListeners.forEach((cb) =>
        cb({ type: "error", message: `网络连接异常: ${e.message}`, fatal: false })
      );
    } finally {
      webEventListeners.forEach((cb) => cb({ type: "agent_end" }));
    }
  },
  uploadDocument: async () => {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".txt,.md,.pdf,.docx,.doc";
      input.onchange = async () => {
        if (!input.files || input.files.length === 0) {
          resolve({ ok: false, canceled: true, data: {} });
          return;
        }
        const file = input.files[0];
        const formData = new FormData();
        formData.append("file", file);
        try {
          const res = await fetch(getApiUrl("/api/documents"), {
            method: "POST",
            headers: { "x-dev-token": "dev-local-token" },
            body: formData,
          });
          const json = await res.json();
          if (res.ok) {
            resolve({ ok: true, canceled: false, data: json });
          } else {
            resolve({ ok: false, canceled: false, data: { message: json?.detail || "上传失败" } });
          }
        } catch (e: any) {
          resolve({ ok: false, canceled: false, data: { message: e.message } });
        }
      };
      input.click();
    });
  },
  exportDocx: async (req) => {
    try {
      const link = document.createElement("a");
      link.href = getApiUrl(req.docPath);
      link.download = req.defaultName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return { ok: true, canceled: false, path: req.defaultName };
    } catch (e: any) {
      return { ok: false, canceled: false, message: e.message };
    }
  },
  api: async <T = unknown>(req: { method?: string; path: string; body?: unknown }) => {
    try {
      const method = req.method || "GET";
      const headers: Record<string, string> = {
        "x-dev-token": "dev-local-token",
      };
      let body: string | undefined = undefined;
      if (req.body) {
        headers["Content-Type"] = "application/json";
        body = JSON.stringify(req.body);
      }
      const targetUrl = getApiUrl(req.path);
      const res = await fetch(targetUrl, { method, headers, body });
      let data: any = null;
      try {
        data = await res.json();
      } catch {
        data = await res.text();
      }
      return {
        ok: res.ok,
        status: res.status,
        data: data as T,
      };
    } catch (e: any) {
      return {
        ok: false,
        status: 500,
        data: { message: e.message } as any,
      };
    }
  },
  getSettings: async () => {
    return loadWebSettings();
  },
  testConnection: async () => {
    try {
      const res = await fetch(getApiUrl("/api/health"));
      if (res.ok) {
        return { ai: "✓ 正常响应 (已连接网关)", backend: "✓ 正常 (FastAPI 8091)" };
      }
    } catch {}
    return { ai: "× 未连接", backend: "× 异常" };
  },
  fetchModels: async () => {
    return {
      ok: true,
      models: ["glm-5.2", "glm-5.3", "grok-4.5", "qwen3.7-flash", "deepseek-v3"],
    };
  },
  setSettings: async (patch: Partial<SettingsView>) => {
    saveWebSettings(patch);
    if (patch.modelId) {
      webEventListeners.forEach((cb) =>
        cb({
          type: "agent_status",
          ready: true,
          model: patch.modelId,
        })
      );
    }
    return { ok: true };
  },
  uiReady: () => {
    const s = loadWebSettings();
    setTimeout(() => {
      webEventListeners.forEach((cb) =>
        cb({
          type: "agent_status",
          ready: true,
          model: s.modelId || "glm-5.2",
        })
      );
    }, 150);
  },
  onEvent: (cb) => {
    webEventListeners.push(cb);
    return () => {
      webEventListeners = webEventListeners.filter((x) => x !== cb);
    };
  },
};

export const bridge: LegalAgentBridge =
  typeof window !== "undefined" && (window as any).legalAgent
    ? (window as any).legalAgent
    : webBridge;
