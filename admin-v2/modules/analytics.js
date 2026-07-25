(() => {
  'use strict';
  const registry=window.SavingioV2Modules;
  if(!registry)throw new Error('Analytics module registry is not loaded');
  registry.register({id:'dept-analytics',title:'분석',render(){return `<section class="view" data-module-root><header class="hero"><p>DEPARTMENT</p><h2>분석</h2><p>방문·클릭·전환·콘텐츠 성과 데이터를 확인하는 독립 모듈입니다.</p></header><section class="panel"><h3>분석 데이터 연결</h3><div class="connection-list"><div><span>방문 데이터</span><strong>미연결</strong></div><div><span>클릭 데이터</span><strong>미연결</strong></div><div><span>전환 데이터</span><strong>미연결</strong></div><div><span>콘텐츠 성과</span><strong>미연결</strong></div></div></section></section>`;}});
})();