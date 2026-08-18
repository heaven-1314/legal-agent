# Outcome

用户可以把合同审查意见和法律文书从桌面客户端一键导出为 Word（.docx）文件保存到本地，替代手动复制 Markdown。

# Scope

- 后端新增两个下载端点：
  - `GET /api/review/runs/{run_id}/download.docx`
  - `GET /api/drafts/{draft_id}/download.docx`
- 后端实现 Markdown → docx 的简易转换器（标题/段落/有序无序列表/表格/加粗，基于已有 python-docx 依赖）。
- 桌面端：审查结果卡与文书结果卡各增加「导出 Word」按钮；点击后经主进程保存对话框（showSaveDialog）落盘，渲染层零文件系统访问（沿用 upload IPC 的同款边界）。
- PyInstaller sidecar 重新打包时携带 python-docx（已在 requirements-sidecar.txt）。

# Non-goals

- 不做完整 Markdown 样式还原（代码块、嵌套表格、图片不处理）。
- 不做 PDF 导出。
- 不做服务器 Web 页的下载入口（客户端优先；Web 页已有 download.md）。
- 不做模板化 Word 样式（抬头/页眉页脚/律所落款），后续需求另行立项。

# Acceptance examples

- A1 后端：存在历史审查记录时，`GET /api/review/runs/{id}/download.docx` 返回 200，Content-Type 为 docx，响应体为非空 zip（docx 即 zip 容器）。
- A2 后端：存在历史文书时，`GET /api/drafts/{id}/download.docx` 同上。
- A3 转换质量：md 中的二级标题、有序/无序列表、表格、加粗在生成的 docx 中有对应结构（段落样式或表格对象可检出）。
- A4 客户端：审查结果卡出现「导出 Word」按钮（DOM 断言），点击后文件写入用户选定路径（无头验证以固定路径保存断言文件存在且为 zip 头）。
- A5 客户端：文书结果卡同 A4。
- A6 边界：不存在的 run_id/draft_id 请求下载.docx 返回 404（干净失败，不返回半成品）。
- A7 回归：`download.md` 旧端点行为不变。

# Constraints and invariants

- 渲染层零文件系统访问：所有保存动作经主进程 IPC（现有边界纪律）。
- 新端点走现有 Bearer 鉴权。
- docx 生成在 sidecar 进程内完成（不新增子进程）。

# Decisions

- D1 转换器为后端共享工具函数（`app/services/docx_export.py`），两个端点复用；理由：客户端零依赖、Web 版未来可复用。
- D2 默认文件名：审查 `审查意见-{filename}.docx`，文书 `文书-{title或id前8位}.docx`。
- D3 简易 md 解析用正则逐行处理，不引入 markdown 解析库（依赖面最小）。

# Open questions

- [blocking] CONFIRM: 以上 Outcome/Scope/Non-goals/A1-A7/Decisions 是否按此执行？

# Verification expectations

- 后端：curl 断言 A1/A2/A6/A7（status/content-type/zip 魔数 PK）。
- 客户端：无头 DOM 断言按钮存在（A4/A5 前半），保存路径文件存在且以 PK 开头（A4/A5 后半）。
- 转换质量 A3：对生成的 docx 用 python zipfile 检出 document.xml 中的表格元素与列表段落。
