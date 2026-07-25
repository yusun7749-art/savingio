(() => {
  'use strict';

  const ASSET_KEY = 'savingio-os-assets-v1';
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const statusLabel = {draft:'초안',running:'진행 중',approval:'승인 대기',paused:'중지',error:'오류',done:'완료',archived:'보관'};
  const stageLabel = {wait:'대기',active:'진행 중',review:'승인 대기',paused:'중지',error:'오류',done:'완료'};
  let activeProjectId = '';

  function readAssets() {
    try { const value = JSON.parse(localStorage.getItem(ASSET_KEY) || '[]'); return Array.isArray(value) ? value : []; }
    catch { return []; }
  }

  function getProject(id) { return window.SavingioProject?.get?.(id) || null; }
  function getWorkflow(project) { return project?.workflowId ? window.SavingioWorkflow?.get?.(project.workflowId) : null; }
  function projectAssets(project) { return readAssets().filter(item => item.projectId === project.id && item.status !== 'archived'); }
  function date(value) { if (!value) return '기록 없음'; const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? '기록 없음' : parsed.toLocaleString('ko-KR'); }

  function renderStages(workflow) {
    if (!workflow?.stages?.length) return '<p class="project-detail-empty">연결된 Workflow 단계가 없습니다.</p>';
    return `<div class="project-detail-stages">${workflow.stages.map((stage,index) => `<article class="project-detail-stage ${esc(stage.status)}"><span>${index + 1}</span><div><strong>${esc(stage.name)}</strong><small>${esc(stage.moduleId)} · ${esc(stageLabel[stage.status] || stage.status)}</small></div><button type="button" data-project-module="${esc(stage.moduleId)}" data-project-stage="${esc(stage.id)}">작업판</button></article>`).join('')}</div>`;
  }

  function renderAssets(assets) {
    if (!assets.length) return '<p class="project-detail-empty">연결된 산출물이 없습니다.</p>';
    return `<div class="project-detail-assets">${assets.slice(0,8).map(item => `<article><div><strong>${esc(item.title)}</strong><small>${esc(item.moduleId || item.type)} · ${esc(item.category || '미분류')}</small></div><span>${esc(item.status || 'draft')}</span></article>`).join('')}</div>`;
  }

  function renderTimeline(workflow) {
    const approvals = workflow?.approvals || [];
    const logs = workflow?.logs || [];
    const rows = [
      ...approvals.map(item => ({type:'승인', title:item.stageName, note:item.note || item.action, actor:item.actor, createdAt:item.createdAt})),
      ...logs.map(item => ({type:'기록', title:item.title, note:item.message, actor:item.actor, createdAt:item.createdAt}))
    ].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0,8);
    if (!rows.length) return '<p class="project-detail-empty">승인·실행 기록이 없습니다.</p>';
    return `<div class="project-detail-timeline">${rows.map(item => `<article><em>${esc(item.type)}</em><div><strong>${esc(item.title)}</strong><small>${esc(item.actor || 'Savingio OS')} · ${date(item.createdAt)}</small><p>${esc(item.note || '')}</p></div></article>`).join('')}</div>`;
  }

  function render(id=activeProjectId) {
    const panel = $('#detailPanel');
    if (!panel || !window.SavingioProject) return;
    const project = getProject(id);
    if (!project) return;
    activeProjectId = project.id;
    const workflow = getWorkflow(project);
    const assets = projectAssets(project);
    const current = workflow?.stages?.find(stage => ['active','review','paused','error'].includes(stage.status));
    const github = project.github || {};
    const deployment = project.deployment || {};
    panel.innerHTML = `<section class="project-detail-unified">
      <header><div><p class="eyebrow">PROJECT CONTROL CENTER</p><h3>${esc(project.title)}</h3><p>${esc(project.id)} · ${esc(project.category)} · ${esc(project.type)}</p></div><span class="status ${esc(project.status)}">${esc(statusLabel[project.status] || project.status)}</span></header>
      <div class="project-detail-progress"><div><strong>${Number(project.progress || 0)}%</strong><span>${current ? `${esc(current.name)} 진행 중` : project.status === 'done' ? '전체 완료' : '현재 단계 확인 필요'}</span></div><i><b style="width:${Math.max(0,Math.min(100,Number(project.progress || 0)))}%"></b></i></div>
      <div class="project-detail-summary"><article><span>담당자</span><strong>${esc(project.owner)}</strong></article><article><span>우선순위</span><strong>${esc(project.priority)}</strong></article><article><span>산출물</span><strong>${assets.length}개</strong></article><article><span>승인 기록</span><strong>${workflow?.approvals?.length || 0}건</strong></article></div>
      <section class="project-detail-block"><div class="project-detail-block-head"><div><h4>Workflow</h4><p>${workflow ? esc(workflow.id) : '연결 없음'}</p></div>${workflow ? `<button class="btn ghost small" type="button" data-project-action="workflow">전체 Workflow 보기</button>` : ''}</div>${renderStages(workflow)}</section>
      <section class="project-detail-block"><div class="project-detail-block-head"><div><h4>연결 산출물</h4><p>Project ID로 연결된 실제 작업 결과</p></div></div>${renderAssets(assets)}</section>
      <section class="project-detail-block"><div class="project-detail-block-head"><div><h4>승인·활동 기록</h4><p>최근 기록 8건</p></div></div>${renderTimeline(workflow)}</section>
      <section class="project-detail-integrations"><article><span>GitHub</span><strong>${esc(github.repository || '미연결')}</strong><small>${esc(github.commitSha || github.branch || '연결 정보 없음')}</small></article><article><span>Cloudflare</span><strong>${esc(deployment.status || 'idle')}</strong><small>${esc(deployment.productionUrl || deployment.previewUrl || '배포 URL 없음')}</small></article><article><span>수익</span><strong>${Number(project.revenue?.realized || 0).toLocaleString()} ${esc(project.revenue?.currency || 'KRW')}</strong><small>예상 ${Number(project.revenue?.expected || 0).toLocaleString()}</small></article></section>
      <footer><button class="btn ghost small" type="button" data-project-action="refresh">새로고침</button><button class="btn primary small" type="button" data-project-action="workflow" ${workflow ? '' : 'disabled'}>Workflow 열기</button></footer>
    </section>`;
    bind(panel, project, workflow);
  }

  function bind(panel, project, workflow) {
    panel.querySelectorAll('[data-project-action="refresh"]').forEach(button => button.onclick = () => render(project.id));
    panel.querySelectorAll('[data-project-action="workflow"]').forEach(button => button.onclick = () => window.SavingioWorkflowBoard?.render?.(workflow?.id));
    panel.querySelectorAll('[data-project-module]').forEach(button => button.onclick = () => {
      const stage = workflow?.stages?.find(item => item.id === button.dataset.projectStage);
      window.SavingioModuleWorkspace?.open?.(button.dataset.projectModule, { projectId:project.id, projectTitle:project.title, workflowId:workflow?.id || '', stageId:stage?.id || '', stageName:stage?.name || '', category:project.category });
    });
  }

  function boot() {
    const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = '/admin/os/project-detail.css'; document.head.appendChild(link);
    $('#projectList')?.addEventListener('click', event => {
      const card = event.target.closest('.project-card');
      if (!card) return;
      setTimeout(() => render(card.dataset.id), 0);
    });
    ['savingio:projects-changed','savingio:workflows-changed','savingio:assets-changed','savingio:project-workflow-synced'].forEach(name => window.addEventListener(name, () => activeProjectId && render(activeProjectId)));
    const initial = document.querySelector('.project-card.selected')?.dataset.id || window.SavingioProject.list()[0]?.id;
    if (initial) setTimeout(() => render(initial), 0);
    window.SavingioProjectDetail = Object.freeze({ render, getActive:() => activeProjectId });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();