import { useState } from "react";
import { Page } from "./Matters.js";

/** 证据指引（移植旧页 EVIDENCE_DATA，四类主张）。 */
const TYPES = [
  { key: "illegal", label: "违法解除劳动合同" },
  { key: "unsigned", label: "未签劳动合同二倍工资" },
  { key: "overtime", label: "加班费" },
  { key: "injury", label: "工伤认定" },
];

const DATA: Record<string, [string, string, string][]> = {
  illegal: [
    ["劳动合同（如有）", "证明劳动关系——如未签订需其他证据替代", "关键"],
    ["工资流水/银行转账记录", "证明工资标准及劳动关系", "关键"],
    ["考勤记录", "可从钉钉/企业微信/飞书导出", "重要"],
    ["工作群聊天记录", "微信/钉钉——含工作安排、汇报记录", "重要"],
    ["辞退通知/解除证明", "书面通知最佳；如无，录音也可", "关键"],
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
    ["加班审批单", "主管签字的加班申请", "重要"],
    ["工作成果记录", "加班时间完成的工作", "重要"],
    ["工资条", "证明是否已支付加班费", "关键"],
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

export function EvidenceView() {
  const [type, setType] = useState("illegal");
  return (
    <Page title="证据指引">
      <label className="field" style={{ maxWidth: "36ch" }}>
        <span className="field-label">主张类型</span>
        <select value={type} onChange={(e) => setType(e.target.value)}>
          {TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
        </select>
      </label>
      <div className="rows">
        {DATA[type].map(([name, how, level]) => (
          <div key={name} className="row" style={{ cursor: "default" }}>
            <span className="row-main">
              <span className="row-title">{name}</span>
              <span className="row-sub">{how}</span>
            </span>
            <span className={`badge ${level === "关键" ? "warn" : level === "重要" ? "ok" : ""}`}>{level}</span>
          </div>
        ))}
      </div>
    </Page>
  );
}
