import { contextBridge, ipcRenderer } from "electron";

/** IPC 契约：渲染层可见的全部桌面能力（contextIsolation 开启）。 */
contextBridge.exposeInMainWorld("legalAgent", {
  prompt: (text: string) => ipcRenderer.invoke("agent:prompt", text),
  status: () => ipcRenderer.invoke("agent:status"),
  uiReady: () => {
    ipcRenderer.send("ui:ready");
  },
  onEvent: (callback: (msg: Record<string, unknown>) => void) => {
    const listener = (_e: unknown, msg: Record<string, unknown>) => callback(msg);
    ipcRenderer.on("agent:event", listener);
    return () => ipcRenderer.removeListener("agent:event", listener);
  },
});
