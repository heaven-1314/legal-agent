import { useEffect, useState } from "react";
import { bridge } from "../bridge.js";

export function DueDiligenceView() {
  return (
    <div className="pg-root">
<div className="ph">
          <div><h1>尽职调查（阅卷）</h1><p className="ph-desc">材料解析 → 主体 · 时间线 · 争点 → 沉淀办案笔记</p></div>
        </div>
        <div className="pb" style={{flexDirection: 'row', gap: '14px'}}>
          <div style={{width: '332px', flex: 'none', display: 'flex', flexDirection: 'column', gap: '12px'}}>
            <div className="card">
              <div className="card-head"><span className="card-title">材料选择</span><span className="badge b-neutral plain" id="dmat-n">4 / 6 份</span></div>
              <label className="mat"><input type="checkbox" disabled /><span className="mn">劳动合同</span><span className="badge b-high mm">未提供</span></label>
              <label className="mat"><input type="checkbox" checked /><span className="mn">工资银行流水</span><span className="badge b-low mm">24 个月</span></label>
              <label className="mat"><input type="checkbox" checked /><span className="mn">社保缴纳记录</span><span className="badge b-low mm">已归档</span></label>
              <label className="mat"><input type="checkbox" checked /><span className="mn">解除通知微信记录</span><span className="badge b-low mm">已固定</span></label>
              <label className="mat"><input type="checkbox" checked /><span className="mn">考勤记录截图</span><span className="badge b-low mm">18 张</span></label>
              <label className="mat"><input type="checkbox" /><span className="mn">证人证言笔录</span><span className="badge b-mid mm">待补充</span></label>
            </div>
            <div className="card">
              <div className="card-head"><span className="card-title">针对性问题</span><span className="hint">引导阅卷重点</span></div>
              <textarea className="textarea" id="ddq" rows={5}>重点核查：① 入职时间与社保起缴时间是否一致；② 解除通知的发出主体、形式与送达时间；③ 工资流水中是否存在加班费科目；④ 是否存在关联公司混同用工。</textarea>
              <button className="btn primary" id="ddgo" style={{width: '100%', marginTop: '10px'}}><span className="spin"></span><svg className="ic"><use href="#i-scan"/></svg><span>开始阅卷（4 份材料）</span></button>
            </div>
          </div>
          <div style={{flex: '1', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '12px'}}>
            <div className="card">
              <div className="card-head">
                <span className="card-title">AI 阅卷结果</span>
                <span className="badge b-low" id="ddmeta">已完成 · 4 份材料</span>
                <button className="btn outline sm" id="ddre" style={{marginLeft: 'auto'}}><svg className="ic"><use href="#i-refresh"/></svg>重新阅卷</button>
              </div>
              <div id="ddprog" style={{display: 'none'}}>
                <div className="dd-step"><span className="st"><i className="dot"></i><span className="spin"></span><svg className="ic"><use href="#i-check"/></svg></span>解析材料文本（4 份 · 6.2 MB）</div>
                <div className="dd-step"><span className="st"><i className="dot"></i><span className="spin"></span><svg className="ic"><use href="#i-check"/></svg></span>抽取主体信息与关键日期</div>
                <div className="dd-step"><span className="st"><i className="dot"></i><span className="spin"></span><svg className="ic"><use href="#i-check"/></svg></span>归纳争议焦点并匹配法条依据</div>
              </div>
              <div id="ddres">
                <div className="seg">
                  <div className="seg-h"><svg className="ic" style={{color: 'var(--accent)'}}><use href="#i-shield"/></svg>主体识别</div>
                  <div className="kv"><span className="k">申请人</span><span className="v">张某 · 女 · 1990.04 · 产线质检员</span></div>
                  <div className="kv"><span className="k">被申请人</span><span className="v">恒晟电子科技有限公司 · 存续 · 社保开户与工资发放主体一致 <span className="badge b-low">已核验</span></span></div>
                  <div className="kv"><span className="k">用工形式</span><span className="v">事实劳动关系（未签书面合同）<span className="badge b-high">关注</span></span></div>
                </div>
                <div className="seg">
                  <div className="seg-h"><svg className="ic" style={{color: 'var(--accent)'}}><use href="#i-clock"/></svg>时间线</div>
                  <div className="tl">
                    <div className="tl-i"><span className="tl-d">2019-07-01</span>入职，建立事实劳动关系</div>
                    <div className="tl-i"><span className="tl-d">2019-08</span>社保改由关联公司代缴 <span className="badge b-mid" style={{height: '17px', fontSize: '10px'}}>待核实</span></div>
                    <div className="tl-i"><span className="tl-d">2024-06-28</span>主管口头通知班组解散（有录音）</div>
                    <div className="tl-i key"><span className="tl-d">2024-06-30</span>微信送达《解除通知》，理由“组织架构调整”</div>
                    <div className="tl-i"><span className="tl-d">2024-07-15</span>委托立案，未获任何补偿</div>
                  </div>
                </div>
                <div className="seg">
                  <div className="seg-h"><svg className="ic" style={{color: 'var(--accent)'}}><use href="#i-list"/></svg>争点归纳</div>
                  <div className="kv"><span className="k">争点一</span><span className="v"><b>是否构成违法解除</b> <span className="badge b-high">高</span> <span className="badge b-neutral plain">§87</span><br />单位以“组织架构调整”解除但未举证岗位撤销必要性，证据由单位掌握。</span></div>
                  <div className="kv"><span className="k">争点二</span><span className="v"><b>二倍工资差额与时效</b> <span className="badge b-high">高</span> <span className="badge b-neutral plain">§82</span><br />2019-08 至 2020-06 共 11 个月可主张，但距离职已超 1 年，存在时效抗辩风险。</span></div>
                  <div className="kv"><span className="k">争点三</span><span className="v"><b>加班费基数与举证</b> <span className="badge b-mid">中</span> <span className="badge b-neutral plain">劳动法 §44</span><br />流水中无加班费科目，需以考勤记录补强单位安排加班的事实。</span></div>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="card-head"><span className="card-title">历史笔记</span><button className="more" data-page="consult">全部 23 条 →</button></div>
              <div className="note"><span className="nd">08-12</span><span className="nt">庭前会议要点：仲裁请求第 2 项金额按 11 个月重新核对</span><span className="badge b-accent" style={{height: '18px', fontSize: '10.5px'}}>庭审</span><button className="linkish">查看</button></div>
              <div className="note"><span className="nd">08-05</span><span className="nt">与张某二次会见：补充微信原始载体与录音备份</span><span className="badge b-neutral" style={{height: '18px', fontSize: '10.5px'}}>会见</span><button className="linkish">查看</button></div>
              <div className="note"><span className="nd">07-30</span><span className="nt">阅卷 v1：缺在职证明与工资条原件，已通知委托人补充</span><span className="badge b-neutral" style={{height: '18px', fontSize: '10.5px'}}>阅卷</span><button className="linkish">查看</button></div>
            </div>
          </div>
        </div>
    </div>
  );
}
