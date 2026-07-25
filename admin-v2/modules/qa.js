(() => {
  'use strict';
  const registry=window.SavingioV2Modules;
  const departments=window.SavingioV2DepartmentStore;
  if(!registry||!departments)throw new Error('QA module core is not loaded');
  const label=value=>({ready:'준비',running:'진행 중',pending:'미연결',error:'오류',done:'완료'}[value]||String(value||'미연결'));
  registry.register({id:'dept-qa',title:'QA',render(){const data=departments.read('qa');const c=data.connections||{};return `<section class="view" data-module-root><header class="hero"><p>DEPARTMENT</p><h2>QA</h2><p>구조·콘텐츠·링크·배포 전 검사를 담당하는 독립 모듈입니다.</p></header><div class="metrics"><article class="metric"><span>부서 상태</span><strong>${label(data.status)}</strong></article><article class="metric"><span>검사 항목</span><strong>${data.items}건</strong></article><article class="metric"><span>최근 갱신</span><strong>${data.updated}</strong></article></div><section class="panel"><h3>QA 검사 범위</h3><div class="connection-list"><div><span>HTML 구조</span><strong>${label(c.html)}</strong></div><div><span>내부 링크</span><strong>${label(c.links)}</strong></div><div><span>콘텐츠 기준</span><strong>${label(c.content)}</strong></div><div><span>실제 URL</span><strong>${label(c.liveUrl)}</strong></div></div></section></section>`;}});
})();