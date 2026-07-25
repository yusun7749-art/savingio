(() => {
  'use strict';

  const STORAGE_KEY='savingio-os-automation-qa-v1';
  const clone=value=>JSON.parse(JSON.stringify(value));
  const now=()=>new Date().toISOString();
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

  const MODULES=[
    ['automation','SavingioAutomation',['list','get','update']],
    ['github-status','SavingioGitHubStatus',['list']],
    ['cloudflare-deploy','SavingioCloudflareDeploy',['list']],
    ['url-health','SavingioUrlHealth',['list']],
    ['retry','SavingioRetry',['list']],
    ['next-task','SavingioNextTask',['list']],
    ['controller','SavingioAutomationController',['state','audit','lock','unlock','isLocked']]
  ];

  const STORAGE_KEYS=[
    'savingio-os-automation-jobs-v1','savingio-os-github-status-v1','savingio-os-cloudflare-deployments-v1',
    'savingio-os-url-health-v1','savingio-os-retry-records-v1','savingio-os-next-tasks-v1','savingio-os-automation-controller-v1'
  ];

  function history(){
    try{const value=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');return Array.isArray(value)?value:[];}
    catch{return [];}
  }

  function save(report){
    const items=[report,...history().filter(item=>item.id!==report.id)].slice(0,100);
    localStorage.setItem(STORAGE_KEY,JSON.stringify(items));
    window.dispatchEvent(new CustomEvent('savingio:automation-qa-completed',{detail:{report:clone(report)}}));
    return clone(report);
  }

  function check(id,title,pass,detail='',level='error',module='automation'){
    return {id,title,pass:Boolean(pass),detail:String(detail||''),level:pass?'pass':level,module};
  }

  function moduleChecks(){
    const results=[];
    MODULES.forEach(([id,globalName,methods])=>{
      const api=window[globalName];
      results.push(check(`module-${id}`,`${globalName} 로딩`,Boolean(api),api?'전역 API 준비':'전역 API 없음','error',id));
      if(!api)return;
      methods.forEach(method=>results.push(check(`method-${id}-${method}`,`${globalName}.${method}()`,typeof api[method]==='function',typeof api[method]==='function'?'함수 준비':'필수 함수 없음','error',id)));
    });
    return results;
  }

  function storageChecks(){
    return STORAGE_KEYS.map(key=>{
      const raw=localStorage.getItem(key);
      if(raw===null)return check(`storage-${key}`,`${key} 저장소`,true,'아직 데이터 없음','warning','storage');
      try{JSON.parse(raw);return check(`storage-${key}`,`${key} 저장소`,true,'JSON 정상','error','storage');}
      catch{return check(`storage-${key}`,`${key} 저장소`,false,'JSON 손상','error','storage');}
    });
  }

  function auditChecks(){
    const results=[];
    [['retry','SavingioRetry'],['next-task','SavingioNextTask'],['controller','SavingioAutomationController']].forEach(([id,globalName])=>{
      const api=window[globalName];
      if(!api)return;
      if(typeof api.audit!=='function'){
        results.push(check(`audit-${id}`,`${globalName} audit`,false,'audit() 없음','warning',id));
        return;
      }
      try{
        const report=api.audit();
        results.push(check(`audit-${id}`,`${globalName} audit`,report?.valid!==false,(report?.errors||[]).join(', ')||'감사 통과',report?.valid===false?'error':'warning',id));
      }catch(error){results.push(check(`audit-${id}`,`${globalName} audit`,false,error?.message||'예외','error',id));}
    });
    return results;
  }

  function referenceChecks(){
    const jobs=window.SavingioAutomation?.list?.()||[];
    const retries=window.SavingioRetry?.list?.()||[];
    const nextTasks=window.SavingioNextTask?.list?.()||[];
    const ids=jobs.map(item=>item.id);
    const idSet=new Set(ids);
    const duplicate=ids.filter((id,index)=>ids.indexOf(id)!==index);
    const orphanRetries=retries.filter(item=>item.jobId&&!idSet.has(item.jobId));
    const orphanTasks=nextTasks.filter(item=>item.parentJobId&&!idSet.has(item.parentJobId));
    const malformed=jobs.filter(job=>!job.id||!job.status);
    return [
      check('job-id-unique','Automation Job ID 중복',duplicate.length===0,duplicate.join(', ')||'중복 없음','error','automation'),
      check('job-schema','Automation Job 필수값',malformed.length===0,malformed.map(item=>item.id||'unknown').join(', ')||'Schema 정상','error','automation'),
      check('retry-reference','Retry Job 연결',orphanRetries.length===0,orphanRetries.map(item=>item.id).join(', ')||'고아 Retry 없음','warning','retry'),
      check('next-task-reference','Next Task 연결',orphanTasks.length===0,orphanTasks.map(item=>item.id).join(', ')||'고아 Task 없음','warning','next-task')
    ];
  }

  function controllerContractChecks(){
    const api=window.SavingioAutomationController;
    if(!api)return [];
    const results=[];
    try{
      const state=api.state();
      results.push(check('controller-paused','Controller paused 형식',typeof state.paused==='boolean',typeof state.paused,'error','controller'));
      results.push(check('controller-locks','Controller locks 형식',Array.isArray(state.locks),Array.isArray(state.locks)?`${state.locks.length}개`:'배열 아님','error','controller'));
      results.push(check('controller-history','Controller history 형식',Array.isArray(state.history),Array.isArray(state.history)?`${state.history.length}개`:'배열 아님','error','controller'));
      const testId=`qa-${Date.now()}`;
      const locked=api.lock('qa',testId,'Automation QA');
      const visible=api.isLocked('qa',testId);
      const unlocked=api.unlock('qa',testId);
      const cleared=!api.isLocked('qa',testId);
      results.push(check('controller-lock-cycle','Controller Lock/Unlock 순환',locked&&visible&&unlocked&&cleared,`lock=${locked}, visible=${visible}, unlock=${unlocked}, cleared=${cleared}`,'error','controller'));
    }catch(error){results.push(check('controller-contract','Controller 계약 검사',false,error?.message||'예외','error','controller'));}
    return results;
  }

  function pipelineChecks(){
    const jobs=window.SavingioAutomation?.list?.()||[];
    const github=window.SavingioGitHubStatus?.list?.()||[];
    const deploys=window.SavingioCloudflareDeploy?.list?.()||[];
    const health=window.SavingioUrlHealth?.list?.()||[];
    const successful=jobs.filter(job=>job.status==='success');
    const missingCompleted=successful.filter(job=>!job.completedAt);
    const runningMissingStart=jobs.filter(job=>job.status==='running'&&!job.startedAt);
    return [
      check('pipeline-github','GitHub 상태 API',Array.isArray(github),`${github.length}건`,'error','github-status'),
      check('pipeline-cloudflare','Cloudflare 배포 API',Array.isArray(deploys),`${deploys.length}건`,'error','cloudflare-deploy'),
      check('pipeline-url-health','URL Health API',Array.isArray(health),`${health.length}건`,'error','url-health'),
      check('success-completed-at','성공 Job 완료시각',missingCompleted.length===0,missingCompleted.map(item=>item.id).join(', ')||'정상','error','automation'),
      check('running-started-at','실행 Job 시작시각',runningMissingStart.length===0,runningMissingStart.map(item=>item.id).join(', ')||'정상','warning','automation')
    ];
  }

  function summarize(checks){
    const counts={pass:0,warning:0,error:0};
    checks.forEach(item=>{if(item.pass)counts.pass+=1;else counts[item.level==='warning'?'warning':'error']+=1;});
    return {status:counts.error?'FAIL':counts.warning?'WARN':'PASS',counts};
  }

  function run(options={}){
    const startedAt=now();
    const checks=[...moduleChecks(),...storageChecks(),...auditChecks(),...referenceChecks(),...controllerContractChecks(),...pipelineChecks()];
    const summary=summarize(checks);
    return save({id:`AQA-${Date.now().toString(36).toUpperCase()}`,status:summary.status,counts:summary.counts,startedAt,completedAt:now(),trigger:String(options.trigger||'manual'),checks});
  }

  function render(root){
    const report=run({trigger:'dashboard'});
    root.innerHTML=`<section class="workboard-view"><header class="workboard-head"><div><p class="eyebrow">SAVINGIO AUTOMATION ENGINE QA</p><h3>Automation Engine 통합 QA</h3><p>GitHub 작업 생성부터 Cloudflare 배포, URL 검사, 재시도, 다음 작업, 전체 제어까지 통합 점검합니다.</p></div><div class="workboard-current"><small>최종 결과</small><strong>${esc(report.status)}</strong><span>통과 ${report.counts.pass} · 경고 ${report.counts.warning} · 실패 ${report.counts.error}</span></div></header><div class="workboard-layout"><main class="workboard-phases"><details open><summary><strong>QA 검사 결과</strong><span>${report.checks.length}</span></summary><ul>${report.checks.map(item=>`<li class="workboard-task ${item.pass?'done':item.level==='warning'?'todo':'active'}"><span class="workboard-mark">${item.pass?'✓':item.level==='warning'?'△':'!'}</span><span><strong>${esc(item.title)}</strong>${esc(item.detail)}</span><em>${item.pass?'PASS':item.level.toUpperCase()}</em></li>`).join('')}</ul></details></main><aside class="workboard-side"><section><h4>검사 범위</h4><p>Automation · GitHub · Cloudflare · URL Health · Retry · Next Task · Controller</p></section><section><h4>실행 이력</h4><p>누적 ${history().length}회</p></section><section><button type="button" data-automation-qa-rerun>다시 검사</button></section></aside></div></section>`;
    root.querySelector('[data-automation-qa-rerun]')?.addEventListener('click',()=>render(root));
    return report;
  }

  function boot(){
    window.SavingioAutomationQA=Object.freeze({run,render,latest:()=>clone(history()[0]||null),history:()=>clone(history()),clear:()=>{localStorage.removeItem(STORAGE_KEY);return [];}});
    window.dispatchEvent(new CustomEvent('savingio:automation-qa-ready'));
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();