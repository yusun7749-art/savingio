(() => {
  'use strict';
  const registry=window.SavingioV2Modules;
  const departments=window.SavingioV2DepartmentStore;
  if(!registry||!departments)throw new Error('Deploy module core is not loaded');
  const label=value=>({ready:'준비',running:'진행 중',pending:'미연결',error:'오류',done:'완료'}[value]||String(value||'미연결'));
  registry.register({id:'dept-deploy',title:'배포',render(){const data=departments.read('deploy');const c=data.connections||{};return `<section class="view" data-module-root><header class="hero"><p>DEPARTMENT</p><h2>배포</h2><p>GitHub 반영부터 Cloudflare 배포와 실제 URL 확인까지 분리한 독립 모듈입니다.</p></header><div class="metrics"><article class="metric"><span>부서 상태</span><strong>${label(data.status)}</strong></article><article class="metric"><span>배포 항목</span><strong>${data.items}건</strong></article><article class="metric"><span>최근 갱신</span><strong>${data.updated}</strong></article></div><section class="panel"><h3>배포 연결 상태</h3><div class="connection-list"><div><span>GitHub main</span><strong>${label(c.github)}</strong></div><div><span>Cloudflare Pages</span><strong>${label(c.cloudflare)}</strong></div><div><span>실제 URL 검사</span><strong>${label(c.liveUrl)}</strong></div><div><span>롤백 기록</span><strong>${label(c.rollback)}</strong></div></div></section></section>`;}});
})();