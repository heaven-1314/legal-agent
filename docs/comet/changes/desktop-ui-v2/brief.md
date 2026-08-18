# Outcome

桌面客户端前端整体重设计（OpenDesign 出方向）：12+1 模块的信息架构分组收纳、五个代表页高保真重构、Pi 内核品牌位、组件词汇统一，消除"裸写页面的粗糙感"。

# Scope

- 侧栏信息架构：13 项分组（工作台/办案/工具/参考 + 底部设置与内核状态）
- 设计系统单一来源：tokens（色/字/间距/圆角）+ 统一组件类，按 OD 定稿方向精修
- **全部 12 个页面**高保真（仪表盘/智能咨询/检索/审查/计算器/文书/尽调/证据/知识库/脱敏/案件管理/设置）——OD 两轮设计稿覆盖，无占位页
- 「多平台对比」页移除（用户决策）
- Pi 品牌位：侧栏底部内核状态（Pi agent-core · 模型 · 工具数）
- **模型获取**：设置页填网关地址+Key 后可一键拉取 /models 真实模型列表供下拉选择
- **过渡动画体系**：页面切换/内容加载的克制过渡（150-250ms，ease-out，reduced-motion 兜底）

# Non-goals

- 不改任何后端 API 与业务逻辑（纯前端层）
- 不引入 UI 框架（保持手写 CSS + React，零运行时依赖新增）
- 不做多主题/换肤

# Acceptance examples

- A1 信息架构：侧栏四个分组标题 + 全部 13 项入口在 DOM 可断言（工作台：仪表盘/智能咨询；办案：案件/审查/文书/尽调/检索；工具：计算器/脱敏；参考：证据/知识库/对比）
- A2 桌面形态：构建产物含菜单移除（main 源码 setApplicationMenu(null) 进 dist-electron），无 File/Edit 默认菜单
- A3 Pi 品牌位：侧栏底部内核状态区渲染（Pi agent-core / 模型名 / 16 工具数 DOM 文本断言）
- A4 五页高保真：仪表盘（统计+快捷+最近案件）、咨询（对话+工具轨迹行）、案件详情（8 阶段 stepper+待办+规则卡）、审查（文档选择+风险分级高/中/低呈现）、设置（网关+测试连接诊断+内核信息）——每页 ≥3 个关键元素 DOM 断言
- A5 设计系统统一：全部视图组件样式来自统一 tokens/类（Runtime 检查：views/*.tsx 中无散落内联颜色字面量；样式集中在 app.css）
- A6 三态覆盖：功能页具备 加载/空态/后端不可达 三态（抽查 3 页 DOM）
- A7 功能回归：审查无头全链（选文档→审查→导出 Word 落盘 PK）、sidecar 健康、计算器数值断言（¥84,000）——沿用既有检查
- A8 视觉审查：代表页无头截图经视觉模型审"专业感/一致性/无 AI 味"，每页无严重异常
- A9 模型获取：设置页「获取模型」拉 /models 填充下拉（主进程 IPC + 下拉绑定；真实网关 DOM 断言含 glm 项）
- A10 过渡动画：页面切换/加载过渡存在且带 prefers-reduced-motion 降级（CSS 断言 150-250ms）
- A11 移除对比页：导航与路由不再含 compare

# Constraints and invariants

- 浅色主题（禁深色/渐变文字/发光），中文排版
- 渲染层零网络零文件系统（沿用 IPC 边界）
- 视觉方向以 OD 定稿（run 5b26b10b）+ 用户确认为准

# Decisions

- D1 走 OpenDesign product-shell 流程出整体方向（用户指定 OD 优先）
- D2 设计稿确认后按 tokens→组件→逐页顺序落地
- D3 现有墨绿 accent 保留与否由 OD 稿定夺（identity preservation vs 重构）

# Open questions

- [blocking] CONFIRM: OD 设计稿方向（待 run 完成给用户过目）+ 本验收清单是否照此执行？

# Verification expectations

- 无头 DOM 断言全页面（OPEN_VIEW 轮跑）
- Runtime 检查：tsc / 回归链 / 内联样式扫描
- 视觉模型审查五页截图
