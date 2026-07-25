(() => {
  'use strict';
  const registry=window.SavingioV2Modules;
  if(!registry)throw new Error('Deploy module registry is not loaded');
  registry.register({id:'dept-deploy',title:'배포',render(){return `<section class="view" data-module-root><header class="hero"><p>DEPARTMENT</p><h2>배포</h2><p>GitHub 반영부터 Cloudflare 배포와 실제 URL 확인까지 분리한 독립 모듈입니다.</p></header><section class="panel"><h3>배포 연결 상태</h3><div class="connection-list"><div><span>GitHub main</span><strong>관리 구조 준비</strong></div><div><span>Cloudflare Pages</span><strong>미연결</strong></div><div><span>실제 URL 검사</span><strong>미연결</strong></div><div><span>롤백 기록</span><strong>미연결</strong></div></div></section></section>`;}});
})();