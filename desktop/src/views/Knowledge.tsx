import { useState } from "react";
import { UploadButton } from "./UploadButton.js";

const LAWS: Record<string, { title: string; sections: { name: string; text: string; note: string }[] }> = {
  lc: {
    title: "《劳动合同法》",
    sections: [
      { name: "第八十二条 不订立书面合同的责任", text: "用人单位自用工之日起超过一个月不满一年未与劳动者订立书面劳动合同的，应当向劳动者每月支付二倍的工资。", note: "起算：用工满 1 个月的次日；上限 11 个月；时效 1 年。" },
      { name: "第八十七条 违法解除", text: "用人单位违反本法规定解除或者终止劳动合同的，应当依照本法第四十七条规定的经济补偿标准的二倍向劳动者支付赔偿金。", note: "即 2N；与 §47 的 N 不可同时主张。" },
      { name: "第四十七条 经济补偿", text: "经济补偿按劳动者在本单位工作的年限，每满一年支付一个月工资的标准向劳动者支付。六个月以上不满一年的，按一年计算；不满六个月的，向劳动者支付半个月工资的经济补偿。", note: "月工资高于当地社平 3 倍的，按 3 倍计且上限 12 年。" },
      { name: "第十九条 试用期上限", text: "劳动合同期限三个月以上不满一年的，试用期不得超过一个月；一年以上不满三年的，试用期不得超过二个月；三年以上固定期限和无固定期限的劳动合同，试用期不得超过六个月。", note: "同一用人单位与同一劳动者只能约定一次试用期。" },
      { name: "第五十条 离职证明与档案", text: "用人单位应当在解除或者终止劳动合同时出具解除或者终止劳动合同的证明，并在十五日内为劳动者办理档案和社会保险关系转移手续。", note: "拒不开具的，可主张就业损失赔偿。" },
    ],
  },
  ld: {
    title: "《劳动法》",
    sections: [
      { name: "第四十四条 延长工时的工资报酬", text: "安排劳动者延长工作时间的，支付不低于工资的百分之一百五十的工资报酬；休息日安排劳动者工作又不能安排补休的，支付不低于工资的百分之二百的工资报酬…", note: "法定休假日加班 = 300%，不可用补休替代。" },
      { name: "第五十条 工资支付", text: "工资应当以货币形式按月支付给劳动者本人。不得克扣或者无故拖欠劳动者的工资。", note: "拖欠工资的加付赔偿金标准为 50%-100%（责令后逾期不付）。" },
    ],
  },
  mx: {
    title: "《民法典》",
    sections: [
      { name: "第一百五十八条 附条件民事法律行为", text: "民事法律行为可以附条件……附生效条件的，自条件成就时生效。", note: "合同中「以××为付款前提」类条款的效力基础。" },
      { name: "第五百七十七条 违约责任", text: "当事人一方不履行合同义务或者履行合同义务不符合约定的，应当承担继续履行、采取补救措施或者赔偿损失等违约责任。", note: "与《劳动合同法》竞合时，劳动争议优先适用特别法。" },
    ],
  },
};

export function KnowledgeView() {
  const [key, setKey] = useState("lc");
  const [q, setQ] = useState("");
  const law = LAWS[key];
  const filtered = q.trim()
    ? law.sections.filter((s) => s.name.includes(q) || s.text.includes(q) || s.note.includes(q))
    : law.sections;

  return (
    <div className="pg-root">
      <div className="pg-head">
        <div className="grow">
          <h1 className="pg-title">知识库</h1>
          <div className="pg-sub">常用法条速查 · 原文引块 · 实务解读</div>
        </div>
      </div>
      <div className="pg-body" style={{ flexDirection: "row", gap: 14 }}>
        <div className="card" style={{ width: 224, flex: "none", alignSelf: "flex-start" }}>
          <input className="input" style={{ marginBottom: 10 }} value={q} placeholder="搜索条名或原文…" onChange={(e) => setQ(e.target.value)} aria-label="搜索法条" />
          <button className={`btn ${key === "lc" ? "primary" : "outline"}`} style={{ width: "100%", marginBottom: 6, justifyContent: "flex-start" }} onClick={() => setKey("lc")}>劳动合同法 <span className="badge">5</span></button>
          <button className={`btn ${key === "ld" ? "primary" : "outline"}`} style={{ width: "100%", marginBottom: 6, justifyContent: "flex-start" }} onClick={() => setKey("ld")}>劳动法 <span className="badge">2</span></button>
          <button className={`btn ${key === "mx" ? "primary" : "outline"}`} style={{ width: "100%", justifyContent: "flex-start" }} onClick={() => setKey("mx")}>民法典 <span className="badge">2</span></button>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {filtered.length === 0 ? (
            <div className="empty">
              <div className="empty-t">没有匹配的法条</div>
              <p className="empty-d">换关键词，或上传你自己的法条/资料库</p>
              <UploadButton onUploaded={() => {}} label="上传知识库文档" />
            </div>
          ) : (
            filtered.map((s) => (
              <div key={s.name} className="card" style={{ marginBottom: 12 }}>
                <b style={{ fontSize: 13.5, color: "var(--fg-strong)" }}>{law.title} · {s.name}</b>
                <div style={{ borderLeft: "2px solid var(--accent-line)", paddingLeft: 12, margin: "8px 0", fontSize: 13, lineHeight: 1.7, color: "var(--fg)" }}>{s.text}</div>
                <div className="hint">💡 {s.note}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
