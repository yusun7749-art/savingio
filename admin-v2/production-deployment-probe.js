(() => {
  'use strict';
  const ALLOWED_HOSTS=Object.freeze(['savingio.com','www.savingio.com','savingio.pages.dev']);
  const STATE_KEY='savingio-admin-v2-production-deployment-probe';
  const HISTORY_KEY='savingio-admin-v2-production-deployment-history';
  const DEPLOY_ID='DEP-ADMIN-V2';
  const HISTORY_LIMIT=50;
  const assets=Object.freeze([
    {path:'/admin-v2/index.html',marker:'Savingio Admin V2'},
    {path:'/admin-v2/core/operations-dashboard-store.js',marker:'SavingioV2OperationsDashboardStore'},
    {path:'/admin-v2/modules/command.js',marker:'SavingioV2CommandCenter'},
    {path:'/admin-v2/production-e2e-verify.js',marker:'SavingioV2ProductionE2E'},
    {path:'/admin-v2/operational-actions.js',marker:'SavingioV2OperationalActions'}
  ]);
  const isProductionHost=()=>ALLOWED_HOSTS.includes(location.hostname);
  const readHistory=()=>{try{const rows=JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]');return Array.isArray(rows)?rows:[]}catch{return []}};
  const writeHistory=state=>{const row={pass:Boolean(state.pass),skipped:Boolean(state.skipped),host:String(state.host||location.hostname),path:String(state.path||location.pathname),checkedAt:String(state.checkedAt||new Date().toISOString()),total:Number(state.total)||0,passed:Number(state.passed)||0,failed:Number(state.failed)||0,reason:String(state.reason||''),rows:Array.isArray(state.rows)?state.rows.map(item=>({...item})):[]};const history=[row,...readHistory()].slice(0,HISTORY_LIMIT);localStorage.setItem(HISTORY_KEY,JSON.stringify(history));window.dispatchEvent(new CustomEvent('savingio:v2-production-deployment-history-changed',{detail:{count:history.length,latest:row}}));return row;};
  const save=state=>{try{sessionStorage.setItem(STATE_KEY,JSON.stringify(state));}catch{}document.documentElement.dataset.deploymentProbe=state.pass?'pass':'fail';window.dispatchEvent(new CustomEvent('savingio:v2-production-deployment-probe',{detail:state}));return state;};
  async function inspect(asset){const url=new URL(asset.path,location.origin);url.searchParams.set('_deploy_probe',Date.now().toString());try{const response=await fetch(url,{cache:'no-store',credentials:'same-origin'});const text=await response.text();return Object.freeze({path:asset.path,status:response.status,ok:response.ok,marker:asset.marker,markerFound:text.includes(asset.marker)});}catch(error){return Object.freeze({path:asset.path,status:0,ok:false,marker:asset.marker,markerFound:false,error:error?.message||String(error)});}}
  function updateDeployInventory(state){const store=window.SavingioV2DeployInventoryStore;if(!store?.upsert)return null;const current=store.get(DEPLOY_ID)||{id:DEPLOY_ID,title:'Admin V2 운영본부',targetUrl:'/admin-v2/',environment:'production',approved:true,github:true,cloudflare:true,rollbackReady:true,commitSha:'',deploymentId:''};return store.upsert({...current,status:state.pass?'verified':'failed',liveUrl:state.pass,note:state.pass?`운영 브라우저 핵심 자산 ${state.passed}/${state.total} 확인 · ${location.host}`:`운영 브라우저 핵심 자산 FAIL ${state.failed}건 · ${location.host}`});}
  async function run(){let state;if(!isProductionHost()){state=Object.freeze({pass:false,skipped:true,reason:'production-host-required',host:location.hostname,path:location.pathname,checkedAt:new Date().toISOString(),total:assets.length,passed:0,failed:assets.length,rows:[]});writeHistory(state);return save(state);}const rows=await Promise.all(assets.map(inspect));const passed=rows.filter(row=>row.ok&&row.markerFound).length;state=Object.freeze({pass:passed===rows.length,skipped:false,host:location.hostname,path:location.pathname,checkedAt:new Date().toISOString(),total:rows.length,passed,failed:rows.length-passed,rows:Object.freeze(rows)});writeHistory(state);updateDeployInventory(state);return save(state);}
  function verify(){let state=null;try{state=JSON.parse(sessionStorage.getItem(STATE_KEY)||'null');}catch{}const history=readHistory();return Object.freeze({pass:Boolean(state?.pass),checked:Boolean(state),host:state?.host||location.hostname,total:Number(state?.total)||assets.length,passed:Number(state?.passed)||0,failed:Number(state?.failed)||assets.length,skipped:Boolean(state?.skipped),historyCount:history.length,lastHistoryPass:history[0]?Boolean(history[0].pass):null});}
  Object.defineProperty(window,'SavingioV2ProductionDeploymentProbe',{value:Object.freeze({run,verify,readHistory,isProductionHost,allowedHosts:ALLOWED_HOSTS,stateKey:STATE_KEY,historyKey:HISTORY_KEY,assets}),writable:false,configurable:false});
  queueMicrotask(run);window.addEventListener('pageshow',event=>{if(event.persisted)run();});
})();