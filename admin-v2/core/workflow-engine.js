(() => {
  'use strict';

  const departmentStore=window.SavingioV2DepartmentStore;
  if(!departmentStore)throw new Error('Department Store is not loaded');
  if(window.SavingioV2WorkflowEngine)throw new Error('Workflow Engine already exists');

  const STORAGE_KEY='savingio-admin-v2-workflows';
  const FLOW=Object.freeze(['content','seo','image','qa','deploy','analytics','revenue']);
  const TERMINAL=Object.freeze(['done','error']);
  const PRIORITIES=Object.freeze(['urgent','normal']);
  const clone=value=>JSON.parse(JSON.stringify(value));
  const now=()=>new Date().toISOString();
  const makeId=()=>`wf-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;

  function normalizeJob(value={}){
    const stage=FLOW.includes(value.stage)?value.stage:'content';
    const status=['pending','running','done','error'].includes(value.status)?value.status:'pending';
    const type=String(value.type||'new-content');
    const priority=PRIORITIES.includes(value.priority)?value.priority:(type==='urgent-fix'?'urgent':'normal');
    return {
      id:String(value.id||makeId()),
      projectId:String(value.projectId||''),
      title:String(value.title||'제목 없음'),
      type,
      priority,
      owner:stage,
      stage,
      status,
      createdAt:String(value.createdAt||now()),
      updatedAt:String(value.updatedAt||now()),
      history:Array.isArray(value.history)?clone(value.history):[]
    };
  }

  function readAll(){
    let raw=[];
    try{raw=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]')}catch{}
    return Object.freeze((Array.isArray(raw)?raw:[]).map(normalizeJob));
  }

  function persist(list){
    const normalized=list.map(normalizeJob);
    localStorage.setItem(STORAGE_KEY,JSON.stringify(normalized));
    syncDepartments(normalized);
    window.dispatchEvent(new CustomEvent('savingio:v2-workflows-changed',{detail:{count:normalized.length}}));
    return Object.freeze(normalized.map(item=>Object.freeze(clone(item))));
  }

  function syncDepartments(list=readAll()){
    FLOW.forEach(id=>{
      const jobs=list.filter(job=>job.stage===id&&!TERMINAL.includes(job.status));
      const hasError=list.some(job=>job.stage===id&&job.status==='error');
      const hasRunning=jobs.some(job=>job.status==='running');
      departmentStore.write(id,{status:hasError?'error':hasRunning?'running':jobs.length?'pending':'ready',items:jobs.length,updated:now()});
    });
  }

  function create(input={}){
    const list=clone(readAll());
    const job=normalizeJob({
      projectId:input.projectId,
      title:input.title,
      type:input.type,
      priority:input.priority,
      stage:'content',
      status:'pending',
      history:[{stage:'content',status:'pending',at:now(),note:'워크플로 생성'}]
    });
    list.push(job);
    persist(list);
    return Object.freeze(clone(job));
  }

  function update(id,patch={}){
    const list=clone(readAll());
    const index=list.findIndex(job=>job.id===id);
    if(index<0)throw new Error(`Workflow not found: ${id}`);
    list[index]=normalizeJob({...list[index],...patch,updatedAt:now()});
    persist(list);
    return Object.freeze(clone(list[index]));
  }

  function start(id){
    const current=readAll().find(job=>job.id===id);
    if(!current)throw new Error(`Workflow not found: ${id}`);
    if(TERMINAL.includes(current.status))throw new Error(`Workflow cannot start from ${current.status}`);
    return update(id,{status:'running',history:[...current.history,{stage:current.stage,status:'running',at:now(),note:'작업 시작'}]});
  }

  function advance(id){
    const current=readAll().find(job=>job.id===id);
    if(!current)throw new Error(`Workflow not found: ${id}`);
    if(current.status!=='running')throw new Error('Only running workflow can advance');
    const index=FLOW.indexOf(current.stage);
    const history=[...current.history,{stage:current.stage,status:'done',at:now(),note:'단계 완료'}];
    if(index===FLOW.length-1)return update(id,{status:'done',history});
    const next=FLOW[index+1];
    history.push({stage:next,status:'pending',at:now(),note:'다음 부서 전달'});
    return update(id,{stage:next,owner:next,status:'pending',history});
  }

  function fail(id,message='오류 발생'){
    const current=readAll().find(job=>job.id===id);
    if(!current)throw new Error(`Workflow not found: ${id}`);
    return update(id,{status:'error',history:[...current.history,{stage:current.stage,status:'error',at:now(),note:String(message)}]});
  }

  function retry(id){
    const current=readAll().find(job=>job.id===id);
    if(!current)throw new Error(`Workflow not found: ${id}`);
    if(current.status!=='error')throw new Error('Only errored workflow can retry');
    return update(id,{status:'pending',history:[...current.history,{stage:current.stage,status:'pending',at:now(),note:'재시도 대기'}]});
  }

  function stageJobs(stage,{includeDone=false}={}){
    if(!FLOW.includes(stage))return Object.freeze([]);
    const jobs=readAll().filter(job=>job.stage===stage&&(includeDone||!TERMINAL.includes(job.status)));
    jobs.sort((a,b)=>{
      const priority=(a.priority==='urgent'?0:1)-(b.priority==='urgent'?0:1);
      return priority||new Date(a.createdAt)-new Date(b.createdAt);
    });
    return Object.freeze(jobs.map(job=>Object.freeze(clone(job))));
  }

  function summary(){
    const jobs=readAll();
    const state=jobs.reduce((acc,job)=>{acc[job.status]=(acc[job.status]||0)+1;return acc},{pending:0,running:0,done:0,error:0});
    const stages=Object.fromEntries(FLOW.map(stage=>[stage,jobs.filter(job=>job.stage===stage&&!TERMINAL.includes(job.status)).length]));
    return Object.freeze({total:jobs.length,state:Object.freeze(state),stages:Object.freeze(stages)});
  }

  function verify(){
    const jobs=readAll();
    const invalid=jobs.filter(job=>!FLOW.includes(job.stage)||!['pending','running','done','error'].includes(job.status)||!PRIORITIES.includes(job.priority));
    return Object.freeze({storageKey:STORAGE_KEY,flow:FLOW,count:jobs.length,invalid:invalid.length,pass:invalid.length===0});
  }

  syncDepartments();
  Object.defineProperty(window,'SavingioV2WorkflowEngine',{value:Object.freeze({create,readAll,stageJobs,start,advance,fail,retry,summary,verify,flow:FLOW,priorities:PRIORITIES,storageKey:STORAGE_KEY}),writable:false,configurable:false,enumerable:true});
})();