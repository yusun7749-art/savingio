(() => {
  'use strict';

  const registry=window.SavingioV2Modules;
  if(!registry)throw new Error('Runtime Audit dependency is not loaded');

  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const expectedReleaseId='admin-v2-release-2026-07-26-01';
  const expectedModules=Object.freeze([
    'tool-build-progress','tool-runtime-audit','tool-cloudflare','tool-seo-doctor','tool-content-doctor',
    'tool-search-console','tool-adsense','tool-github-release','dept-content','dept-seo','dept-image','dept-qa','dept-deploy','dept-analytics','dept-revenue'
  ]);
  const expectedGlobals=Object.freeze([
    'SavingioV2ReleaseMarker','SavingioV2CenterRenderer','SavingioV2CenterStoreFactory','SavingioV2BuildProgressStore',
    'SavingioV2CloudflareStore','SavingioV2SeoDoctorStore','SavingioV2ContentDoctorStore','SavingioV2ContentInventoryStore',
    'SavingioV2SeoInventoryStore','SavingioV2ImageInventoryStore','SavingioV2QaInventoryStore','SavingioV2DeployInventoryStore',
    'SavingioV2AnalyticsInventoryStore','SavingioV2RevenueInventoryStore','SavingioV2RuntimeAudit','SavingioAdminV2','SavingioV2ProductionAutoVerify'
  ]);
  const expectedScripts=Object.freeze([
    '/admin-v2/core/release-marker.js','/admin-v2/core/center-renderer.js','/admin-v2/core/center-store-factory.js',
    '/admin-v2/core/content-inventory-store.js','/admin-v2/modules/content.js',
    '/admin-v2/core/seo-inventory-store.js','/admin-v2/modules/seo.js',
    '/admin-v2/core/image-inventory-store.js','/admin-v2/modules/image.js',
    '/admin-v2/core/qa-inventory-store.js','/admin-v2/modules/qa.js',
    '/admin-v2/core/deploy-inventory-store.js','/admin-v2/modules/deploy.js',
    '/admin-v2/core/analytics-inventory-store.js','/admin-v2/modules/analytics.js',
    '/admin-v2/core/revenue-inventory-store.js','/admin-v2/modules/revenue.js',
    '/admin-v2/modules/build-progress.js','/admin-v2/modules/cloudflare.js',
    '/admin-v2/modules/seo-doctor.js','/admin-v2/modules/content-doctor.js',
    '/admin-v2/modules/runtime-audit.js','/admin-v2/app.js','/admin-v2/production-auto-verify.js','/admin-v2/center-refresh.js'
  ]);

  function scriptLoaded(path){return [...document.scripts].some(script=>{try{return new URL(script.src,location.href).pathname===path}catch{return false}})}

  function run(){
    const moduleRows=expectedModules.map(id=>({name:`Module · ${id}`,pass:registry.has(id)}));
    const globalRows=expectedGlobals.map(name=>({name:`Core · ${name}`,pass:Boolean(window[name])}));
    const menuRows=expectedModules.map(id=>({name:`Menu · ${id}`,pass:Boolean(document.querySelector(`[data-view="${id}"]`))}));
    const scriptRows=expectedScripts.map(path=>({name:`Script · ${path}`,pass:scriptLoaded(path)}));
    const renderer=window.SavingioV2CenterRenderer?.verify?.()||{pass:false};
    const shell=window.SavingioAdminV2?.verify?.()||{pass:false};
    const progress=window.SavingioV2BuildProgressStore?.verify?.()||{pass:false,noFakeCompletion:false};
    const contentInventory=window.SavingioV2ContentInventoryStore?.verify?.()||{pass:false,count:0};
    const seoInventory=window.SavingioV2SeoInventoryStore?.verify?.()||{pass:false,count:0};
    const imageInventory=window.SavingioV2ImageInventoryStore?.verify?.()||{pass:false,count:0};
    const qaInventory=window.SavingioV2QaInventoryStore?.verify?.()||{pass:false,count:0};
    const deployInventory=window.SavingioV2DeployInventoryStore?.verify?.()||{pass:false,count:0};
    const analyticsInventory=window.SavingioV2AnalyticsInventoryStore?.verify?.()||{pass:false,count:0};
    const revenueInventory=window.SavingioV2RevenueInventoryStore?.verify?.()||{pass:false,count:0};
    const release=window.SavingioV2ReleaseMarker||{};
    const rows=[...moduleRows,...globalRows,...menuRows,...scriptRows,
      {name:`Release Marker · ${expectedReleaseId}`,pass:release.id===expectedReleaseId},
      {name:'Release Marker module list',pass:Array.isArray(release.expectedModules)&&release.expectedModules.every(id=>registry.has(id))},
      {name:'Center Renderer config-driven',pass:Boolean(renderer.pass)},
      {name:`Content Inventory integrity · ${contentInventory.count||0}건`,pass:Boolean(contentInventory.pass)},
      {name:`SEO Inventory integrity · ${seoInventory.count||0}건`,pass:Boolean(seoInventory.pass)},
      {name:`Image Inventory integrity · ${imageInventory.count||0}건`,pass:Boolean(imageInventory.pass)},
      {name:`QA Inventory integrity · ${qaInventory.count||0}건`,pass:Boolean(qaInventory.pass)},
      {name:`Deploy Inventory integrity · ${deployInventory.count||0}건`,pass:Boolean(deployInventory.pass)},
      {name:`Analytics Inventory integrity · ${analyticsInventory.count||0}건`,pass:Boolean(analyticsInventory.pass)},
      {name:`Revenue Inventory integrity · ${revenueInventory.count||0}건`,pass:Boolean(revenueInventory.pass)},
      {name:'Build Progress truth lock',pass:Boolean(progress.pass&&progress.noFakeCompletion)},
      {name:'Admin V2 Shell',pass:Boolean(shell.pass)}
    ];
    return Object.freeze({rows,total:rows.length,passed:rows.filter(row=>row.pass).length,failed:rows.filter(row=>!row.pass).length,pass:rows.every(row=>row.pass),checkedAt:new Date().toISOString(),releaseId:release.id||'미확인',version:release.version||'미확인'});
  }

  function render(){
    const result=run();
    const progress=window.SavingioV2BuildProgressStore?.read?.()||{};
    const rows=result.rows.map(row=>`<div><span>${esc(row.name)}</span><strong class="${row.pass?'pass':'fail'}">${row.pass?'PASS':'FAIL'}</strong></div>`).join('');
    const finalState=progress.status==='complete'&&Number(progress.percent)===100?'100% 완료':'검증 결과 미반영';
    return `<section class="view" data-module-root><header class="hero"><p>RUNTIME AUDIT</p><h2>Admin V2 런타임 검증 센터</h2><p>현재 브라우저에 실제 로딩된 공통 엔진·Store·모듈·메뉴·스크립트·Release Marker·Production Auto Verify·Shell을 검사합니다. 운영 도메인에서는 화면을 여는 즉시 전체 검사 결과가 자동 반영됩니다.</p></header><div class="metrics"><article class="metric"><span>전체 항목</span><strong>${result.total}</strong></article><article class="metric"><span>PASS</span><strong>${result.passed}</strong></article><article class="metric"><span>FAIL</span><strong>${result.failed}</strong></article><article class="metric"><span>최종 판정</span><strong class="${result.pass?'pass':'fail'}">${result.pass?'PASS':'FAIL'}</strong></article><article class="metric"><span>진행 보드</span><strong>${esc(finalState)}</strong></article></div><section class="panel"><h3>실시간 검사 결과</h3><div class="connection-list">${rows}</div><div class="header-actions"><button class="button secondary" type="button" data-runtime-audit="rerun">다시 검사</button><button class="button" type="button" data-runtime-audit="apply">검사 결과 반영</button></div></section><section class="panel"><h3>배포 식별</h3><div class="connection-list"><div><span>Release ID</span><strong>${esc(result.releaseId)}</strong></div><div><span>Version</span><strong>${esc(result.version)}</strong></div><div><span>검사 시각</span><strong>${esc(new Date(result.checkedAt).toLocaleString('ko-KR'))}</strong></div><div><span>자동 판정</span><strong>savingio.com / savingio.pages.dev 접속 시 자동 실행</strong></div><div><span>완료 판정</span><strong>전체 PASS 결과일 때만 100%</strong></div></div></section></section>`;
  }

  registry.register({id:'tool-runtime-audit',title:'런타임 검증 센터',render});
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-runtime-audit]');
    if(!button)return;
    event.preventDefault();
    if(button.dataset.runtimeAudit==='apply'){
      const result=run();
      window.SavingioV2BuildProgressStore?.applyRuntimeAudit?.(result);
      window.SavingioAdminV2?.mount?.('tool-runtime-audit','replace');
      return;
    }
    window.SavingioAdminV2?.mount?.('tool-runtime-audit','replace');
  });
  Object.defineProperty(window,'SavingioV2RuntimeAudit',{value:Object.freeze({run}),writable:false,configurable:false});
})();