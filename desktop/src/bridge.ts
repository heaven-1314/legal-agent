export type ChatRole = "user" | "assistant" | "tool" | "error";

export interface ChatMessage {
  role: ChatRole;
  text: string;
  action?: "settings";
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
  api: <T = unknown>(req: { method?: string; path: string; body?: unknown }) => Promise<{
    ok: boolean;
    status: number;
    data: T;
  }>;
  getSettings: () => Promise<SettingsView>;
  setSettings: (patch: Partial<SettingsView>) => Promise<{ ok: boolean }>;
  uiReady: () => void;
  onEvent: (cb: (msg: Record<string, any>) => void) => () => void;
}

export const bridge: LegalAgentBridge = (window as any).legalAgent;
