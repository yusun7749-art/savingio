(() => {
  'use strict';
  const registry=window.SavingioV2Modules;
  const store=window.SavingioV2ProjectStore;
  if(!registry||!store)throw new Error('Content module core is not loaded');
  registry.register({id:'dept-content',title:'콘텐츠',render(){const summary=store.summary();return `<section class="view" data-module-root><header class="hero"><p>DEPARTMENT</p><h2>콘텐츠</h2><p>글·쇼츠·캠페인 제작 흐름을 확인하는 독립 모듈입니다.</p></header><div class="metrics"><article class="metric"><span>전체 프로젝트</span><strong>${summary.total}건</strong></article><article class="metric"><span>진행 중</span><strong>${summary.state.running}건</strong></article><article class="metric"><span>승인 대기</span><strong>${summary.state.approval}건</strong></article></div><section class="panel"><h3>콘텐츠 제작 단계</h3><div class="connection-list"><div><span>주제·기획</span><strong>Project Store 연동</strong></div><div><span>본문 작성</span><strong>상태 표시</strong></div><div><span>미디어 제작</span><strong>미연결</strong></div><div><span>최종 승인</span><strong>상태 표시</strong></div></div></section></section>`;}});
})();