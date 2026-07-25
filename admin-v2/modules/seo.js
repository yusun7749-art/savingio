(() => {
  'use strict';
  const registry=window.SavingioV2Modules;
  if(!registry)throw new Error('SEO module registry is not loaded');
  registry.register({id:'dept-seo',title:'SEO',render(){return `<section class="view" data-module-root><header class="hero"><p>DEPARTMENT</p><h2>SEO</h2><p>검색 노출 점검 항목을 분리한 독립 모듈입니다.</p></header><section class="panel"><h3>SEO 점검 범위</h3><div class="connection-list"><div><span>메타데이터</span><strong>점검 구조 준비</strong></div><div><span>내부 링크</span><strong>점검 구조 준비</strong></div><div><span>사이트맵</span><strong>미연결</strong></div><div><span>Search Console</span><strong>미연결</strong></div></div></section></section>`;}});
})();