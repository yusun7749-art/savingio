(() => {
  'use strict';
  const registry=window.SavingioV2Modules;
  if(!registry)throw new Error('Image module registry is not loaded');
  registry.register({id:'dept-image',title:'이미지',render(){return `<section class="view" data-module-root><header class="hero"><p>DEPARTMENT</p><h2>이미지</h2><p>썸네일·본문 이미지·영상 자산의 제작 상태를 관리하는 독립 모듈입니다.</p></header><section class="panel"><h3>이미지 작업 범위</h3><div class="connection-list"><div><span>썸네일</span><strong>미연결</strong></div><div><span>본문 이미지</span><strong>미연결</strong></div><div><span>쇼츠 자산</span><strong>미연결</strong></div><div><span>브랜드 검사</span><strong>구조 준비</strong></div></div></section></section>`;}});
})();