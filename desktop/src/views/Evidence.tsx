import { useEffect, useState } from "react";
import { bridge } from "../bridge.js";

export function EvidenceView() {
  return (
    <div className="pg-root">
<div className="ph">
          <div><h1>证据指引</h1><p className="ph-desc">按主张类型组织的取证清单 · 关键 / 重要 / 补充三级分级</p></div>
          <div className="ph-acts"><button className="btn outline sm"><svg className="ic"><use href="#i-doc"/></svg>导出清单</button></div>
        </div>
        <div className="pb">
          <div className="tabs" id="evtabs">
            <button className="tab on" data-ev="weifa">违法解除</button>
            <button className="tab" data-ev="double">未签二倍工资</button>
            <button className="tab" data-ev="ot">加班费</button>
            <button className="tab" data-ev="injury">工伤</button>
            <div className="row" style={{marginLeft: 'auto', gap: '6px', paddingRight: '2px', fontSize: '11px', color: 'var(--muted)'}}>
              <span className="badge b-accent">关键</span><span className="badge b-mid">重要</span><span className="badge b-neutral">补充</span>
            </div>
          </div>
          <div className="card" style={{padding: '6px 10px 8px'}}>
            <table className="table">
              <thead><tr><th style={{width: '172px'}}>证据名称</th><th>证明目的</th><th style={{width: '64px'}}>等级</th><th style={{width: '300px'}}>获取途径</th></tr></thead>
              <tbody id="evbody"></tbody>
            </table>
          </div>
          <p className="disc" id="evsum">证据等级依据对主张成立的证明力划分，非法定分类；关键证据缺失将直接影响立案受理或胜诉概率。</p>
        </div>
    </div>
  );
}
