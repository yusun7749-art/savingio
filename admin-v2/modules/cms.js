(() => {
  'use strict';
  const registry=window.SavingioV2Modules;
  const departments=window.SavingioV2DepartmentStore;
  if(!registry||!departments)throw new Error('CMS module core is not loaded');
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  registry.register({id:'dept-cms',title:'CMS',render(){const state=departments.read('cms');return `<section class="view" data-module-root><header class="hero"><p>DEPARTMENT</p><h2>CMS</h2><p>콘텐츠 저장·승인·발행 준비 상태를 관리하는 독립 모듈입니다.</p></header><div class="metrics"><article class="metric"><span>등록 항목</span><strong>${esc(state.items)}건</strong></article><article class="metric"><span>데이터 원본</span><strong>Department Store</strong></article><article class="metric"><span>상태</span><strong>${esc(state.status)}</strong></article></div><section class="panel"><h3>CMS 연결 상태</h3><div class="connection-list"><div><span>콘텐츠 저장</span><strong>${esc(state.connections.content)}</strong></div><div><span>승인 상태</span><strong>${esc(state.connections.approval)}</strong></div><div><span>발행 큐</span><strong>${esc(state.connections.publish)}</strong></div><div><span>버전 기록</span><strong>${esc(state.connections.version)}</strong></div></div></section></section>`;}});
})();