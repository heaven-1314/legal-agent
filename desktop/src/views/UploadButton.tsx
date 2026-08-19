import { bridge } from "../bridge.js";

/** 全模块统一上传按钮：走主进程文件对话框 + /api/documents，成功后回调刷新。 */
export function UploadButton(props: {
  onUploaded: () => void;
  onError?: (msg: string) => void;
  label?: string;
  matterId?: string;
}) {
  const upload = async () => {
    const res = await bridge.uploadDocument();
    if (res.ok) {
      if (props.matterId && res.data.id) {
        await bridge.api({
          method: "POST",
          path: `/api/matters/${props.matterId}/documents`,
          body: { document_id: res.data.id },
        });
      }
      props.onUploaded();
    } else if (!res.canceled) {
      props.onError?.(res.data?.message ?? "上传失败");
    }
  };
  return (
    <button className="btn outline" onClick={upload}>
      <svg className="ic"><use href="#i-doc" /></svg>
      {props.label ?? "上传文档"}
    </button>
  );
}

/** 统一错误横幅（写操作失败必须显示原因）。 */
export function ErrorBanner(props: { message: string; onRetry?: () => void }) {
  return (
    <div className="banner-error show">
      <svg className="ic"><use href="#i-alert" /></svg>
      <span>{props.message}</span>
      {props.onRetry && (
        <button className="btn outline sm" style={{ marginLeft: "auto", flex: "none" }} onClick={props.onRetry}>重试</button>
      )}
    </div>
  );
}

/** 提取 API 错误的可读消息。 */
export function apiErr(res: { ok: boolean; status: number; data: unknown }, fallback: string): string {
  const d = res.data as { detail?: string; message?: string };
  return d?.detail ?? d?.message ?? `${fallback}（${res.status}）`;
}
