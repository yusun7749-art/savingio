(() => {
  'use strict';
  const registry=window.SavingioV2Modules;
  const departments=window.SavingioV2DepartmentStore;
  const queue=window.SavingioV2TaskQueue;
  if(!registry||!departments||!queue)throw new Error('Content module core is not loaded');
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  registry.register({id:'dept-content',title:'콘텐츠',render(){const state=departments.read('content');return `<section class="view" data-module-root><header class="hero"><p>DEPARTMENT</p><h2>콘텐츠</h2><p>글·쇼츠·캠페인 제작 흐름을 확인하는 독립 모듈입니다.</p></header><div class="metrics"><article class="metric"><span>등록 항목</span><strong>${esc(state.items)}건</strong></article><article class="metric"><span>데이터 원본</span><strong>Department Store</strong></article><article class="metric"><span>상태</span><strong>${esc(state.status)}</strong></article></div>${queue.render('content')}<section class="panel"><h3>콘텐츠 연결 상태</h3><div class="connection-list"><div><span>주제·기획</span><strong>${esc(state.connections.planning)}</strong></div><div><span>본문 작성</span><strong>${esc(state.connections.writing)}</strong></div><div><span>미디어 제작</span><strong>${esc(state.connections.media)}</strong></div><div><span>최종 승인</span><strong>${esc(state.connections.approval)}</strong></div></div></section></section>`;}});
})();