(() => {
  'use strict';
  const registry=window.SavingioV2Modules;
  const departments=window.SavingioV2DepartmentStore;
  const taskQueue=window.SavingioV2TaskQueue;
  if(!registry||!departments||!taskQueue)throw new Error('Revenue module core is not loaded');
  const label=value=>({ready:'준비',running:'진행 중',pending:'미연결',error:'오류',done:'완료'}[value]||String(value||'미연결'));
  registry.register({id:'dept-revenue',title:'수익',render(){const data=departments.read('revenue');const c=data.connections||{};return `<section class="view" data-module-root><header class="hero"><p>DEPARTMENT</p><h2>수익</h2><p>광고·제휴·전환·정산 데이터를 분리해 관리하는 독립 모듈입니다.</p></header><div class="metrics"><article class="metric"><span>부서 상태</span><strong>${label(data.status)}</strong></article><article class="metric"><span>수익 항목</span><strong>${data.items}건</strong></article><article class="metric"><span>최근 갱신</span><strong>${data.updated}</strong></article></div>${taskQueue.render('revenue')}<section class="panel"><h3>수익 데이터 연결</h3><div class="connection-list"><div><span>AdSense</span><strong>${label(c.adsense)}</strong></div><div><span>제휴 링크</span><strong>${label(c.affiliate)}</strong></div><div><span>전환</span><strong>${label(c.conversions)}</strong></div><div><span>정산</span><strong>${label(c.settlement)}</strong></div></div></section></section>`;}});
})();