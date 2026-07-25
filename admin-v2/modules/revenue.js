(() => {
  'use strict';
  const registry=window.SavingioV2Modules;
  const departments=window.SavingioV2DepartmentStore;
  const workflow=window.SavingioV2WorkflowEngine;
  if(!registry||!departments||!workflow)throw new Error('Revenue module core is not loaded');

  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const label=value=>({ready:'준비',running:'진행 중',pending:'대기',error:'오류',done:'완료',queued:'수익 점검 대기',adsense:'AdSense 확인',affiliate:'제휴 링크 확인',conversion:'전환 확인',settlement:'정산 확인',verified:'수익 점검 완료',failed:'수익 점검 실패'}[value]||String(value||'미연결'));
  const time=value=>{const date=new Date(value);return Number.isNaN(date.getTime())?String(value||''):date.toLocaleString('ko-KR');};
  const metric=(name,value)=>`<article class="metric"><span>${esc(name)}</span><strong>${esc(value)}</strong></article>`;

  function buttons(job){
    if(job.status==='pending')return `<button class="button" type="button" data-workflow-action="start" data-workflow-id="${esc(job.id)}">수익 점검 시작</button>`;
    if(job.status==='running')return `<button class="button" type="button" data-workflow-action="advance" data-workflow-id="${esc(job.id)}">다음 수익 단계</button><button class="button secondary" type="button" data-workflow-action="fail" data-workflow-id="${esc(job.id)}">수익 오류</button>`;
    if(job.status==='error')return `<button class="button" type="button" data-workflow-action="retry" data-workflow-id="${esc(job.id)}">재시도</button>`;
    return '<span class="status done">완료</span>';
  }

  function cards(list){
    if(!list.length)return '<div class="empty">수익 점검 대기 또는 진행 중인 작업이 없습니다.</div>';
    return `<div class="project-list">${list.map(job=>`<article class="project-card"><div class="project-top"><div><div class="project-title">${esc(job.title)}</div><div class="meta">${esc(job.projectId||job.id)} · ${esc(label(job.revenueStatus))}</div></div><span class="status ${esc(job.status)}">${job.priority==='urgent'?'긴급 · ':''}${esc(label(job.status))}</span></div><div class="meta">최근 갱신 ${esc(time(job.revenueUpdatedAt||job.updatedAt))}${job.revenueNote?` · ${esc(job.revenueNote)}`:''}</div><div class="header-actions">${buttons(job)}</div></article>`).join('')}</div>`;
  }

  function history(list){
    if(!list.length)return '<div class="empty">수익 점검 완료 또는 실패 이력이 없습니다.</div>';
    return `<div class="connection-list">${list.map(job=>`<div><span>${esc(job.title)}<small class="meta">${esc(time(job.revenueUpdatedAt||job.updatedAt))}</small></span><strong>${esc(label(job.revenueStatus))}</strong></div>`).join('')}</div>`;
  }

  registry.register({
    id:'dept-revenue',
    title:'수익 센터',
    render(){
      const data=departments.read('revenue');
      const summary=workflow.summary();
      const active=workflow.stageJobs('revenue');
      const all=workflow.revenueJobs('all');
      const completed=all.filter(job=>job.revenueStatus==='verified'||job.revenueStatus==='failed').slice(0,20);
      return `<section class="view" data-module-root><header class="hero"><p>REVENUE CENTER</p><h2>수익 센터</h2><p>분석 검증을 마친 콘텐츠의 AdSense·제휴·전환·정산 점검 단계를 관리합니다. 외부 연결 전에는 임의 수익을 생성하지 않습니다.</p></header><div class="metrics">${metric('부서 상태',label(data.status))}${metric('수익 점검 대기',`${summary.revenue.queued}건`)}${metric('AdSense 확인',`${summary.revenue.adsense}건`)}${metric('제휴 확인',`${summary.revenue.affiliate}건`)}${metric('전환 확인',`${summary.revenue.conversion}건`)}${metric('점검 완료',`${summary.revenue.verified}건`)}</div><section class="panel"><h3>수익 작업 대기열</h3>${cards(active)}</section><section class="panel"><h3>수익 점검 단계 기준</h3><div class="connection-list"><div><span>1. AdSense 상태 확인</span><strong>광고·정책·게재 상태</strong></div><div><span>2. 제휴 링크 확인</span><strong>링크·고지·연결 상태</strong></div><div><span>3. 전환 추적 확인</span><strong>클릭·전환 수집 상태</strong></div><div><span>4. 정산 데이터 확인</span><strong>실제 정산 연결 상태</strong></div><div><span>5. 수익 점검 완료</span><strong>워크플로 최종 완료</strong></div></div></section><section class="panel"><h3>최근 수익 이력</h3>${history(completed)}</section><section class="panel"><h3>외부 수익 연결 상태</h3><div class="connection-list"><div><span>Google AdSense</span><strong>미연결</strong></div><div><span>제휴 네트워크</span><strong>미연결</strong></div><div><span>전환 분석</span><strong>미연결</strong></div><div><span>정산 데이터</span><strong>미연결</strong></div><div><span>허위 수익 생성 방지</span><strong>LOCK</strong></div></div></section></section>`;
    }
  });
})();