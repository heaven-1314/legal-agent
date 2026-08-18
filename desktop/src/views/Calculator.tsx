import { useEffect, useState } from "react";
import { bridge } from "../bridge.js";

export function CalculatorView() {
  return (
    <div className="pg-root">
<div className="ph">
          <div><h1>赔偿计算器</h1><p className="ph-desc">经济补偿 · 赔偿金 · 二倍工资差额 · 联动即时测算</p></div>
          <div className="ph-acts"><button className="btn outline sm" id="cexport"><svg className="ic"><use href="#i-doc"/></svg>导出测算报告</button></div>
        </div>
        <div className="pb" style={{flexDirection: 'row', gap: '16px'}}>
          <div className="card" style={{width: '352px', flex: 'none'}}>
            <div className="field">
              <div className="lab">月平均工资<span className="hint">离职前 12 个月应发口径</span></div>
              <div className="fm"><span className="pre">¥</span><input id="cwage" className="input" type="number" min="0" step="100" value="8000" aria-label="月平均工资" /></div>
              <div className="f-err" id="cwage-err">请输入大于 0 的月平均工资</div>
            </div>
            <div className="field">
              <div className="lab">入职日期</div>
              <input id="cstart" className="input" type="date" value="2019-07-01" aria-label="入职日期" />
            </div>
            <div className="field">
              <div className="lab">离职日期</div>
              <input id="cend" className="input" type="date" value="2024-06-30" aria-label="离职日期" />
              <div className="f-err" id="cdate-err">离职日期需晚于入职日期</div>
            </div>
            <div className="field">
              <div className="lab">离职原因</div>
              <select id="creason" className="select" aria-label="离职原因">
                <option value="weifa" selected>用人单位违法解除</option>
                <option value="hefa">无过失性辞退（未提前 30 日通知）</option>
                <option value="xieshang">协商一致解除（单位提出）</option>
                <option value="daoqi">合同到期终止（单位不续签）</option>
                <option value="cizhi">劳动者主动辞职</option>
              </select>
            </div>
            <div className="field">
              <div className="lab">书面劳动合同</div>
              <div className="row" style={{gap: '8px'}}>
                <button className="pill on" id="pcon-no" type="button">未签订</button>
                <button className="pill" id="pcon-yes" type="button">已签订</button>
              </div>
            </div>
            <div className="row" style={{gap: '8px', marginTop: '4px'}}>
              <button className="btn outline sm" id="creset"><svg className="ic"><use href="#i-refresh"/></svg>恢复示例值</button>
              <span className="hint" style={{marginLeft: 'auto'}}>修改任意项即时重算</span>
            </div>
          </div>
          <div style={{flex: '1', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '12px'}}>
            <div className="banner-error" id="cal-invalid"><svg className="ic"><use href="#i-alert"/></svg><span>表单尚未完整：请补全左侧标红字段后查看测算结果。</span></div>
            <div className="card">
              <span className="tc-cap">预计主张总额</span>
              <div className="tc-num" id="ctotal">—</div>
              <div className="tc-sub" id="csub">工龄口径与构成见分项明细</div>
            </div>
            <div className="card">
              <div className="card-head"><span className="card-title">分项明细</span><span className="badge b-neutral plain">依据条款已标注</span></div>
              <div id="cbreak"></div>
            </div>
            <div className="card">
              <div className="card-head"><span className="card-title">注意事项</span></div>
              <div className="note-li"><svg className="ic"><use href="#i-alert"/></svg><span>月工资高于当地社平工资 3 倍的，按 3 倍封顶计算，且补偿年限最高不超过 12 年（§47）。</span></div>
              <div className="note-li"><svg className="ic"><use href="#i-alert"/></svg><span>二倍工资差额多数地区按 11 个月封顶；用工满一年未订立的视为无固定期限合同（§14），此后不再支持。</span></div>
              <div className="note-li"><svg className="ic"><use href="#i-alert"/></svg><span>违法解除赔偿金（2N）与要求继续履行劳动合同系择一主张，不可并行（§48）。</span></div>
              <div className="note-li"><svg className="ic"><use href="#i-alert"/></svg><span>劳动仲裁时效为 1 年，自劳动关系终止之日起算；二倍工资的时效起算各地口径不一，主张前需核查。</span></div>
              <p className="disc" style={{marginTop: '6px'}}>测算结果为初步估算，正式主张前请结合当地司法口径与证据情况复核。</p>
            </div>
          </div>
        </div>
    </div>
  );
}
