(() => {
  'use strict';
  const registry=window.SavingioV2Modules;
  if(!registry)throw new Error('Production Verification Center registry is not loaded');
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const readSession=key=>{try{return JSON.parse(sessionStorage.getItem(key)||'null')}catch{return null}};
  const time=value=>{const date=new Date(value);return Number.isNaN(date.getTime())?'미실행':date.toLocaleString('ko-KR');};
  const badge=pass=>`<strong class="${pass?'pass':'fail'}">${pass?'PASS':'FAIL'}</strong>`;
  function snapshot(){
    const probe=readSession('savingio-admin-v2-production-deployment-probe')||window.SavingioV2ProductionDeploymentProbe?.verify?.()||null;
    const e2e=readSession('savingio-admin-v2-production-e2e')||window.SavingioV2ProductionE2EVerify?.verify?.()||null;
    const auto=readSession('savingio-admin-v2-production-auto-verify');
    const progress=window.SavingioV2BuildProgressStore?.read?.()||{};
    const deploy=window.SavingioV2DeployInventoryStore?.get?.('DEP-ADMIN-V2');
    const audit=progress.runtimeAudit||null;
    return {probe,e2e,auto,progress,deploy,audit};
  }
  function rows(items,empty){
    if(!Array.isArray(items)||!items.length)return `<div class="empty">${esc(empty)}</div>`;
    return `<div class="connection-list">${items.map(item=>`<div><span>${esc(item.name||item.path||'검사 항목')}</span>${badge(Boolean(item.pass??(item.ok&&item.markerFound)))}</div>`).join('')}</div>`;
  }
  function render(){
    const s=snapshot();
    const probePass=Boolean(s.probe?.pass);
    const e2ePass=Boolean(s.e2e?.pass);
    const auditPass=Boolean(s.audit?.pass);
    const complete=s.progress.status==='complete'&&Number(s.progress.percent)===100;
    return `<section class="view" data-module-root><header class="hero"><p>PRODUCTION VERIFICATION</p><h2>운영 검증 센터</h2><p>운영 자산 배포, 브라우저 E2E, Runtime Audit, 최종 100% 게이트를 한 화면에서 확인합니다.</p></header><div class="metrics"><article class="metric"><span>운영 자산</span>${badge(probePass)}</article><article class="metric"><span>Production E2E</span>${badge(e2ePass)}</article><article class="metric"><span>Runtime Audit</span>${badge(auditPass)}</article><article class="metric"><span>Deploy Inventory</span>${badge(Boolean(s.deploy?.status==='verified'&&s.deploy?.liveUrl))}</article><article class="metric"><span>최종 완료</span>${badge(complete)}</article><article class="metric"><span>현재 호스트</span><strong>${esc(location.host)}</strong></article></div><section class="panel"><h3>운영 핵심 자산</h3>${rows(s.probe?.rows,'운영 자산 검사가 아직 실행되지 않았습니다.')}<div class="meta">최근 검사 ${esc(time(s.probe?.checkedAt))}</div></section><section class="panel"><h3>브라우저 E2E</h3>${rows(s.e2e?.rows,'Production E2E가 아직 실행되지 않았습니다.')}<div class="meta">최근 검사 ${esc(time(s.e2e?.checkedAt))}</div></section><section class="panel"><h3>최종 완료 게이트</h3><div class="connection-list"><div><span>운영 자산 Probe</span>${badge(probePass)}</div><div><span>Production E2E</span>${badge(e2ePass)}</div><div><span>Runtime Audit</span>${badge(auditPass)}</div><div><span>Build Progress</span><strong>${esc(`${s.progress.percent||0}% · ${s.progress.status||'미확인'}`)}</strong></div><div><span>Deploy Inventory</span><strong>${esc(s.deploy?.status||'미기록')} · ${s.deploy?.liveUrl?'실제 URL 확인':'실제 URL 미확인'}</strong></div></div><div class="header-actions"><button class="button" type="button" data-production-verify="run">전체 재검사</button><button class="button secondary" type="button" data-route="dept-deploy">Deploy Inventory 열기</button><button class="button secondary" type="button" data-route="tool-runtime-audit">Runtime Audit 열기</button></div></section></section>`;
  }
  async function runAll(){
    const probe=await window.SavingioV2ProductionDeploymentProbe?.run?.();
    const e2e=window.SavingioV2ProductionE2EVerify?.run?.();
    const audit=window.SavingioV2RuntimeAudit?.run?.();
    if(audit&&probe?.pass&&e2e?.pass)window.SavingioV2BuildProgressStore?.applyRuntimeAudit?.({...audit,pass:Boolean(audit.pass&&probe.pass&&e2e.pass),deploymentProbe:probe,e2e});
    window.SavingioAdminV2?.mount?.('tool-production-verification','replace');
    return {probe,e2e,audit};
  }
  registry.register({id:'tool-production-verification',title:'운영 검증 센터',render});
  document.addEventListener('click',event=>{const button=event.target.closest('[data-production-verify="run"]');if(!button)return;event.preventDefault();button.disabled=true;runAll().catch(error=>alert(`운영 검증 실패\n${error.message}`)).finally(()=>{button.disabled=false;});});
  Object.defineProperty(window,'SavingioV2ProductionVerificationCenter',{value:Object.freeze({snapshot,runAll,verify(){return Object.freeze({pass:registry.has('tool-production-verification'),module:true});}}),writable:false,configurable:false});
})();