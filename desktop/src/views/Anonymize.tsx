import { useEffect, useState } from "react";
import { bridge } from "../bridge.js";

export function AnonymizeView() {
  return (
    <div className="pg-root">
<div className="ph">
          <div><h1>脱敏工具</h1><p className="ph-desc">手机号 · 身份证 · 银行卡一键脱敏 · 全程本地处理</p></div>
        </div>
        <div className="pb">
          <div style={{display: 'flex', gap: '12px'}}>
            <div className="msw"><button className="sw on" role="switch" aria-checked="true" data-msk="phone" aria-label="手机号脱敏开关"></button><div><div className="msw-n">手机号</div><div className="msw-d">保留前 3 位与后 4 位</div></div><span className="badge" id="cnt-phone">2 处</span></div>
            <div className="msw"><button className="sw on" role="switch" aria-checked="true" data-msk="id" aria-label="身份证脱敏开关"></button><div><div className="msw-n">身份证号</div><div className="msw-d">保留前 6 位与后 4 位</div></div><span className="badge" id="cnt-id">1 处</span></div>
            <div className="msw"><button className="sw on" role="switch" aria-checked="true" data-msk="bank" aria-label="银行卡脱敏开关"></button><div><div className="msw-n">银行卡号</div><div className="msw-d">仅保留后 4 位</div></div><span className="badge" id="cnt-bank">1 处</span></div>
            <div className="msw" style={{flex: '1', borderStyle: 'dashed', background: 'transparent', cursor: 'default'}}>
              <svg className="ic" style={{color: 'var(--accent)'}}><use href="#i-shield"/></svg>
              <div><div className="msw-n">本地处理</div><div className="msw-d">原文与结果均不上传服务器，关闭页面即丢弃</div></div>
            </div>
          </div>
          <div style={{display: 'flex', gap: '14px', minHeight: '0'}}>
            <div className="card" style={{flex: '1', minWidth: '0', display: 'flex', flexDirection: 'column'}}>
              <div className="card-head"><span className="card-title">原文粘贴</span><span className="hint" id="mcount">178 字</span><button className="btn ghost sm" id="mclear" style={{marginLeft: 'auto'}}>清空原文</button></div>
              <textarea className="textarea" id="mta" rows={10} style={{flex: '1'}}>申请人：张某，女，身份证号 320102199004153628，联系电话 13812775623。在职期间，被申请人每月通过尾号 6222023012345678 的银行账户发放工资。其同事李某（电话 13915583421）可证明长期加班事实。承办律师：王某，律所座机 0512-66881234。</textarea>
            </div>
            <div className="card" style={{flex: '1', minWidth: '0', display: 'flex', flexDirection: 'column'}}>
              <div className="card-head"><span className="card-title">脱敏结果</span><span className="mstat" id="mstat"></span>
                <div className="row" style={{gap: '6px', marginLeft: 'auto'}}><button className="btn ghost sm" id="mreset">恢复示例原文</button><button className="btn primary sm" id="mcopy"><svg className="ic"><use href="#i-check"/></svg><span>复制脱敏文本</span></button></div>
              </div>
              <div className="mout" id="mout" style={{flex: '1'}}></div>
            </div>
          </div>
        </div>
    </div>
  );
}
