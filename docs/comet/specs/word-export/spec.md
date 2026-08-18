# word-export

法律工作台提供把审查意见与文书导出为 Word 文档的能力。

## 行为

1. 审查意见导出：`GET /api/review/runs/{run_id}/download.docx`，返回该 run 的意见全文 docx；run 不存在返回 404。
2. 文书导出：`GET /api/drafts/{draft_id}/download.docx`，返回该草稿全文 docx；草稿不存在返回 404。
3. 两个端点要求 Bearer 鉴权；Content-Type 为 `application/vnd.openxmlformats-officedocument.wordprocessingml.document`；默认文件名见 brief D2。
4. Markdown→docx 转换支持：一级~四级标题（Heading 样式）、段落、有序/无序列表、管道表格（Table 对象）、**加粗**（Run.bold）；其余语法按纯段落处理。
5. 桌面客户端审查结果卡与文书结果卡各有「导出 Word」按钮；保存路径由系统保存对话框选择；文件由主进程写入。
6. 旧 `download.md` 端点保持原有行为。
