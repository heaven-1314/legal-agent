import { useEffect, useState } from "react";
import { bridge } from "../bridge.js";

export function DashboardView() {
  return (
    <div className="pg-root">
<div className="pg-head">
      <div className="grow">
        <h1 className="pg-title">仪表盘</h1>
        <div className="pg-sub">2026年8月18日 星期二 · 下午好，周律师</div>
      </div>
      <button className="btn outline"><svg className="ic"><use href="#i-doc"/></svg>导出周报</button>
      <button className="btn primary"><svg className="ic"><use href="#i-plus"/></svg>新建案件</button>
    </div>
    <div className="pg-body">
      <div className="stats">
        <div className="stat">
          <span className="stat-label">在办案件</span>
          <span className="stat-num">12<small>件</small></span>
          <span className="stat-sub">劳动仲裁 8 · 合同纠纷 3 · 其他 1</span>
        </div>
        <div className="stat">
          <span className="stat-label">本月咨询</span>
          <span className="stat-num">47<small>次</small></span>
          <span className="stat-sub"><em className="up">本周 9 次</em> · 已归档 41</span>
        </div>
        <div className="stat">
          <span className="stat-label">待办事项</span>
          <span className="stat-num">9<small>项</small></span>
          <span className="stat-sub"><em className="hot">今日到期 3 项</em> · 已逾期 0</span>
        </div>
        <div className="stat">
          <span className="stat-label">待审查合同</span>
          <span className="stat-num">5<small>份</small></span>
          <span className="stat-sub">高风险 2 · 平均用时 6 分钟</span>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><span className="card-title">快捷操作</span></div>
        <div className="quick">
          <button className="qa" data-page="consult"><svg className="ic"><use href="#i-chat"/></svg>发起智能咨询<small>Agent 对话 · 16 工具</small></button>
          <button className="qa" data-page="case"><svg className="ic"><use href="#i-folder"/></svg>新建劳动仲裁案<small>8 阶段全流程</small></button>
          <button className="qa" data-page="contract"><svg className="ic"><use href="#i-contract"/></svg>审查合同<small>高 / 中 / 低风险分级</small></button>
          <button className="qa" data-page="docgen"><svg className="ic"><use href="#i-pen"/></svg>生成文书<small>申请书 · 答辩状 · 函件</small></button>
          <button className="qa" data-page="calc"><svg className="ic"><use href="#i-calc"/></svg>赔偿计算<small>经济补偿 · 工伤 · 加班费</small></button>
          <button className="qa" disabled><svg className="ic"><use href="#i-shield"/></svg>卷宗脱敏<small>队列处理中 · 2 份</small></button>
        </div>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: '1fr 318px', gap: '16px', flex: '1', minHeight: '0'}}>
        <div className="card" style={{padding: '8px 6px 4px'}}>
          <div className="card-head" style={{padding: '6px 12px 8px', marginBottom: '4px'}}>
            <span className="card-title">最近案件</span>
            <button className="more" data-page="case">全部 12 件 →</button>
          </div>
          <table className="table">
            <thead><tr><th>案件</th><th>类型</th><th>阶段（8 阶段）</th><th>下一步待办</th><th>时限</th></tr></thead>
            <tbody>
              <tr>
                <td><div className="t-case">张某 诉 恒晟电子科技<small>杭劳人仲〔2026〕第0312号</small></div></td>
                <td><span className="badge b-accent">劳动仲裁</span></td>
                <td><span className="dots8"><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="cur"></i><i></i><i></i></span><small className="muted" style={{marginLeft: '6px'}}>开庭审理</small></td>
                <td>提交质证意见</td>
                <td className="due soon">08-21</td>
              </tr>
              <tr>
                <td><div className="t-case">李某 诉 云帆物流<small>杭劳人仲〔2026〕第0335号</small></div></td>
                <td><span className="badge b-accent">劳动仲裁</span></td>
                <td><span className="dots8"><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="cur"></i><i></i><i></i><i></i></span><small className="muted" style={{marginLeft: '6px'}}>受理答辩</small></td>
                <td>答辩期内提交证据</td>
                <td className="due urgent">08-19</td>
              </tr>
              <tr>
                <td><div className="t-case">王某 诉 蓝郡置业<small>杭劳人仲〔2026〕第0301号</small></div></td>
                <td><span className="badge b-accent">劳动仲裁</span></td>
                <td><span className="dots8"><i className="on"></i><i className="on"></i><i className="cur"></i><i></i><i></i><i></i><i></i><i></i></span><small className="muted" style={{marginLeft: '6px'}}>申请准备</small></td>
                <td>核对仲裁请求金额</td>
                <td className="due">08-26</td>
              </tr>
              <tr>
                <td><div className="t-case">陈某 诉 汇智软件<small>杭劳人仲〔2026〕第0287号</small></div></td>
                <td><span className="badge b-accent">劳动仲裁</span></td>
                <td><span className="dots8"><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="on"></i><i className="cur"></i><i></i></span><small className="muted" style={{marginLeft: '6px'}}>裁决</small></td>
                <td>领取裁决书并评估起诉</td>
                <td className="due">09-02</td>
              </tr>
              <tr>
                <td><div className="t-case">刘某 诉 鸿业商贸<small>（2026）浙0108民初4417号</small></div></td>
                <td><span className="badge b-neutral plain">合同纠纷</span></td>
                <td><span className="dots8"><i className="on"></i><i className="on"></i><i className="cur"></i><i></i><i></i><i></i><i></i><i></i></span><small className="muted" style={{marginLeft: '6px'}}>诉前准备</small></td>
                <td>补充证据清单</td>
                <td className="due">09-05</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
          <div className="card">
            <div className="card-head"><span className="card-title">今日待办</span><span className="badge b-mid plain" style={{marginLeft: 'auto'}}>3 项到期</span></div>
            <div className="todo">
              <div className="todo-item">
                <label className="check" style={{paddingTop: '1px'}}><input type="checkbox" aria-label="完成待办" /></label>
                <div className="todo-main">
                  <div className="todo-title">云帆物流案 · 提交答辩证据</div>
                  <div className="todo-meta"><span className="due-urgent"><svg className="ic" style={{width: '11px', height: '11px', verticalAlign: '-1.5px'}}><use href="#i-clock"/></svg> 今日 18:00 截止</span><span>负责人 周律师</span></div>
                </div>
              </div>
              <div className="todo-item">
                <label className="check" style={{paddingTop: '1px'}}><input type="checkbox" checked aria-label="完成待办" /></label>
                <div className="todo-main">
                  <div className="todo-title">恒晟案 · 回复当事人电话</div>
                  <div className="todo-meta"><span>已完成 15:20</span></div>
                </div>
              </div>
              <div className="todo-item">
                <label className="check" style={{paddingTop: '1px'}}><input type="checkbox" aria-label="完成待办" /></label>
                <div className="todo-main">
                  <div className="todo-title">技术服务合同 · 输出审查意见</div>
                  <div className="todo-meta"><span className="due-urgent">今日 20:00 截止</span><span>负责人 郑助理</span></div>
                </div>
              </div>
            </div>
          </div>
          <div className="card" style={{flex: '1'}}>
            <div className="card-head"><span className="card-title">内核动态</span></div>
            <div style={{fontSize: '12px', color: 'var(--muted)', lineHeight: '2'}}>
              <div className="row" style={{justifyContent: 'space-between'}}><span>今日工具调用</span><b className="mono" style={{color: 'var(--fg-strong)'}}>132 次</b></div>
              <div className="row" style={{justifyContent: 'space-between'}}><span>文书草稿生成</span><b className="mono" style={{color: 'var(--fg-strong)'}}>6 篇</b></div>
              <div className="row" style={{justifyContent: 'space-between'}}><span>卷宗解析队列</span><b className="mono" style={{color: 'var(--fg-strong)'}}>2 份</b></div>
              <div className="row" style={{justifyContent: 'space-between'}}><span>本地法条索引</span><b className="mono" style={{color: 'var(--fg-strong)'}}>已就绪</b></div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
