# legal-agent

> 🌐 **在线体验（Web 版，持续部署）**：<http://8.152.157.178:5002/legal-agent/>

法律垂类 Agent 工作台（个人项目）。产品决策见 knowledge-base wiki **项目-法律Agent**。

## 状态

- 阶段：v0.4.6（13 页工作台 · Web + Electron 桌面端）
- 默认 V1 尖刀：合同审查
- 形态：Web + Electron 桌面端（Win / macOS / Linux 全平台自动发版）

## 本地运行

```bash
# backend
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export LEGAL_AGENT_DATA=/data/legal-agent
export AI_BASE=http://127.0.0.1:3000/v1
export AI_KEY=   # 填 new-api key
export AI_MODEL=deepseek-v4-flash
uvicorn app.main:app --host 127.0.0.1 --port 8091 --reload

# web（V0 后半）
cd web && npm i && npm run dev
```

## 数据目录

`/data/legal-agent/{uploads,sqlite,logs}` — 大文件不进系统盘仓库。

## 纪律

- 不把 `legal-rag` 当架构蓝图
- 密钥只进环境变量
- 前端禁止硬编码公网 IP
