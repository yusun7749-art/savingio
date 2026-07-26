(() => {
  'use strict';

  const registry=window.SavingioV2Modules;
  if(!registry)throw new Error('Runtime Audit dependency is not loaded');

  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const expectedModules=Object.freeze([
    'tool-build-progress','tool-cloudflare','tool-seo-doctor','tool-content-doctor',
    'tool-search-console','tool-adsense','tool-github-release'
  ]);
  const expectedGlobals=Object.freeze([
    'SavingioV2CenterRenderer','SavingioV2CenterStoreFactory','SavingioV2BuildProgressStore',
    'SavingioV2CloudflareStore','SavingioV2SeoDoctorStore','SavingioV2ContentDoctorStore'
  ]);

  function run(){
    const moduleRows=expectedModules.map(id=>({name:`Module · ${id}`,pass:registry.has(id)}));
    const globalRows=expectedGlobals.map(name=>({name:`Core · ${name}`,pass:Boolean(window[name])}));
    const menuRows=expectedModules.map(id=>({name:`Menu · ${id}`,pass:Boolean(document.querySelector(`[data-view="${id}"]`))}));
    const renderer=window.SavingioV2CenterRenderer?.verify?.()||{pass:false};
    const shell=window.SavingioAdminV2?.verify?.()||{pass:false};
    const rows=[...moduleRows,...globalRows,...menuRows,{name:'Center Renderer config-driven',pass:Boolean(renderer.pass)},{name:'Admin V2 Shell',pass:Boolean(shell.pass)}];
    return Object.freeze({rows,total:rows.length,passed:rows.filter(row=>row.pass).length,failed:rows.filter(row=>!row.pass).length,pass:rows.every(row=>row.pass),checkedAt:new Date().toISOString()});
  }

  function render(){
    const result=run();
    const rows=result.rows.map(row=>`<div><span>${esc(row.name)}</span><strong class="${row.pass?'pass':'fail'}">${row.pass?'PASS':'FAIL'}</strong></div>`).join('');
    return `<section class="view" data-module-root><header class="hero"><p>RUNTIME AUDIT</p><h2>Admin V2 런타임 검증 센터</h2><p>현재 브라우저에 실제 로딩된 공통 엔진·Store·모듈·메뉴·Shell을 검사합니다. 파일 존재만으로 PASS 처리하지 않습니다.</p></header><div class="metrics"><article class="metric"><span>전체 항목</span><strong>${result.total}</strong></article><article class="metric"><span>PASS</span><strong>${result.passed}</strong></article><article class="metric"><span>FAIL</span><strong>${result.failed}</strong></article><article class="metric"><span>최종 판정</span><strong class="${result.pass?'pass':'fail'}">${result.pass?'PASS':'FAIL'}</strong></article></div><section class="panel"><h3>실시간 검사 결과</h3><div class="connection-list">${rows}</div><div class="header-actions"><button class="button" type="button" data-runtime-audit="rerun">다시 검사</button></div></section><section class="panel"><h3>검사 기준</h3><div class="connection-list"><div><span>검사 시각</span><strong>${esc(new Date(result.checkedAt).toLocaleString('ko-KR'))}</strong></div><div><span>완료 판정</span><strong>모든 항목 PASS일 때만 허용</strong></div><div><span>Production 배포</span><strong>별도 Cloudflare 상태 확인 필요</strong></div></div></section></section>`;
  }

  registry.register({id:'tool-runtime-audit',title:'런타임 검증 센터',render});
  document.addEventListener('click',event=>{const button=event.target.closest('[data-runtime-audit="rerun"]');if(!button)return;event.preventDefault();window.SavingioAdminV2?.mount?.('tool-runtime-audit','replace');});
  Object.defineProperty(window,'SavingioV2RuntimeAudit',{value:Object.freeze({run}),writable:false,configurable:false});
})();