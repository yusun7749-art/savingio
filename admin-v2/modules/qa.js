(() => {
  'use strict';
  const registry=window.SavingioV2Modules;
  const store=window.SavingioV2ProjectStore;
  if(!registry||!store)throw new Error('QA module core is not loaded');
  registry.register({id:'dept-qa',title:'QA',render(){const summary=store.summary();return `<section class="view" data-module-root><header class="hero"><p>DEPARTMENT</p><h2>QA</h2><p>구조·콘텐츠·링크·배포 전 검사를 담당하는 독립 모듈입니다.</p></header><div class="metrics"><article class="metric"><span>오류·중지</span><strong>${summary.state.error}건</strong></article><article class="metric"><span>승인 대기</span><strong>${summary.state.approval}건</strong></article><article class="metric"><span>완료</span><strong>${summary.state.done}건</strong></article></div><section class="panel"><h3>QA 검사 범위</h3><div class="connection-list"><div><span>HTML 구조</span><strong>구조 준비</strong></div><div><span>내부 링크</span><strong>구조 준비</strong></div><div><span>콘텐츠 기준</span><strong>미연결</strong></div><div><span>실제 URL</span><strong>미연결</strong></div></div></section></section>`;}});
})();