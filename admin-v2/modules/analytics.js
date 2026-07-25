(() => {
  'use strict';
  const registry=window.SavingioV2Modules;
  const departments=window.SavingioV2DepartmentStore;
  const workflow=window.SavingioV2WorkflowEngine;
  if(!registry||!departments||!workflow)throw new Error('Analytics module core is not loaded');

  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const label=value=>({ready:'준비',running:'진행 중',pending:'대기',error:'오류',done:'완료',queued:'분석 대기',collecting:'데이터 수집','search-console':'Search Console 확인',performance:'성과 분석',verified:'검증 완료',failed:'분석 실패'}[value]||String(value||'미연결'));
  const time=value=>{const date=new Date(value);return Number.isNaN(date.getTime())?String(value||''):date.toLocaleString('ko-KR');};
  const metric=(name,value)=>`<article class="metric"><span>${esc(name)}</span><strong>${esc(value)}</strong></article>`;

  function buttons(job){
    if(job.status==='pending')return `<button class="button" type="button" data-workflow-action="start" data-workflow-id="${esc(job.id)}">분석 시작</button>`;
    if(job.status==='running')return `<button class="button" type="button" data-workflow-action="advance" data-workflow-id="${esc(job.id)}">다음 분석 단계</button><button class="button secondary" type="button" data-workflow-action="fail" data-workflow-id="${esc(job.id)}">분석 오류</button>`;
    if(job.status==='error')return `<button class="button" type="button" data-workflow-action="retry" data-workflow-id="${esc(job.id)}">재시도</button>`;
    return '<span class="status done">완료</span>';
  }

  function cards(list){
    if(!list.length)return '<div class="empty">분석 대기 또는 진행 중인 작업이 없습니다.</div>';
    return `<div class="project-list">${list.map(job=>`<article class="project-card"><div class="project-top"><div><div class="project-title">${esc(job.title)}</div><div class="meta">${esc(job.projectId||job.id)} · ${esc(label(job.analyticsStatus))}</div></div><span class="status ${esc(job.status)}">${job.priority==='urgent'?'긴급 · ':''}${esc(label(job.status))}</span></div><div class="meta">최근 갱신 ${esc(time(job.analyticsUpdatedAt||job.updatedAt))}${job.analyticsNote?` · ${esc(job.analyticsNote)}`:''}</div><div class="header-actions">${buttons(job)}</div></article>`).join('')}</div>`;
  }

  function history(list){
    if(!list.length)return '<div class="empty">분석 완료 또는 실패 이력이 없습니다.</div>';
    return `<div class="connection-list">${list.map(job=>`<div><span>${esc(job.title)}<small class="meta">${esc(time(job.analyticsUpdatedAt||job.updatedAt))}</small></span><strong>${esc(label(job.analyticsStatus))}</strong></div>`).join('')}</div>`;
  }

  registry.register({
    id:'dept-analytics',
    title:'분석 센터',
    render(){
      const data=departments.read('analytics');
      const summary=workflow.summary();
      const active=workflow.stageJobs('analytics');
      const all=workflow.analyticsJobs('all');
      const completed=all.filter(job=>job.analyticsStatus==='verified'||job.analyticsStatus==='failed').slice(0,20);
      return `<section class="view" data-module-root><header class="hero"><p>ANALYTICS CENTER</p><h2>분석 센터</h2><p>배포가 검증된 콘텐츠의 방문·클릭·Search Console·성과 분석 단계를 관리합니다. 외부 데이터가 연결되기 전에는 임의 수치를 생성하지 않습니다.</p></header><div class="metrics">${metric('부서 상태',label(data.status))}${metric('분석 대기',`${summary.analytics.queued}건`)}${metric('데이터 수집',`${summary.analytics.collecting}건`)}${metric('Search Console',`${summary.analytics['search-console']}건`)}${metric('성과 분석',`${summary.analytics.performance}건`)}${metric('검증 완료',`${summary.analytics.verified}건`)}</div><section class="panel"><h3>분석 작업 대기열</h3>${cards(active)}</section><section class="panel"><h3>분석 단계 기준</h3><div class="connection-list"><div><span>1. 방문·클릭 데이터 수집</span><strong>수집 상태 기록</strong></div><div><span>2. Search Console 확인</span><strong>노출·클릭·색인 점검</strong></div><div><span>3. 콘텐츠 성과 분석</span><strong>페이지별 성과 판정</strong></div><div><span>4. 분석 검증 완료</span><strong>수익 부서 전달</strong></div></div></section><section class="panel"><h3>최근 분석 이력</h3>${history(completed)}</section><section class="panel"><h3>외부 데이터 연결 상태</h3><div class="connection-list"><div><span>Google Search Console</span><strong>미연결</strong></div><div><span>방문·클릭 분석</span><strong>미연결</strong></div><div><span>콘텐츠별 성과 데이터</span><strong>미연결</strong></div><div><span>허위 데이터 생성 방지</span><strong>LOCK</strong></div></div></section></section>`;
    }
  });
})();