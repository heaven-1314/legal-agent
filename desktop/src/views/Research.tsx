import { useEffect, useState } from "react";
import { bridge } from "../bridge.js";

export function ResearchView() {
  return (
    <div className="pg-root">
<div className="ph">
          <div><h1>法律检索</h1><p className="ph-desc">全文检索案卷、法条与判例 · 本地索引 2,483 份文档</p></div>
          <div className="ph-acts"><button className="btn outline sm"><svg className="ic"><use href="#i-refresh"/></svg>重建索引</button></div>
        </div>
        <div className="pb">
          <div className="sbar">
            <svg className="ic"><use href="#i-search"/></svg>
            <input id="sq" className="input" placeholder="输入关键词，如：违法解除 赔偿金" value="违法解除" aria-label="检索关键词" />
            <button id="sgo" className="btn primary" style={{height: '34px'}}>检索</button>
          </div>
          <div className="row" style={{gap: '6px', flexWrap: 'wrap'}}>
            <span className="cap">历史关键词</span>
            <button className="chip" data-q="违法解除">违法解除</button>
            <button className="chip" data-q="二倍工资">未签合同 二倍工资</button>
            <button className="chip" data-q="加班费">加班费 计算基数</button>
            <button className="chip" data-q="时效">仲裁时效</button>
            <button className="chip" data-q="社保">社保补缴</button>
          </div>
          <div className="tabs" id="stabs">
            <button className="tab on" data-ty="all">全部<b>6</b></button>
            <button className="tab" data-ty="law">法条<b>2</b></button>
            <button className="tab" data-ty="case">判例<b>2</b></button>
            <button className="tab" data-ty="doc">裁决文书<b>1</b></button>
            <button className="tab" data-ty="note">案件笔记<b>1</b></button>
          </div>
          <div className="row" style={{justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--muted)'}}><span>共 <b id="scount" style={{color: 'var(--fg-strong)'}}>6</b> 条结果</span><span>按相关度排序</span></div>
          <div className="slist" id="sres"></div>
          <div className="empty" id="sempty">
            <svg className="ic" style={{width: '36px', height: '36px', color: 'var(--border-strong)'}}><use href="#i-search"/></svg>
            <div className="empty-t" id="sempty-t">没有找到相关文档</div>
            <p className="empty-d">尝试更短的关键词，或切换上方文档类型；案卷类文档需先在「尽职调查」中归档入库。</p>
            <button className="btn ghost sm" id="sclear">清空关键词</button>
          </div>
        </div>
    </div>
  );
}
