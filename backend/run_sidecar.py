"""桌面客户端 sidecar 入口（PyInstaller 打包为单文件二进制）。

环境变量：
- LEGAL_PORT：监听端口（默认随机 20000-40000）
- LEGAL_AGENT_DATA：数据目录（默认 ~/.legal-workbench/data）
- AI_BASE / AI_KEY / AI_MODEL：模型网关配置（由桌面主进程注入）
"""
from __future__ import annotations

import os
import random
import sys
from pathlib import Path


def main() -> None:
    port = int(os.environ.get("LEGAL_PORT") or 0)
    if port <= 0:
        port = random.randint(20000, 40000)
    os.environ.setdefault("LEGAL_AGENT_DATA", str(Path.home() / ".legal-workbench" / "data"))

    from app.config import ensure_data_dirs
    from app.main import app

    ensure_data_dirs()

    import uvicorn

    print(f"legal-agent sidecar ready on 127.0.0.1:{port}", flush=True)
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="warning")


if __name__ == "__main__":
    sys.exit(main())
