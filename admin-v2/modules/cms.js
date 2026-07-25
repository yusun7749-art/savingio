(() => {
  'use strict';
  const registry=window.SavingioV2Modules;
  const store=window.SavingioV2ProjectStore;
  if(!registry||!store)throw new Error('CMS module core is not loaded');
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  registry.register({id:'dept-cms',title:'CMS',render(){const list=store.read();return `<section class="view" data-module-root><header class="hero"><p>DEPARTMENT</p><h2>CMS</h2><p>콘텐츠 저장·승인·발행 준비 상태를 관리하는 독립 모듈입니다.</p></header><div class="metrics"><article class="metric"><span>등록 프로젝트</span><strong>${esc(list.length)}건</strong></article><article class="metric"><span>데이터 원본</span><strong>Project Store</strong></article><article class="metric"><span>발행 연동</span><strong>미연결</strong></article></div><section class="panel"><h3>CMS 작업 범위</h3><div class="connection-list"><div><span>콘텐츠 저장</span><strong>구조 준비</strong></div><div><span>승인 상태</span><strong>Project Store 연동</strong></div><div><span>발행 큐</span><strong>미연결</strong></div><div><span>버전 기록</span><strong>미연결</strong></div></div></section></section>`;}});
})();