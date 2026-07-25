(() => {
  'use strict';
  const registry=window.SavingioV2Modules;
  if(!registry)throw new Error('Revenue module registry is not loaded');
  registry.register({id:'dept-revenue',title:'수익',render(){return `<section class="view" data-module-root><header class="hero"><p>DEPARTMENT</p><h2>수익</h2><p>광고·제휴·전환·정산 데이터를 분리해 관리하는 독립 모듈입니다.</p></header><section class="panel"><h3>수익 데이터 연결</h3><div class="connection-list"><div><span>AdSense</span><strong>미연결</strong></div><div><span>제휴 링크</span><strong>미연결</strong></div><div><span>전환</span><strong>미연결</strong></div><div><span>정산</span><strong>미연결</strong></div></div></section></section>`;}});
})();