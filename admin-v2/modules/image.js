(() => {
  'use strict';
  const registry=window.SavingioV2Modules;
  const departments=window.SavingioV2DepartmentStore;
  if(!registry||!departments)throw new Error('Image module core is not loaded');
  const label=value=>({ready:'준비',running:'진행 중',pending:'미연결',error:'오류',done:'완료'}[value]||String(value||'미연결'));
  registry.register({id:'dept-image',title:'이미지',render(){const data=departments.read('image');const c=data.connections||{};return `<section class="view" data-module-root><header class="hero"><p>DEPARTMENT</p><h2>이미지</h2><p>썸네일·본문 이미지·영상 자산의 제작 상태를 관리하는 독립 모듈입니다.</p></header><div class="metrics"><article class="metric"><span>부서 상태</span><strong>${label(data.status)}</strong></article><article class="metric"><span>관리 자산</span><strong>${data.items}건</strong></article><article class="metric"><span>최근 갱신</span><strong>${data.updated}</strong></article></div><section class="panel"><h3>이미지 작업 범위</h3><div class="connection-list"><div><span>썸네일</span><strong>${label(c.thumbnail)}</strong></div><div><span>본문 이미지</span><strong>${label(c.articleImage)}</strong></div><div><span>쇼츠 자산</span><strong>${label(c.shorts)}</strong></div><div><span>브랜드 검사</span><strong>${label(c.brandCheck)}</strong></div></div></section></section>`;}});
})();