(() => {
  'use strict';
  const registry=window.SavingioV2Modules;
  const departments=window.SavingioV2DepartmentStore;
  const workflow=window.SavingioV2WorkflowEngine;
  if(!registry||!departments||!workflow)throw new Error('Deploy module core is not loaded');

  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const label=value=>({ready:'준비',running:'진행 중',pending:'대기',error:'오류',done:'완료'}[value]||String(value||'미연결'));
  const deployLabel=value=>({none:'미등록',queued:'배포 대기',github:'GitHub 반영',cloudflare:'Cloudflare 배포',verifying:'실제 URL 검사',verified:'검증 완료',failed:'배포 실패','rolled-back':'롤백'}[value]||String(value||'미등록'));
  const time=value=>{const date=new Date(value);return Number.isNaN(date.getTime())?String(value||''):date.toLocaleString('ko-KR');};

  function controls(job){
    if(job.status==='error')return `<button class="button" type="button" data-workflow-action="retry" data-workflow-id="${esc(job.id)}">배포 재시도</button>`;
    if(job.deployStatus==='queued')return `<button class="button" type="button" data-workflow-action="start" data-workflow-id="${esc(job.id)}">배포 시작</button>`;
    if(['github','cloudflare','verifying'].includes(job.deployStatus))return `<button class="button" type="button" data-workflow-action="advance" data-workflow-id="${esc(job.id)}">다음 배포 단계</button><button class="button secondary" type="button" data-workflow-action="fail" data-workflow-id="${esc(job.id)}">배포 오류</button>`;
    return '';
  }

  function cards(list){
    if(!list.length)return '<div class="empty">현재 배포 대기 또는 진행 중인 작업이 없습니다.</div>';
    return `<div class="project-list">${list.map(job=>`<article class="project-card"><div class="project-top"><div><div class="project-title">${esc(job.title)}</div><div class="meta">${esc(job.projectId||job.id)} · ${esc(time(job.deployUpdatedAt||job.updatedAt))}</div></div><span class="status ${esc(job.status)}">${job.priority==='urgent'?'긴급 · ':''}${esc(deployLabel(job.deployStatus))}</span></div><div class="meta">${esc(job.deployNote||'배포 대기열 등록')}</div><div class="header-actions">${controls(job)}</div></article>`).join('')}</div>`;
  }

  function history(list){
    if(!list.length)return '<div class="empty">배포 이력이 없습니다.</div>';
    return `<div class="connection-list">${list.map(job=>`<div><span>${esc(job.title)}<small class="meta">${esc(time(job.deployUpdatedAt||job.updatedAt))} · ${esc(job.deployNote||'')}</small></span><strong>${esc(deployLabel(job.deployStatus))}</strong></div>`).join('')}</div>`;
  }

  registry.register({
    id:'dept-deploy',title:'배포 센터',
    render(){
      const data=departments.read('deploy');
      const c=data.connections||{};
      const all=workflow.deployJobs('all');
      const active=all.filter(job=>job.stage==='deploy'&&!['done'].includes(job.status));
      const summary=workflow.summary().deployments;
      const recent=all.filter(job=>['verified','failed','rolled-back'].includes(job.deployStatus)).slice(0,20);
      return `<section class="view" data-module-root><header class="hero"><p>DEPLOY CENTER</p><h2>배포 센터</h2><p>승인 완료 작업을 GitHub main, Cloudflare Pages, 실제 URL 검사 순서로 관리합니다.</p></header><div class="metrics"><article class="metric"><span>부서 상태</span><strong>${label(data.status)}</strong></article><article class="metric"><span>배포 대기</span><strong>${summary.queued||0}건</strong></article><article class="metric"><span>GitHub</span><strong>${summary.github||0}건</strong></article><article class="metric"><span>Cloudflare</span><strong>${summary.cloudflare||0}건</strong></article><article class="metric"><span>URL 검사</span><strong>${summary.verifying||0}건</strong></article><article class="metric"><span>검증 완료</span><strong>${summary.verified||0}건</strong></article></div><section class="panel"><h3>배포 Queue</h3>${cards(active)}</section><section class="panel"><h3>배포 연결 상태</h3><div class="connection-list"><div><span>GitHub main</span><strong>${label(c.github)}</strong></div><div><span>Cloudflare Pages</span><strong>${label(c.cloudflare)}</strong></div><div><span>실제 URL 검사</span><strong>${label(c.liveUrl)}</strong></div><div><span>롤백 기록</span><strong>${label(c.rollback)}</strong></div></div></section><section class="panel"><h3>최근 배포 이력</h3>${history(recent)}</section></section>`;
    }
  });
})();