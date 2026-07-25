(() => {
  'use strict';

  const STORAGE_KEY='savingio-os-operations-hq-qa-v1';
  const clone=value=>JSON.parse(JSON.stringify(value));
  const now=()=>new Date().toISOString();
  const $=(selector,root=document)=>root.querySelector(selector);
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const safeList=api=>{try{const value=api?.list?.();return Array.isArray(value)?value:[]}catch{return[]}};

  const modules=[
    ['Project','SavingioProject'],['Workflow','SavingioWorkflow'],['Approval','SavingioApprovalCenter'],
    ['Automation','SavingioAutomation'],['GitHub','SavingioGitHubStatus'],['Cloudflare','SavingioCloudflareDeploy'],
    ['URL Health','SavingioUrlHealth'],['Retry','SavingioRetry'],['Deployment History','SavingioDeploymentHistory'],
    ['Log Viewer','SavingioLogViewer'],['Error Center','SavingioOperationsErrorCenter']
  ];

  function item(id,title,status,message,details={}){return {id,title,status,message,details};}
  function add(result,entry){result.items.push(entry);result.counts[entry.status]=(result.counts[entry.status]||0)+1;}
  function duplicateIds(rows){const seen=new Set(),dup=[];rows.forEach(row=>{if(!row?.id)return;if(seen.has(row.id))dup.push(row.id);seen.add(row.id);});return [...new Set(dup)];}
  function auditApi(name){try{return window[name]?.audit?.()||null}catch(error){return {valid:false,errors:[String(error?.message||error)],warnings:[]}}}

  function run(options={}){
    const startedAt=now();
    const result={id:`HQ-QA-${Date.now()}`,startedAt,completedAt:null,status:'PASS',counts:{pass:0,warn:0,fail:0},items:[],repairs:[]};

    modules.forEach(([label,key])=>{
      const loaded=Boolean(window[key]);
      add(result,item(`module-${key}`,`${label} 모듈 로딩`,loaded?'pass':'fail',loaded?'정상 로딩됨':'모듈을 찾을 수 없음',{global:key}));
    });

    const projects=safeList(window.SavingioProject);
    const workflows=safeList(window.SavingioWorkflow);
    const jobs=safeList(window.SavingioAutomation);
    const github=safeList(window.SavingioGitHubStatus);
    const deployments=safeList(window.SavingioCloudflareDeploy);
    const checks=safeList(window.SavingioUrlHealth);
    const retries=safeList(window.SavingioRetry);

    const projectDup=duplicateIds(projects);
    add(result,item('duplicate-projects','중복 프로젝트 ID',projectDup.length?'fail':'pass',projectDup.length?`${projectDup.length}개 중복 발견`:'중복 없음',{ids:projectDup}));
    const workflowDup=duplicateIds(workflows);
    add(result,item('duplicate-workflows','중복 Workflow ID',workflowDup.length?'fail':'pass',workflowDup.length?`${workflowDup.length}개 중복 발견`:'중복 없음',{ids:workflowDup}));

    const projectIds=new Set(projects.map(x=>x.id));
    const workflowIds=new Set(workflows.map(x=>x.id));
    const orphanJobs=jobs.filter(job=>(job.projectId&&!projectIds.has(job.projectId))||(job.workflowId&&!workflowIds.has(job.workflowId)));
    add(result,item('orphan-jobs','고아 Automation 작업',orphanJobs.length?'fail':'pass',orphanJobs.length?`${orphanJobs.length}개 연결 오류`:'연결 정상',{ids:orphanJobs.map(x=>x.id)}));

    const githubByJob=new Map(github.map(x=>[x.jobId,x]));
    const deploymentByJob=new Map(deployments.map(x=>[x.jobId,x]));
    const checkByDeployment=new Map(checks.map(x=>[x.deploymentId,x]));
    const brokenChain=[];
    jobs.forEach(job=>{
      const gh=githubByJob.get(job.id);const dep=deploymentByJob.get(job.id);const check=dep?checkByDeployment.get(dep.id):null;
      if(dep&&!gh)brokenChain.push(`${job.id}:DEPLOY_WITHOUT_GITHUB`);
      if(check&&!dep)brokenChain.push(`${job.id}:URL_WITHOUT_DEPLOY`);
      if(dep?.commitSha&&gh?.commitSha&&dep.commitSha!==gh.commitSha)brokenChain.push(`${job.id}:SHA_MISMATCH`);
    });
    add(result,item('release-chain','GitHub ↔ Cloudflare ↔ URL 연결',brokenChain.length?'fail':'pass',brokenChain.length?`${brokenChain.length}개 무결성 오류`:'배포 연결 정상',{errors:brokenChain}));

    const pendingApprovals=window.SavingioApprovalCenter?.list?.()?.filter?.(x=>['pending','review','hold'].includes(x.status))||[];
    add(result,item('pending-approvals','승인 대기 작업',pendingApprovals.length?'warn':'pass',pendingApprovals.length?`${pendingApprovals.length}개 대기 중`:'대기 없음',{ids:pendingApprovals.map(x=>x.id)}));
    const pendingRetries=retries.filter(x=>['waiting','running','failed'].includes(x.status));
    add(result,item('pending-retries','Retry 대기 작업',pendingRetries.length?'warn':'pass',pendingRetries.length?`${pendingRetries.length}개 확인 필요`:'대기 없음',{ids:pendingRetries.map(x=>x.id)}));
    const unresolved=window.SavingioOperationsErrorCenter?.list?.()?.filter?.(x=>!['resolved','closed'].includes(x.status))||[];
    add(result,item('unresolved-errors','미처리 오류',unresolved.length?'warn':'pass',unresolved.length?`${unresolved.length}개 미처리`:'미처리 오류 없음',{ids:unresolved.map(x=>x.id)}));

    ['SavingioGitHubStatus','SavingioCloudflareDeploy','SavingioUrlHealth','SavingioRetry'].forEach(name=>{
      const audit=auditApi(name);
      if(!audit)return;
      const fail=(audit.errors||[]).length;const warn=(audit.warnings||[]).length;
      add(result,item(`audit-${name}`,`${name.replace('Savingio','')} audit`,fail?'fail':warn?'warn':'pass',fail?`오류 ${fail}`:warn?`주의 ${warn}`:'정상',{errors:audit.errors||[],warnings:audit.warnings||[]}));
    });

    try{JSON.stringify({projects,workflows,jobs,github,deployments,checks,retries});add(result,item('json-integrity','LocalStorage 데이터 직렬화','pass','JSON 직렬화 정상'));}
    catch(error){add(result,item('json-integrity','LocalStorage 데이터 직렬화','fail',String(error?.message||error)));}

    if(options.repair){
      try{const r1=window.SavingioCloudflareDeploy?.scanGitHubStatuses?.();if(r1?.created)result.repairs.push(`Cloudflare 연결 ${r1.created}개 생성`);}catch{}
      try{const r2=window.SavingioUrlHealth?.scanDeployments?.();if(r2?.created)result.repairs.push(`URL 검사 ${r2.created}개 생성`);}catch{}
      try{window.SavingioRetry?.scan?.();result.repairs.push('Retry 대기열 재검사');}catch{}
    }

    result.completedAt=now();
    result.status=result.counts.fail?'FAIL':result.counts.warn?'WARN':'PASS';
    localStorage.setItem(STORAGE_KEY,JSON.stringify(result));
    window.dispatchEvent(new CustomEvent('savingio:operations-hq-qa-completed',{detail:{result:clone(result)}}));
    render(result);
    return clone(result);
  }

  function latest(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'null')}catch{return null}}
  function download(result){const blob=new Blob([JSON.stringify(result,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`savingio-operations-hq-qa-${Date.now()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),500);}

  function render(result=latest()){
    const host=$('.operations-hq');if(!host)return;
    let panel=$('#operationsHqQa');if(!panel){panel=document.createElement('article');panel.id='operationsHqQa';panel.className='ops-panel ops-wide operations-hq-qa';host.appendChild(panel);}
    if(!result){panel.innerHTML=`<header><div><h4>Operations HQ QA</h4><small>전체 운영 엔진과 배포 연결을 자동 점검합니다.</small></div><button class="btn small" data-hq-qa-run>QA 실행</button></header><p class="ops-empty">아직 실행된 QA 결과가 없습니다.</p>`;bind(panel);return;}
    panel.innerHTML=`<header><div><h4>Operations HQ QA</h4><small>마지막 실행 ${new Date(result.completedAt).toLocaleString('ko-KR')}</small></div><div><button class="btn ghost small" data-hq-qa-repair>자동 복구</button><button class="btn ghost small" data-hq-qa-download>결과 저장</button><button class="btn small" data-hq-qa-run>다시 실행</button></div></header><section class="hq-qa-summary ${result.status.toLowerCase()}"><strong>${esc(result.status)}</strong><span>PASS ${result.counts.pass}</span><span>WARN ${result.counts.warn}</span><span>FAIL ${result.counts.fail}</span></section>${result.repairs?.length?`<div class="hq-qa-repairs"><strong>자동 복구</strong>${result.repairs.map(x=>`<span>${esc(x)}</span>`).join('')}</div>`:''}<div class="hq-qa-list">${result.items.map(x=>`<article class="${x.status}"><span>${x.status==='pass'?'✓':x.status==='warn'?'!':'×'}</span><div><strong>${esc(x.title)}</strong><p>${esc(x.message)}</p></div><em>${x.status.toUpperCase()}</em></article>`).join('')}</div>`;
    bind(panel,result);
  }

  function bind(panel,result){$('[data-hq-qa-run]',panel)?.addEventListener('click',()=>run());$('[data-hq-qa-repair]',panel)?.addEventListener('click',()=>run({repair:true}));$('[data-hq-qa-download]',panel)?.addEventListener('click',()=>download(result||latest()));}
  function boot(){if(!$('link[data-operations-hq-qa-css]')){const link=document.createElement('link');link.rel='stylesheet';link.href='/admin/os/operations-hq-qa.css';link.dataset.operationsHqQaCss='true';document.head.appendChild(link);}window.addEventListener('savingio:operations-hq-rendered',()=>render());window.SavingioOperationsHQQA=Object.freeze({run,latest:()=>clone(latest()),render});if($('.operations-hq'))render();}

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();