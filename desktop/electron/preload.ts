import { contextBridge, ipcRenderer } from "electron";

export interface SettingsView {
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
  getSettings: (): Promise<SettingsView> => ipcRenderer.invoke("settings:get"),
  setSettings: (patch: Partial<SettingsView>) => ipcRenderer.invoke("settings:set", patch),
  uiReady: () => ipcRenderer.send("ui:ready"),
  onEvent: (callback: (msg: Record<string, unknown>) => void) => {
    const listener = (_e: unknown, msg: Record<string, unknown>) => callback(msg);
    ipcRenderer.on("agent:event", listener);
    return () => ipcRenderer.removeListener("agent:event", listener);
  },
});
