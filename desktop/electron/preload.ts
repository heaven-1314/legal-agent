import { contextBridge, ipcRenderer } from "electron";

export interface SettingsView {
  backendMode: "local" | "remote";
  aiBase: string;
  aiKey: string;
  aiKeySet: boolean;
  modelId: string;
  apiBase: string;
  apiToken: string;
}

/** IPC 契约：渲染层可见的全部桌面能力（contextIsolation 开启）。 */
contextBridge.exposeInMainWorld("legalAgent", {
  prompt: (text: string) => ipcRenderer.invoke("agent:prompt", text),
  uploadDocument: () =>
    ipcRenderer.invoke("upload:document") as Promise<{
      ok: boolean;
      canceled: boolean;
      data: { id?: string; filename?: string; message?: string };
    }>,
  exportDocx: (req: { docPath: string; defaultName: string }) =>
    ipcRenderer.invoke("export:docx", req) as Promise<{
      ok: boolean;
      canceled: boolean;
      path?: string;
      message?: string;
    }>,
  api: <T = unknown>(req: { method?: string; path: string; body?: unknown }) =>
    ipcRenderer.invoke("api", req) as Promise<{ ok: boolean; status: number; data: T }>,
  getSettings: (): Promise<SettingsView> => ipcRenderer.invoke("settings:get"),
  testConnection: () => ipcRenderer.invoke("settings:test") as Promise<{ ai: string; backend: string }>,
  setSettings: (patch: Partial<SettingsView>) => ipcRenderer.invoke("settings:set", patch),
  uiReady: () => ipcRenderer.send("ui:ready"),
  onEvent: (callback: (msg: Record<string, unknown>) => void) => {
    const listener = (_e: unknown, msg: Record<string, unknown>) => callback(msg);
    ipcRenderer.on("agent:event", listener);
    return () => ipcRenderer.removeListener("agent:event", listener);
  },
});
