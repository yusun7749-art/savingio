(() => {
  'use strict';

  const engine=window.SavingioV2WorkflowEngine;
  if(!engine)throw new Error('Workflow Engine is not loaded');
  if(window.SavingioV2TaskQueue)throw new Error('Task Queue already exists');

  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const statusLabel=value=>({pending:'대기',running:'진행 중',done:'완료',error:'오류'}[value]||value);
  const typeLabel=value=>({'new-content':'새 콘텐츠','content-update':'기존 콘텐츠 수정','seo-recheck':'SEO 재검사','urgent-fix':'긴급 수정'}[value]||value||'일반 작업');
  const time=value=>{const date=new Date(value);return Number.isNaN(date.getTime())?String(value||''):date.toLocaleString('ko-KR');};

  function render(stage){
    const jobs=engine.stageJobs(stage);
    if(!jobs.length)return '<section class="panel"><h3>Task Queue</h3><div class="empty">현재 이 부서에 대기 중인 작업이 없습니다.</div></section>';
    return `<section class="panel"><h3>Task Queue · ${jobs.length}건</h3><div class="project-list">${jobs.map(job=>`<article class="project-card" data-workflow-id="${esc(job.id)}"><div class="project-top"><div><div class="project-title">${esc(job.title)}</div><div class="meta">${esc(typeLabel(job.type))} · ${esc(job.projectId||job.id)}</div></div><span class="status ${esc(job.status)}">${job.priority==='urgent'?'긴급 · ':''}${esc(statusLabel(job.status))}</span></div><div class="meta">담당 부서 ${esc(job.owner)} · 생성 ${esc(time(job.createdAt))}</div><div class="header-actions">${job.status==='pending'?`<button class="button" type="button" data-workflow-action="start" data-workflow-id="${esc(job.id)}">작업 시작</button>`:''}${job.status==='running'?`<button class="button" type="button" data-workflow-action="advance" data-workflow-id="${esc(job.id)}">현재 단계 완료</button><button class="button secondary" type="button" data-workflow-action="fail" data-workflow-id="${esc(job.id)}">오류 처리</button>`:''}${job.status==='error'?`<button class="button" type="button" data-workflow-action="retry" data-workflow-id="${esc(job.id)}">재시도</button>`:''}</div></article>`).join('')}</div></section>`;
  }

  function handle(event){
    const button=event.target.closest('[data-workflow-action]');
    if(!button)return false;
    const id=button.dataset.workflowId;
    const action=button.dataset.workflowAction;
    if(!id||!['start','advance','fail','retry'].includes(action))return false;
    if(action==='fail')engine.fail(id,'부서 화면에서 오류 처리');
    else engine[action](id);
    return true;
  }

  Object.defineProperty(window,'SavingioV2TaskQueue',{value:Object.freeze({render,handle}),writable:false,configurable:false,enumerable:true});
})();