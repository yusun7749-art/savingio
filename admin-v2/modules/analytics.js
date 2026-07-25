(() => {
  'use strict';
  const registry=window.SavingioV2Modules;
  const departments=window.SavingioV2DepartmentStore;
  const taskQueue=window.SavingioV2TaskQueue;
  if(!registry||!departments||!taskQueue)throw new Error('Analytics module core is not loaded');
  const label=value=>({ready:'준비',running:'진행 중',pending:'미연결',error:'오류',done:'완료'}[value]||String(value||'미연결'));
  registry.register({id:'dept-analytics',title:'분석',render(){const data=departments.read('analytics');const c=data.connections||{};return `<section class="view" data-module-root><header class="hero"><p>DEPARTMENT</p><h2>분석</h2><p>방문·클릭·전환·콘텐츠 성과 데이터를 확인하는 독립 모듈입니다.</p></header><div class="metrics"><article class="metric"><span>부서 상태</span><strong>${label(data.status)}</strong></article><article class="metric"><span>데이터 항목</span><strong>${data.items}건</strong></article><article class="metric"><span>최근 갱신</span><strong>${data.updated}</strong></article></div>${taskQueue.render('analytics')}<section class="panel"><h3>분석 데이터 연결</h3><div class="connection-list"><div><span>방문 데이터</span><strong>${label(c.visits)}</strong></div><div><span>클릭 데이터</span><strong>${label(c.clicks)}</strong></div><div><span>전환 데이터</span><strong>${label(c.conversions)}</strong></div><div><span>콘텐츠 성과</span><strong>${label(c.contentPerformance)}</strong></div></div></section></section>`;}});
})();