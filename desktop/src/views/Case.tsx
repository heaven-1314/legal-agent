import { useEffect, useState } from "react";
import { bridge } from "../bridge.js";

export function CaseView() {
  return (
    <div className="pg-root">
<div className="pg-head">
      <button className="btn ghost sm" aria-label="返回案件列表"><svg className="ic"><use href="#i-back"/></svg>返回</button>
      <div className="grow">
        <div className="crumb" style={{marginBottom: '2px'}}><a href="#" data-page="case">案件管理</a><svg className="ic" style={{width: '11px', height: '11px'}}><use href="#i-chev"/></svg><span className="cur">张某 诉 恒晟电子科技</span></div>
        <h1 className="pg-title" style={{fontSize: '19px'}}>张某 与 恒晟电子科技劳动争议仲裁案</h1>
        <div className="pg-sub">杭劳人仲〔2026〕第0312号 · 标的 ¥58,400 · 代理申请人</div>
      </div>
      <span className="badge b-accent" style={{height: '24px'}}>开庭审理 · 第 6 / 8 阶段</span>
      <button className="btn outline"><svg className="ic"><use href="#i-doc"/></svg>导出案卷</button>
    </div>
    <div className="pg-body">
      <div className="card" style={{padding: '14px 18px 12px'}}>
        <div className="card-head" style={{marginBottom: '4px'}}>
          <span className="card-title">仲裁进度</span>
          <span className="small muted" style={{marginLeft: 'auto'}}>2026-06-12 立案 · 已进行 67 天</span>
        </div>
        <div className="stagebar">
          <div className="stg done"><div className="stg-node"><svg className="ic"><use href="#i-check"/></svg></div><span className="stg-label">咨询评估</span></div>
          <div className="stg done"><div className="stg-node"><svg className="ic"><use href="#i-check"/></svg></div><span className="stg-label">证据收集</span></div>
          <div className="stg done"><div className="stg-node"><svg className="ic"><use href="#i-check"/></svg></div><span className="stg-label">申请准备</span></div>
          <div className="stg done"><div className="stg-node"><svg className="ic"><use href="#i-check"/></svg></div><span className="stg-label">提交仲裁委</span></div>
          <div className="stg done"><div className="stg-node"><svg className="ic"><use href="#i-check"/></svg></div><span className="stg-label">受理答辩</span></div>
          <div className="stg cur"><div className="stg-node">6</div><span className="stg-label">开庭审理</span></div>
          <div className="stg"><div className="stg-node">7</div><span className="stg-label">裁决</span></div>
          <div className="stg"><div className="stg-node">8</div><span className="stg-label">执行结案</span></div>
        </div>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: '1fr 318px', gap: '16px', flex: '1', minHeight: '0'}}>
        <div style={{display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '0'}}>
          <div className="card">
            <div className="card-head"><span className="card-title">案件信息</span></div>
            <div className="case-meta">
              <div><div className="k">申请人</div><div className="v">张某（1989-03 生 · 入职 2022-06）</div></div>
              <div><div className="k">被申请人</div><div className="v">恒晟电子科技有限公司</div></div>
              <div><div className="k">争议类型</div><div className="v">违法解除 + 工资差额</div></div>
              <div><div className="k">仲裁请求</div><div className="v">赔偿金 46,400 元 + 工资 12,000 元</div></div>
              <div><div className="k">立案日期</div><div className="v">2026-06-12</div></div>
              <div><div className="k">开庭日期</div><div className="v" style={{color: 'var(--risk-mid)', fontWeight: '600'}}>2026-08-26 14:30 · 第3仲裁庭</div></div>
              <div><div className="k">举证期限</div><div className="v">2026-08-21（仲裁委指定）</div></div>
              <div><div className="k">办案团队</div><div className="v">周律师（主办）· 郑助理</div></div>
            </div>
          </div>

          <div className="card" style={{flex: '1'}}>
            <div className="card-head">
              <span className="card-title">待办清单</span>
              <span className="badge b-mid plain" style={{marginLeft: 'auto'}}>6 项 · 2 项今日到期</span>
              <button className="btn outline sm"><svg className="ic"><use href="#i-plus"/></svg>新增</button>
            </div>
            <div className="todo">
              <div className="todo-item">
                <label className="check" style={{paddingTop: '2px'}}><input type="checkbox" aria-label="完成待办" /></label>
                <div className="todo-main">
                  <div className="todo-title">整理质证意见（对被申请人证据一至四）</div>
                  <div className="todo-meta"><span className="due-urgent"><svg className="ic" style={{width: '11px', height: '11px', verticalAlign: '-1.5px'}}><use href="#i-clock"/></svg> 08-21 截止</span><span>开庭前必办</span><span>负责人 周律师</span></div>
                </div>
                <span className="badge b-high">紧急</span>
              </div>
              <div className="todo-item">
                <label className="check" style={{paddingTop: '2px'}}><input type="checkbox" aria-label="完成待办" /></label>
                <div className="todo-main">
                  <div className="todo-title">与当事人确认工资流水明细（2026-03 至 05）</div>
                  <div className="todo-meta"><span className="due-urgent">今日 18:00 截止</span><span>负责人 郑助理</span></div>
                </div>
                <span className="badge b-high">紧急</span>
              </div>
              <div className="todo-item">
                <label className="check" style={{paddingTop: '2px'}}><input type="checkbox" aria-label="完成待办" /></label>
                <div className="todo-main">
                  <div className="todo-title">补充证据：辞退通知微信记录公证</div>
                  <div className="todo-meta"><span>08-20 截止</span><span>证据组 B</span></div>
                </div>
                <span className="badge b-mid">高</span>
              </div>
              <div className="todo-item done">
                <label className="check" style={{paddingTop: '2px'}}><input type="checkbox" checked aria-label="完成待办" /></label>
                <div className="todo-main">
                  <div className="todo-title">提交《仲裁申请书》及证据清单</div>
                  <div className="todo-meta"><span>已于 06-12 完成 · 仲裁委已接收</span></div>
                </div>
                <span className="badge b-neutral plain">已完成</span>
              </div>
              <div className="todo-item">
                <label className="check" style={{paddingTop: '2px'}}><input type="checkbox" aria-label="完成待办" /></label>
                <div className="todo-main">
                  <div className="todo-title">庭审提纲初稿（可用文书生成起草）</div>
                  <div className="todo-meta"><span>08-24 截止</span><span>负责人 周律师</span></div>
                </div>
                <span className="badge b-neutral plain">普通</span>
              </div>
            </div>
            <button className="todo-add"><svg className="ic" style={{width: '13px', height: '13px'}}><use href="#i-plus"/></svg>添加待办事项</button>
          </div>
        </div>

        <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
          <div className="card" style={{borderColor: 'oklch(0.88 0.05 75)'}}>
            <div className="card-head" style={{marginBottom: '6px'}}><span className="card-title">开庭倒计时</span></div>
            <div className="countdown"><b>8</b><span>天<br />2026-08-26 14:30</span></div>
            <div className="small muted" style={{marginTop: '8px', display: 'flex', gap: '6px', alignItems: 'center'}}>
              <svg className="ic" style={{width: '13px', height: '13px', color: 'var(--risk-mid)'}}><use href="#i-alert"/></svg>
              举证期限 08-21 截止，先于开庭
            </div>
          </div>
          <div className="card">
            <div className="card-head"><span className="card-title">规则参考</span><span className="small muted" style={{marginLeft: 'auto'}}>Agent 生成</span></div>
            <div className="rule">
              <div className="rule-title"><svg className="ic" style={{width: '13px', height: '13px'}}><use href="#i-book"/></svg>审理期限</div>
              <div className="rule-body">仲裁庭裁决劳动争议案件，应当自受理仲裁申请之日起四十五日内结束；案情复杂需要延期的，经批准可延长并书面通知当事人，延长期限不得超过十五日。</div>
              <div className="rule-src">《劳动争议调解仲裁法》第 43 条</div>
            </div>
            <div className="rule" style={{marginTop: '8px'}}>
              <div className="rule-title"><svg className="ic" style={{width: '13px', height: '13px'}}><use href="#i-book"/></svg>举证责任</div>
              <div className="rule-body">与争议事项有关的证据属于用人单位掌握管理的，用人单位应当提供；不提供的，应当承担不利后果。</div>
              <div className="rule-src">《劳动争议调解仲裁法》第 6 条 · 最高法解释一第 44 条</div>
            </div>
            <div className="rule" style={{marginTop: '8px'}}>
              <div className="rule-title"><svg className="ic" style={{width: '13px', height: '13px'}}><use href="#i-book"/></svg>一裁终局</div>
              <div className="rule-body">本案标的未超当地月最低工资标准十二个月金额，属第 47 条一裁终局范围，双方救济路径不同，需提前向当事人释明。</div>
              <div className="rule-src">《劳动争议调解仲裁法》第 47 / 48 / 49 条</div>
            </div>
          </div>
          <div className="card">
            <div className="card-head"><span className="card-title">关联文书</span></div>
            <div className="row" style={{justifyContent: 'space-between', padding: '5px 0', fontSize: '12.5px'}}>
              <span className="row" style={{gap: '7px'}}><svg className="ic" style={{color: 'var(--accent)'}}><use href="#i-doc"/></svg>仲裁申请书</span><span className="badge b-low">已定稿</span>
            </div>
            <div className="row" style={{justifyContent: 'space-between', padding: '5px 0', fontSize: '12.5px'}}>
              <span className="row" style={{gap: '7px'}}><svg className="ic" style={{color: 'var(--accent)'}}><use href="#i-doc"/></svg>证据清单（12 项）</span><span className="badge b-mid">待核对</span>
            </div>
            <div className="row" style={{justifyContent: 'space-between', padding: '5px 0', fontSize: '12.5px'}}>
              <span className="row" style={{gap: '7px'}}><svg className="ic" style={{color: 'var(--accent)'}}><use href="#i-pen"/></svg>质证意见</span><span className="badge b-neutral plain">未开始</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
