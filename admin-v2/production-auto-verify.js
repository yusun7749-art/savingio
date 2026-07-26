(() => {
  'use strict';

  const ALLOWED_HOSTS=Object.freeze(['savingio.com','www.savingio.com','savingio.pages.dev']);
  const STATE_KEY='savingio-admin-v2-production-auto-verify';
  const isProductionHost=()=>ALLOWED_HOSTS.includes(location.hostname);

  function snapshot(status,extra={}){
    const state=Object.freeze({status,host:location.hostname,path:location.pathname,checkedAt:new Date().toISOString(),...extra});
    try{sessionStorage.setItem(STATE_KEY,JSON.stringify(state));}catch{}
    window.dispatchEvent(new CustomEvent('savingio:v2-production-auto-verify',{detail:state}));
    return state;
  }

  function run(){
    if(!isProductionHost())return snapshot('skipped',{reason:'production-host-required'});
    const audit=window.SavingioV2RuntimeAudit;
    const e2e=window.SavingioV2ProductionE2EVerify;
    const deploymentProbe=window.SavingioV2ProductionDeploymentProbe;
    const progress=window.SavingioV2BuildProgressStore;
    if(!audit?.run||!e2e?.run||!deploymentProbe?.verify||!progress?.applyRuntimeAudit){
      return snapshot('blocked',{reason:'dependencies-missing',audit:Boolean(audit?.run),e2e:Boolean(e2e?.run),deploymentProbe:Boolean(deploymentProbe?.verify),progress:Boolean(progress?.applyRuntimeAudit)});
    }
    try{
      const probeResult=deploymentProbe.verify();
      if(!probeResult.checked||!probeResult.pass){
        return snapshot('blocked',{reason:'deployment-probe-pending-or-failed',deploymentProbe:probeResult});
      }
      const auditResult=audit.run();
      const e2eResult=e2e.run();
      const combinedRows=[...(auditResult.rows||[]),...(e2eResult.rows||[]).map(item=>({name:`E2E · ${item.name}`,pass:item.pass}))];
      const result=Object.freeze({
        ...auditResult,
        rows:Object.freeze(combinedRows),
        total:combinedRows.length,
        passed:combinedRows.filter(item=>item.pass).length,
        failed:combinedRows.filter(item=>!item.pass).length,
        pass:Boolean(auditResult.pass&&e2eResult.pass&&probeResult.pass),
        checkedAt:new Date().toISOString(),
        e2e:e2eResult,
        deploymentProbe:probeResult
      });
      const next=progress.applyRuntimeAudit(result);
      document.documentElement.dataset.productionAudit=result.pass?'pass':'fail';
      return snapshot(result.pass?'pass':'fail',{result,e2e:e2eResult,deploymentProbe:probeResult,progress:{status:next.status,percent:next.percent},releaseId:result.releaseId,version:result.version});
    }catch(error){
      document.documentElement.dataset.productionAudit='error';
      return snapshot('error',{reason:error?.message||String(error)});
    }
  }

  Object.defineProperty(window,'SavingioV2ProductionAutoVerify',{value:Object.freeze({run,isProductionHost,allowedHosts:ALLOWED_HOSTS,stateKey:STATE_KEY}),writable:false,configurable:false});
  queueMicrotask(run);
  window.addEventListener('savingio:v2-production-deployment-probe',event=>{if(event.detail?.pass)run();});
  window.addEventListener('pageshow',event=>{if(event.persisted)run();});
})();