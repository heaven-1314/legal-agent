import type { AgentTool } from "@earendil-works/pi-agent-core";
import { Type } from "@earendil-works/pi-ai";

const calcParams = Type.Object({
  salary: Type.Number({ description: "月工资（税前，单位：元）" }),
  work_months: Type.Number({ description: "实际工作月数，如工作2年半填30" }),
  reason: Type.String({ description: "解除类型: illegal(违法解除2N) | negotiate(协商解除N) | expire(到期不续N)" }),
  unsigned_contract: Type.Optional(Type.Boolean({ description: "是否未签订书面劳动合同" })),
});

/** 法定劳动赔偿与补偿金额测算 */
export const compensationCalcTool: AgentTool<typeof calcParams> = {
  name: "legal_compensation_calc",
  label: "劳动赔偿测算",
  description: "精确测算经济补偿金（N）、违法解除赔偿金（2N）、未签劳动合同二倍工资差额。给出法定分项金额与计算公式明细。",
  parameters: calcParams,
  async execute(_id, p) {
    const s = Number(p.salary) || 0;
    const mo = Number(p.work_months) || 0;
    const years = mo / 12;
    const n = years < 0.5 ? 0.5 : Math.ceil(years);

    const items: Array<{ name: string; basis: string; amount: number }> = [];

    if (p.unsigned_contract && mo > 1) {
      const dm = Math.min(Math.floor(mo) - 1, 11);
      if (dm > 0) {
        items.push({
          name: "未签劳动合同二倍工资差额",
          basis: `《劳动合同法》第82条 · 最长11个月 (${dm}个月 × ${s}元)`,
          amount: s * dm,
        });
      }
    }

    if (p.reason === "illegal") {
      items.push({
        name: "违法解除赔偿金 (2N)",
        basis: `《劳动合同法》第87条 · 工作年限 ${n} 年 × 2 × ${s} 元`,
        amount: s * n * 2,
      });
    } else if (p.reason === "negotiate" || p.reason === "expire") {
      items.push({
        name: "经济补偿金 (N)",
        basis: `《劳动合同法》第47条 · 工作年限 ${n} 年 × ${s} 元`,
        amount: s * n,
      });
    }

    const total = items.reduce((sum, item) => sum + item.amount, 0);

    const result = {
      salary: s,
      work_months: mo,
      calculated_n: n,
      items,
      total_amount: total,
      disclaimer: "测算结果依据《中华人民共和国劳动合同法》基准规则生成，实际以仲裁委核定基数裁决为准。",
    };

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      details: result,
    };
  },
};
