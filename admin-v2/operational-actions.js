(() => {
  'use strict';
  const command=window.SavingioV2CommandCenter;
  const workflow=window.SavingioV2WorkflowEngine;
  const workspace=document.getElementById('adminWorkspace');
  const STORAGE_KEY='savingio-admin-v2-operational-action-audit';
  if(!command||!workflow||!workspace)throw new Error('Operational Actions dependencies are not loaded');
  const now=()=>new Date().toISOString();
  const readAudit=()=>{try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]')}catch{return []}};
  const persistAudit=record=>{const rows=[record,...readAudit()].slice(0,50);localStorage.setItem(STORAGE_KEY,JSON.stringify(rows));window.dispatchEvent(new CustomEvent('savingio:v2-operational-action-audited',{detail:record}));return record;};
  function verifyCreated(job,beforeCount){
    const rows=workflow.readAll();
    const stored=rows.find(item=>item.id===job?.id);
    const pass=Boolean(job&&stored&&rows.length===beforeCount+1&&stored.type==='urgent-fix'&&stored.priority==='urgent'&&stored.stage==='content'&&stored.status==='pending');
    return Object.freeze({pass,jobId:job?.id||'',beforeCount,afterCount:rows.length,type:stored?.type||'',priority:stored?.priority||'',stage:stored?.stage||'',status:stored?.status||''});
  }
  function handle(event){
    const button=event.target.closest('[data-operational-action][data-operational-kind][data-operational-id]');
    if(!button)return;
    event.preventDefault();
    event.stopPropagation();
    const beforeCount=workflow.readAll().length;
    try{
      const job=command.handleOperationalAction(button.dataset.operationalAction,button.dataset.operationalKind,button.dataset.operationalId);
      const result=verifyCreated(job,beforeCount);
      const record=persistAudit({at:now(),action:button.dataset.operationalAction,kind:button.dataset.operationalKind,sourceId:button.dataset.operationalId,jobId:result.jobId,pass:result.pass,beforeCount:result.beforeCount,afterCount:result.afterCount,type:result.type,priority:result.priority,stage:result.stage,status:result.status});
      if(!record.pass)throw new Error('워크플로 생성 후 저장 검증에 실패했습니다.');
      window.SavingioAdminV2?.mount?.('command-error','replace');
      alert(`긴급 수정 워크플로 생성 완료\n${job.title}\n검증: PASS`);
    }catch(error){
      persistAudit({at:now(),action:button.dataset.operationalAction,kind:button.dataset.operationalKind,sourceId:button.dataset.operationalId,jobId:'',pass:false,beforeCount,afterCount:workflow.readAll().length,error:error.message});
      alert(`긴급 수정 작업 생성 실패\n${error.message}`);
    }
  }
  function latest(){return readAudit()[0]||null;}
  function verify(){const record=latest();return Object.freeze({pass:Boolean(command.handleOperationalAction&&workflow.readAll&&workspace),workspace:Boolean(workspace),lastActionPass:record?Boolean(record.pass):null,auditCount:readAudit().length});}
  workspace.addEventListener('click',handle,true);
  Object.defineProperty(window,'SavingioV2OperationalActions',{value:Object.freeze({verify,latest,readAudit,verifyCreated,storageKey:STORAGE_KEY}),writable:false,configurable:false});
})();