import { useState } from "react";
import { Page } from "./Matters.js";

/** 知识库（移植旧页硬编码法条）。 */
const LAWS: Record<string, { title: string; sections: { name: string; text: string }[] }> = {
  lsc: {
    title: "《劳动合同法》",
    sections: [
      { name: "第八十二条 不订立书面合同的责任", text: "用人单位自用工之日起超过一个月不满一年未与劳动者订立书面劳动合同的，应当向劳动者每月支付二倍的工资。" },
      { name: "第八十七条 违法解除", text: "用人单位违反本法规定解除或者终止劳动合同的，应当依照本法第四十七条规定的经济补偿标准的二倍向劳动者支付赔偿金。" },
      { name: "第四十七条 经济补偿", text: "经济补偿按劳动者在本单位工作的年限，每满一年支付一个月工资的标准向劳动者支付。六个月以上不满一年的，按一年计算；不满六个月的，向劳动者支付半个月工资的经济补偿。" },
    ],
  },
  labor: {
    title: "《劳动法》",
    sections: [{ name: "总则", text: "劳动法是调整劳动关系以及与劳动关系密切联系的社会关系的法律规范总称。" }],
  },
  civil: {
    title: "《民法典》",
    sections: [{ name: "第一百五十八条 附条件民事法律行为", text: "民事法律行为可以附条件……附生效条件的，自条件成就时生效。" }],
  },
};

export function KnowledgeView() {
  const [key, setKey] = useState("lsc");
  const law = LAWS[key];
  return (
    <Page title="知识库">
      <div className="kb-tabs">
        <button className={`mode-btn ${key === "lsc" ? "on" : ""}`} onClick={() => setKey("lsc")}>劳动合同法</button>
        <button className={`mode-btn ${key === "labor" ? "on" : ""}`} onClick={() => setKey("labor")}>劳动法</button>
        <button className={`mode-btn ${key === "civil" ? "on" : ""}`} onClick={() => setKey("civil")}>民法典</button>
      </div>
      <div className="card">
        <h3>{law.title}</h3>
        {law.sections.map((s) => (
          <div key={s.name} className="kb-section">
            <div className="kb-name">{s.name}</div>
            <div className="kb-quote">{s.text}</div>
          </div>
        ))}
      </div>
    </Page>
  );
}
