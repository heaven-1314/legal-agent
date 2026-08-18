import { useEffect, useState } from "react";
import { bridge } from "../bridge.js";

export function KnowledgeView() {
  return (
    <div className="pg-root">
<div className="ph">
          <div><h1>知识库</h1><p className="ph-desc">常用法条速查 · 原文引块与实务解读 · 关联办案工具</p></div>
        </div>
        <div className="pb" style={{flexDirection: 'row', gap: '14px'}}>
          <div className="card" style={{width: '224px', flex: 'none', alignSelf: 'flex-start'}}>
            <input className="input" id="kbq" placeholder="搜索条名或原文…" aria-label="搜索法条" style={{marginBottom: '10px'}} />
            <button className="kn-item on" data-cat="all">全部<span className="badge">9</span></button>
            <button className="kn-item" data-cat="lc">劳动合同法<span className="badge">5</span></button>
            <button className="kn-item" data-cat="ld">劳动法<span className="badge">2</span></button>
            <button className="kn-item" data-cat="mx">民法典<span className="badge">2</span></button>
          </div>
          <div style={{flex: '1', minWidth: '0'}}>
            <div id="kbcards"></div>
            <div className="empty" id="kbempty">
              <svg className="ic" style={{width: '36px', height: '36px', color: 'var(--border-strong)'}}><use href="#i-book"/></svg>
              <div className="empty-t">没有匹配的法条</div>
              <p className="empty-d">换一个关键词，或清除分类过滤后重新检索。</p>
              <button className="btn ghost sm" id="kbclear">清除搜索与过滤</button>
            </div>
          </div>
        </div>
    </div>
  );
}
