export function CasesView() {
  return (
    <div className="cases">
      <div className="cases-empty">
        <div className="empty-title">案件视图</div>
        <p className="empty-sub">
          连接工具后端后，这里展示案件夹与劳动仲裁案件的 8 阶段进度表、待办清单和地区规则。
        </p>
        <ul className="cases-plan">
          <li>案件夹列表——委托人、文档数、最近更新</li>
          <li>劳动仲裁进度——咨询评估 → 证据收集 → … → 执行结案</li>
          <li>待办清单——按案件归组，可勾选完成</li>
        </ul>
        <div className="setup-tip">
          工具后端地址在
          <span className="mono">设置</span>
          中配置（默认 http://127.0.0.1:8091）。
        </div>
      </div>
    </div>
  );
}
