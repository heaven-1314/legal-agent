import { useState } from "react";

const TYPES = [
  { key: "illegal", label: "违法解除劳动合同" },
  { key: "unsigned", label: "未签劳动合同二倍工资" },
  { key: "overtime", label: "加班费" },
  { key: "injury", label: "工伤认定" },
];

const DATA: Record<string, [string, string, "关键" | "重要" | "补充"][]> = {
  illegal: [
    ["劳动合同（如有）", "证明劳动关系——如未签订需其他证据替代", "关键"],
    ["工资流水/银行转账记录", "证明工资标准及劳动关系", "关键"],
    ["辞退通知/解除证明", "书面通知最佳；如无，录音也可", "关键"],
    ["考勤记录", "可从钉钉/企业微信/飞书导出", "重要"],
    ["工作群聊天记录", "微信/钉钉——含工作安排、汇报记录", "重要"],
    ["社保缴纳记录", "社保局 APP 或网站查询下载", "重要"],
    ["工作证/门禁卡/名片", "证明身份归属", "补充"],
  ],
  unsigned: [
    ["工资发放记录", "证明事实劳动关系存在", "关键"],
    ["工作证/工牌", "证明用人单位认可你的员工身份", "关键"],
    ["招聘记录/入职通知", "邮件/聊天记录中的入职沟通", "重要"],
    ["考勤打卡记录", "证明你遵守用人单位的管理制度", "重要"],
    ["同事证言", "其他员工证明你在该单位工作", "补充"],
  ],
  overtime: [
    ["考勤记录", "证明加班时间——打卡记录/系统截图", "关键"],
    ["工资条", "证明是否已支付加班费", "关键"],
    ["加班审批单", "主管签字的加班申请", "重要"],
    ["工作成果记录", "加班时间完成的工作", "重要"],
    ["劳动合同/规章制度", "确认工时制度和加班费计算方式", "补充"],
  ],
  injury: [
    ["医疗诊断证明", "医院出具的受伤诊断书", "关键"],
    ["工伤认定决定书", "社保部门出具（需在 30 日内申请）", "关键"],
    ["事故发生证据", "现场照片/监控/目击者证言", "关键"],
    ["劳动合同/劳动关系证明", "证明受伤时存在劳动关系", "重要"],
    ["医疗费用票据", "所有与工伤相关的医疗费用凭证", "重要"],
  ],
};

const LEVEL_CLASS: Record<string, string> = { 关键: "b-high", 重要: "b-mid", 补充: "b-low" };

export function EvidenceView() {
  const [type, setType] = useState("illegal");
  return (
    <div className="pg-root">
      <div className="pg-head">
        <div className="grow">
          <h1 className="pg-title">证据指引</h1>
          <div className="pg-sub">按主张类型 · 分级清单 · 获取途径</div>
        </div>
      </div>
      <div className="pg-body">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {TYPES.map((t) => (
            <button key={t.key} className={`btn ${type === t.key ? "primary" : "outline"}`} onClick={() => setType(t.key)}>{t.label}</button>
          ))}
        </div>
        <div className="card">
          {DATA[type].map(([name, how, level]) => (
            <div key={name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "9px 0", borderBottom: "1px solid var(--border)" }}>
              <span>
                <b style={{ fontSize: 13 }}>{name}</b>
                <div className="hint">{how}</div>
              </span>
              <span className={`badge ${LEVEL_CLASS[level]}`}>{level}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
