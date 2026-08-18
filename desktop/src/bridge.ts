export type ChatRole = "user" | "assistant" | "tool" | "error";

export interface ChatMessage {
  role: ChatRole;
  text: string;
  action?: "settings";
}

export interface SettingsView {
  aiBase: string;
  aiKey: string;
  aiKeySet: boolean;
  modelId: string;
  apiBase: string;
  apiToken: string;
}

interface LegalAgentBridge {
  prompt: (text: string) => Promise<void>;
  getSettings: () => Promise<SettingsView>;
  setSettings: (patch: Partial<SettingsView>) => Promise<{ ok: boolean }>;
  uiReady: () => void;
  onEvent: (cb: (msg: Record<string, any>) => void) => () => void;
}

export const bridge: LegalAgentBridge = (window as any).legalAgent;
