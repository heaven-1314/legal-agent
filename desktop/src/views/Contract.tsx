import { useEffect, useState } from "react";
import { bridge } from "../bridge.js";

export function ContractView() {
  return (
    <div className="pg-root">
<div className="pg-head">
      <div className="grow">
        <h1 className="pg-title">合同审查</h1>
        <div className="pg-sub">文档比对 + 风险分级报告 · 支持批量队列</div>
      </div>
      <button className="btn outline"><svg className="ic"><use href="#i-doc"/></svg>审查历史</button>
      <button className="btn primary"><svg className="ic"><use href="#i-plus"/></svg>新建审查任务</button>
    </div>
    <div className="pg-body">
      <div className="split">
        <div style={{display: 'flex', flexDirection: 'column', gap: '16px', minHeight: '0', overflowY: 'auto', paddingRight: '2px'}}>
          <div className="card">
            <div className="card-head"><span className="card-title">选择文档</span><button className="more">文档库</button></div>
            <button className="doc sel">
              <svg className="ic"><use href="#i-contract"/></svg>
              <span><span className="doc-t">《技术服务合同》恒晟电子.pdf</span><span className="doc-m">24 页 · 1.8 MB · 今天 13:40 上传</span></span>
              <span className="radio" aria-hidden="true"></span>
            </button>
            <button className="doc">
              <svg className="ic"><use href="#i-doc"/></svg>
              <span><span className="doc-t">《保密协议》模板 v3.docx</span><span className="doc-m">6 页 · 210 KB · 08-16</span></span>
              <span className="radio" aria-hidden="true"></span>
            </button>
            <button className="doc">
              <svg className="ic"><use href="#i-doc"/></svg>
              <span><span className="doc-t">《房屋租赁合同》滨江店.pdf</span><span className="doc-m">11 页 · 960 KB · 08-14</span></span>
              <span className="radio" aria-hidden="true"></span>
            </button>
            <button className="upload"><svg className="ic" style={{width: '14px', height: '14px'}}><use href="#i-plus"/></svg>上传新文档（PDF / DOCX）</button>
          </div>
          <div className="card">
            <div className="card-head"><span className="card-title">审查设置</span></div>
            <div className="field" style={{marginBottom: '12px'}}>
              <label>审查维度<small className="hint"> · 可多选</small></label>
              <div className="dims">
                <label className="check"><input type="checkbox" checked />主体资格与签署效力</label>
                <label className="check"><input type="checkbox" checked />违约责任与赔偿上限</label>
                <label className="check"><input type="checkbox" checked />知识产权归属</label>
                <label className="check"><input type="checkbox" checked />付款与验收条件</label>
                <label className="check"><input type="checkbox" />竞业限制与保密</label>
                <label className="check"><input type="checkbox" disabled />争议解决条款（队列中）</label>
              </div>
            </div>
            <div className="form-row" style={{gridTemplateColumns: '88px 1fr', marginBottom: '12px'}}>
              <span className="lbl">审查口径</span>
              <select className="select"><option>标准（适合常规商务合同）</option><option>严格（诉讼视角，逐条排查）</option><option>宽松（仅标记重大风险）</option></select>
            </div>
            <div className="form-row" style={{gridTemplateColumns: '88px 1fr'}}>
              <span className="lbl">我方立场</span>
              <select className="select"><option>乙方（服务提供方）</option><option>甲方（委托方）</option></select>
            </div>
            <div className="form-actions" style={{justifyContent: 'stretch', border: 'none', marginTop: '12px', paddingTop: '0'}}>
              <button className="btn outline" style={{flex: '1'}}><svg className="ic"><use href="#i-refresh"/></svg>重新审查</button>
            </div>
          </div>
        </div>

        <div className="card" style={{minHeight: '0', display: 'flex', flexDirection: 'column'}}>
          <div className="card-head" style={{marginBottom: '8px'}}>
            <span className="card-title">风险报告</span>
            <span className="small muted" style={{marginLeft: 'auto'}}>审查完成 13:47 · 用时 6 分 12 秒</span>
            <button className="btn outline sm"><svg className="ic"><use href="#i-doc"/></svg>导出报告</button>
          </div>
          <div className="report-head" style={{marginBottom: '12px'}}>
            <span className="badge b-mid" style={{height: '26px', fontSize: '12.5px'}}>综合评级 · 中风险</span>
            <div className="score"><b style={{color: 'var(--risk-mid)'}}>62</b><span>/ 100</span></div>
            <div className="dist">
              <div className="dist-bar"><i className="h" style={{width: '18%'}}></i><i className="m" style={{width: '27%'}}></i><i className="l" style={{width: '55%'}}></i></div>
              <div className="dist-legend">
                <span>高 <b style={{color: 'var(--risk-high)'}}>2</b></span>
                <span>中 <b style={{color: 'var(--risk-mid)'}}>3</b></span>
                <span>低 <b style={{color: 'var(--risk-low)'}}>5</b></span>
              </div>
            </div>
          </div>
          <div style={{overflowY: 'auto', minHeight: '0', paddingRight: '2px'}}>
            <div className="finding open">
              <div className="f-head" data-toggle="finding">
                <span className="f-loc">第 12.1 条<small>争议解决 · 管辖</small></span>
                <span className="badge b-high">高风险</span>
                <svg className="ic" style={{width: '13px', height: '13px', color: 'var(--muted)'}}><use href="#i-chev"/></svg>
              </div>
              <div className="f-body">
                <div className="f-quote">因本合同发生争议，双方协商不成的，由甲方住所地人民法院管辖。</div>
                <div className="f-sug">删除单方住所地管辖约定，改为「被告住所地或合同履行地人民法院管辖」；如需确定性，可约定杭州仲裁委仲裁条款。</div>
                <div className="small muted" style={{marginTop: '6px'}}>依据：《民事诉讼法》第 35 条协议管辖范围 · 本地案例库命中 7 篇</div>
                <div className="f-acts">
                  <button className="btn primary sm"><svg className="ic"><use href="#i-check"/></svg>采纳修改</button>
                  <button className="btn outline sm">标记忽略</button>
                  <button className="btn ghost sm">查看原文定位</button>
                </div>
              </div>
            </div>
            <div className="finding">
              <div className="f-head" data-toggle="finding">
                <span className="f-loc">第 5.3 条<small>知识产权归属</small></span>
                <span className="badge b-high">高风险</span>
                <svg className="ic" style={{width: '13px', height: '13px', color: 'var(--muted)'}}><use href="#i-chev"/></svg>
              </div>
              <div className="f-body">
                <div className="f-quote">本项目全部交付成果（含源代码、文档）的知识产权自交付起归甲方所有。</div>
                <div className="f-sug">改为「甲方获得永久使用许可」，或对知识产权转让单独约定对价；保留乙方通用技术与工具的权利。</div>
                <div className="f-acts">
                  <button className="btn primary sm"><svg className="ic"><use href="#i-check"/></svg>采纳修改</button>
                  <button className="btn outline sm">标记忽略</button>
                </div>
              </div>
            </div>
            <div className="finding">
              <div className="f-head" data-toggle="finding">
                <span className="f-loc">第 8.2 条<small>违约金</small></span>
                <span className="badge b-mid">中风险</span>
                <svg className="ic" style={{width: '13px', height: '13px', color: 'var(--muted)'}}><use href="#i-chev"/></svg>
              </div>
              <div className="f-body">
                <div className="f-quote">任何一方违约的，应向守约方支付合同总额 30% 的违约金。</div>
                <div className="f-sug">30% 上限超出司法常见支持比例（损失的 30%），建议下调至 20% 并加「以实际损失为限」表述。</div>
                <div className="f-acts"><button className="btn primary sm"><svg className="ic"><use href="#i-check"/></svg>采纳修改</button><button className="btn outline sm">标记忽略</button></div>
              </div>
            </div>
            <div className="finding">
              <div className="f-head" data-toggle="finding">
                <span className="f-loc">第 4.1 条<small>付款条件</small></span>
                <span className="badge b-mid">中风险</span>
                <svg className="ic" style={{width: '13px', height: '13px', color: 'var(--muted)'}}><use href="#i-chev"/></svg>
              </div>
            </div>
            <div className="finding">
              <div className="f-head" data-toggle="finding">
                <span className="f-loc">第 10.2 条<small>保密期限</small></span>
                <span className="badge b-mid">中风险</span>
                <svg className="ic" style={{width: '13px', height: '13px', color: 'var(--muted)'}}><use href="#i-chev"/></svg>
              </div>
            </div>
            <div className="finding">
              <div className="f-head" data-toggle="finding">
                <span className="f-loc">第 3.2 条<small>通知送达</small></span>
                <span className="badge b-low">低风险</span>
                <svg className="ic" style={{width: '13px', height: '13px', color: 'var(--muted)'}}><use href="#i-chev"/></svg>
              </div>
            </div>
            <div className="f-note">另有 4 项低风险提示已折叠 · 展开查看全部 10 项</div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
