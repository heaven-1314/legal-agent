import { useEffect, useState } from "react";
import { bridge } from "../bridge.js";

export function DraftsView() {
  return (
    <div className="pg-root">
<div className="ph">
          <div><h1>文书生成</h1><p className="ph-desc">模板 + 案件事实 → 结构化初稿 · 承办律师审签后生效</p></div>
        </div>
        <div className="pb">
          <div className="tpls">
            <button className="tpl on" data-tpl="arbitration"><svg className="ic"><use href="#i-doc"/></svg><div><div className="tpl-n">仲裁申请书</div><div className="tpl-d">劳动争议立案必备</div></div><span className="badge b-accent">高频</span><svg className="ic tick"><use href="#i-check"/></svg></button>
            <button className="tpl" data-tpl="defense"><svg className="ic"><use href="#i-contract"/></svg><div><div className="tpl-n">答辩状</div><div className="tpl-d">被申请人抗辩主张</div></div><svg className="ic tick"><use href="#i-check"/></svg></button>
            <button className="tpl" data-tpl="lawyer"><svg className="ic"><use href="#i-pen"/></svg><div><div className="tpl-n">律师函</div><div className="tpl-d">交涉 · 告知 · 限期履行</div></div><svg className="ic tick"><use href="#i-check"/></svg></button>
            <button className="tpl" data-tpl="demand"><svg className="ic"><use href="#i-clock"/></svg><div><div className="tpl-n">催告函</div><div className="tpl-d">工资与补偿支付催告</div></div><svg className="ic tick"><use href="#i-check"/></svg></button>
          </div>
          <div style={{display: 'flex', gap: '14px', minHeight: '0'}}>
            <div className="card" style={{width: '392px', flex: 'none'}}>
              <div className="card-head"><span className="card-title">案件事实输入</span></div>
              <div className="field"><div className="lab">申请人 / 委托人</div><input className="input" id="dparty1" value="张某" /></div>
              <div className="field"><div className="lab">被申请人 / 相对方</div><input className="input" id="dparty2" value="恒晟电子科技有限公司" /></div>
              <div className="field"><div className="lab">事实与理由要点<span className="hint">供 Agent 组织文书结构</span></div>
                <textarea className="textarea" id="dfacts" rows={9}>张某于 2019 年 7 月 1 日入职恒晟电子科技有限公司，担任产线质检员，月平均工资 8,000 元，工资按月转账发放。公司始终未与张某签订书面劳动合同。2024 年 6 月 28 日主管口头通知班组解散；6 月 30 日人事通过微信送达解除通知，理由为“组织架构调整”，未支付任何经济补偿，亦未出具离职证明。</textarea>
              </div>
              <div className="row" style={{gap: '8px'}}>
                <button className="btn primary" id="dgen"><span className="spin"></span><svg className="ic"><use href="#i-pen"/></svg><span>生成文书</span></button>
                <button className="btn ghost sm" id="dclear">恢复示例事实</button>
              </div>
            </div>
            <div className="card" style={{flex: '1', minWidth: '0', display: 'flex', flexDirection: 'column'}}>
              <div className="card-head">
                <span className="card-title">生成预览</span>
                <span className="badge b-low" id="dmeta">已生成 · 刚刚</span>
                <div className="row" style={{gap: '6px', marginLeft: 'auto'}}>
                  <button className="btn ghost sm" id="dcopy">复制文本</button>
                  <button className="btn primary sm" id="dexport"><svg className="ic"><use href="#i-doc"/></svg>导出 Word</button>
                </div>
              </div>
              <div className="pv-wrap"><div className="md-body" id="dbody"></div></div>
              <p className="disc" style={{marginTop: '8px'}}>初稿由 Pi Agent 依据模板与事实要点生成，主体信息、金额与日期须人工核对，正式提交前由承办律师审签。</p>
            </div>
          </div>
        </div>
    </div>
  );
}
