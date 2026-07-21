# 法律 Agent 工作台 — 可执行开发计划

> 产品决策源：wiki `项目-法律Agent`（2026-07-21）  
> 状态：planning → V0 实施中  
> 默认尖刀：**合同审查**（可改；改则只替换 Phase 2 模块，地基不变）

---

## Phase 0 · 文档与环境约定（Allowed patterns）

### 本机可复制模式（已核实）

| 模式 | 来源 | 用法 |
|---|---|---|
| FastAPI 单仓 `backend/server.py` + `config.py` | `zentao-analysis/backend/` | 新项目沿用；密钥只进 env |
| LLM：OpenAI-compatible | `AI_BASE` + `AI_KEY` + `AI_MODEL` | 默认走 new-api：`http://127.0.0.1:3000/v1`，`POST {AI_BASE}/chat/completions` |
| 模型默认 | `deepseek-v4-flash` 等 | 可配置，不写死业务逻辑 |
| 鉴权 | 禅道审计：账号表 + session | V0 可用 **单用户 dev token / 简单账号表**；多租户后置 |
| 大文件/数据 | `/data` | 文档与向量库落 `/data/legal-agent/`，代码在 `/root/projects/legal-agent` |
| 禁止 | `systemctl restart docker`；前端硬编码绝对路径；`git add -A` 扫知识库 | 见 CLAUDE.md |

### 明确禁止

- 把 `/root/projects/legal-rag` 当架构蓝图（零件可后期捡，不先读设计）
- V1 做完整 Alpha / 亿级类案爬虫 / 律所 OA 全家桶
- V1 主战场做小程序/原生 App
- 全 Rust 业务代码

### 未决（用默认值开工，可改）

| 项 | 默认 | 改法 |
|---|---|---|
| V1 尖刀 | 合同审查 | 只换 Phase 2 |
| 桌面壳 | V1.5 Tauri | 可改 Electron |
| Pi 课 | 业余并行，不阻塞 V0 | — |

---

## 仓库布局

```text
/root/projects/legal-agent/          # 代码
  PLAN.md / README.md
  backend/                           # FastAPI
    app/
      main.py
      config.py
      api/                           # routes
      domain/                        # 纯逻辑
      services/                      # llm, storage, parse
    requirements.txt
    tests/
  web/                               # Next.js 15 App Router
  scripts/
  docs/

/data/legal-agent/                   # 运行时数据
  uploads/
  sqlite/
  logs/
```

---

## Phase 1 · V0 地基（目标：可登录、可上传文档、可私库检索、可调模型、有审计日志）

### 1.1 后端骨架
- [ ] FastAPI app：`/health`、CORS（dev）、配置从 env
- [ ] SQLite：`users` / `documents` / `chunks` / `audit_log` / `matters`（案件夹轻量）
- [ ] 文档上传：保存到 `/data/legal-agent/uploads/{id}/`
- [ ] 文本抽取：先 PDF/纯文本/docx 最小通路（OCR 后置）
- [ ] 分块 + 简易向量或先 **BM25/FTS5**（V0 不强制 embedding 服务）
- [ ] LLM 客户端：复制禅道 `AI_BASE/AI_KEY/AI_MODEL` 模式
- [ ] 审计日志：谁、何时、何操作、文档 id、模型名（无卷宗路径进公开错误）

### 1.2 前端骨架
- [ ] Next.js + TS + Tailwind：登录（dev）、文档列表、上传、检索试框、设置（模型名只读显示）
- [ ] API base 用相对路径或 `NEXT_PUBLIC_API_BASE`（禁止硬编码公网 IP）

### 1.3 DoD
- [ ] `curl /health` 200
- [ ] 上传一份 txt/pdf → 列表可见 → 关键词能搜到片段
- [ ] 调一次 chat/completions 返回 JSON（可用 Scripted/假响应测无 key）
- [ ] `audit_log` 有记录

### 1.4 不做
- 合同审查完整检查单、批注导出
- Tauri、多租户、利冲、财务

---

## Phase 2 · V1 合同审查（默认尖刀）

### 2.1 领域
- 检查单 schema（YAML/JSON，可按所定制）
- 流程：**解析 → 检索私库/法规条文（若有）→ 按检查单跑 LLM（structured）→ 风险表 + 意见书草稿**
- 引用：合同原文定位（页/段落 id）+ 法规引用字段
- 导出：Markdown/docx 意见书（可先 md）

### 2.2 DoD
- 上传合同 → 选检查单 → 出风险列表（含 severity + 原文摘录）→ 导出意见书
- 强制路径：无检索/检查单结果时 API 拒绝「直接闲聊当审查」

### 2.3 不做
- 全网类案、Alpha 检索对标、批注写回 Word 修订模式（可 V1.1）

---

## Phase 3 · V1.1 加固

- 真 embedding（可选 pgvector/sqlite-vss）
- 更稳的 PDF 解析
- 权限与所级私库隔离
- 引用校验与幻觉压降

---

## Phase 4 · V1.5 桌面壳（Tauri）

- 现有 Web 嵌入；文件对话框走原生命令
- 安装包 Win 优先

---

## Phase 5 · L1 扩展（V2–V4）

- 阅卷 → 文书 → 检测/检索报告  
- 共享：matter、document、citation、audit、agent graph

---

## Pi 课并行边界

| 产品代码 | Pi 课 |
|---|---|
| FastAPI 业务 API、检查单、导出 | pi-course 00–14 业余练 |
| 强制编排节点可借鉴 loop 不变量 | 不把 pi-course 当依赖 |
| 不阻塞 V0 上线 | 目标：工程师有硬 loop 体感后再加深 composition |

---

## 验证总清单

- [ ] 无密钥进 git
- [ ] 无 legal-rag 目录结构复制
- [ ] 数据在 `/data/legal-agent`
- [ ] 每阶段有可 curl/浏览器复现步骤
- [ ] wiki 项目页在里程碑后更新 status

---

## 实现顺序（本会话起）

1. 建仓 + README + env 样例  
2. backend health + config + sqlite schema  
3. upload + list documents  
4. FTS 检索  
5. LLM client 探针  
6. web 最小页  
7. 再开 Phase 2 合同审查
