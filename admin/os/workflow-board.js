(() => {
  const ASSET_KEY = 'savingio-os-assets-v1';
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const labels = () => window.SavingioWorkflow?.labels || {};
  const readAssets = () => { try { const value = JSON.parse(localStorage.getItem(ASSET_KEY) || '[]'); return Array.isArray(value) ? value : []; } catch { return []; } };
  let activeId = '';
  let logFilter = 'all';
  let logQuery = '';

  function progress(workflow) {
    const done = workflow.stages.filter(stage => stage.status === 'done').length;
    return workflow.stages.length ? Math.round(done / workflow.stages.length * 100) : 0;
  }

  function currentStage(workflow) {
    return workflow?.stages.find(stage => ['active','review','error','paused'].includes(stage.status)) || workflow?.stages.find(stage => stage.status === 'wait') || null;
  }

  function stageOutputs(workflowId, stageId) {
    return readAssets().filter(item => item.workflowId === workflowId && item.workflowStageId === stageId && item.status !== 'archived');
  }

  function outputLabel(item) {
    const type = item.outputType || '';
    if (type === 'media') return '미디어';
    if (type === 'document') return '문서';
    if (type === 'report') return '리포트';
    return '산출물';
  }

  function approvalLabel(action) {
    return action === 'approved' ? '승인' : action === 'rejected' ? '반려' : '승인 요청';
  }

  function logLevelLabel(level) {
    return level === 'success' ? '성공' : level === 'warn' ? '주의' : level === 'error' ? '오류' : '정보';
  }

  function renderList() {
    const workflows = window.SavingioWorkflow?.list() || [];
    return workflows.map(workflow => {
      const outputCount = workflow.stages.reduce((sum, stage) => sum + stageOutputs(workflow.id, stage.id).length, 0);
      const approvalCount = Array.isArray(workflow.approvals) ? workflow.approvals.length : 0;
      const logCount = Array.isArray(workflow.logs) ? workflow.logs.length : 0;
      return `<button class="workflow-list-item ${workflow.id === activeId ? 'active' : ''}" data-workflow-id="${esc(workflow.id)}"><span><strong>${esc(workflow.title)}</strong><small>${esc(workflow.category)} · ${progress(workflow)}% · 산출물 ${outputCount} · 승인 ${approvalCount} · 로그 ${logCount}</small></span><span class="workflow-state">${esc(workflow.status === 'done' ? '완료' : workflow.status === 'paused' ? '중지' : workflow.status === 'error' ? '오류' : '진행')}</span></button>`;
    }).join('') || '<div class="module-empty">등록된 워크플로가 없습니다.</div>';
  }

  function renderOutputs(workflow, stage) {
    const outputs = stageOutputs(workflow.id, stage.id);
    if (!outputs.length) return `<div class="workflow-output-empty">연결된 산출물 없음</div>`;
    return `<div class="workflow-output-list">${outputs.map(item => `<article class="workflow-output-item"><span class="workflow-output-type">${esc(outputLabel(item))}</span><div><strong>${esc(item.title)}</strong><small>${esc(item.category || '미분류')} · ${esc(item.status || 'draft')} · ${new Date(item.updatedAt || Date.now()).toLocaleString('ko-KR')}</small></div></article>`).join('')}</div>`;
  }

  function renderApprovals(workflow) {
    const approvals = Array.isArray(workflow.approvals) ? workflow.approvals : [];
    return `<section class="workflow-approval-history"><header><div><p class="eyebrow">APPROVAL HISTORY</p><h5>승인 이력</h5></div><strong>${approvals.length}건</strong></header>${approvals.length ? `<div class="workflow-approval-list">${approvals.map(item => `<article class="workflow-approval-item ${esc(item.action)}"><span class="approval-dot"></span><div><strong>${esc(approvalLabel(item.action))} · ${esc(item.stageName)}</strong><small>${esc(item.actor)} · ${new Date(item.createdAt).toLocaleString('ko-KR')}</small>${item.note ? `<p>${esc(item.note)}</p>` : ''}</div></article>`).join('')}</div>` : '<div class="workflow-output-empty">아직 승인 이력이 없습니다.</div>'}</section>`;
  }

  function filteredLogs(workflow) {
    const query = logQuery.trim().toLowerCase();
    return (Array.isArray(workflow.logs) ? workflow.logs : []).filter(item => {
      if (logFilter === 'error' && item.level !== 'error') return false;
      if (!query) return true;
      return [item.title,item.message,item.actor,item.moduleId,item.stageName].some(value => String(value || '').toLowerCase().includes(query));
    });
  }

  function renderLogs(workflow) {
    const logs = filteredLogs(workflow);
    const total = Array.isArray(workflow.logs) ? workflow.logs.length : 0;
    return `<section class="workflow-log-history"><header><div><p class="eyebrow">ACTIVITY LOG</p><h5>실행 로그</h5></div><strong>${total}건</strong></header><div class="workflow-log-toolbar"><input id="workflowLogSearch" type="search" value="${esc(logQuery)}" placeholder="단계·담당 본부·메시지 검색"><div class="workflow-log-filters"><button class="chip ${logFilter === 'all' ? 'active' : ''}" data-log-filter="all">전체</button><button class="chip ${logFilter === 'error' ? 'active' : ''}" data-log-filter="error">오류만</button></div></div>${logs.length ? `<div class="workflow-log-list">${logs.map(item => `<button class="workflow-log-item ${esc(item.level)}" type="button" data-log-stage="${esc(item.stageId)}"><span class="workflow-log-dot"></span><div><div class="workflow-log-title"><strong>${esc(item.title)}</strong><em>${esc(logLevelLabel(item.level))}</em></div><small>${esc(item.actor)} · ${new Date(item.createdAt).toLocaleString('ko-KR')}${item.stageName ? ` · ${esc(item.stageName)}` : ''}</small>${item.message ? `<p>${esc(item.message)}</p>` : ''}</div></button>`).join('')}</div>` : '<div class="workflow-output-empty">조건에 맞는 실행 로그가 없습니다.</div>'}</section>`;
  }

  function renderDetail(workflow) {
    if (!workflow) return '<div class="module-empty">왼쪽에서 프로젝트를 선택해 주세요.</div>';
    const review = workflow.stages.some(stage => stage.status === 'review');
    const paused = workflow.status === 'paused';
    const current = currentStage(workflow);
    const totalOutputs = workflow.stages.reduce((sum, stage) => sum + stageOutputs(workflow.id, stage.id).length, 0);
    return `<article class="workflow-detail">
      <header><div><p class="eyebrow">PROJECT WORKFLOW</p><h4>${esc(workflow.title)}</h4><p>${esc(workflow.category)} · ${progress(workflow)}% 완료 · 연결 산출물 ${totalOutputs}개</p></div><span class="workflow-progress"><i style="width:${progress(workflow)}%"></i></span></header>
      ${current ? `<section class="workflow-handoff"><div><small>현재 담당 본부</small><strong>${esc(current.name)}</strong><span>${esc(current.moduleId)} · ${esc(labels()[current.status] || current.status)}</span></div><button class="btn primary small" data-workflow-open-module="${esc(current.id)}">담당 본부 작업판 열기</button></section>` : ''}
      <div class="workflow-stage-list">${workflow.stages.map((stage, index) => {
        const outputs = stageOutputs(workflow.id, stage.id);
        return `<section class="workflow-stage-card" id="workflow-stage-${esc(stage.id)}"><div class="workflow-stage ${esc(stage.status)}"><span class="workflow-stage-index">${index + 1}</span><div><strong>${esc(stage.name)}</strong><small>${esc(stage.moduleId)} · ${esc(labels()[stage.status] || stage.status)} · 산출물 ${outputs.length}개</small></div><div class="workflow-stage-controls"><span class="workflow-stage-badge">${esc(labels()[stage.status] || stage.status)}</span><button class="btn ghost small" data-stage-open="${esc(stage.id)}">${stage.status === 'done' ? '보기' : '열기'}</button></div></div>${renderOutputs(workflow, stage)}</section>`;
      }).join('')}</div>
      ${renderApprovals(workflow)}
      ${renderLogs(workflow)}
      <footer class="workflow-actions"><button class="btn ghost small" data-workflow-action="${paused ? 'resume' : 'pause'}">${paused ? '다시 시작' : '일시 중지'}</button>${review ? '<button class="btn danger small" data-workflow-action="reject">반려</button><button class="btn primary small" data-workflow-action="approve">승인 후 다음 단계</button>' : '<button class="btn primary small" data-workflow-action="advance">현재 단계 완료·인계</button>'}</footer>
      <p id="workflowMessage" class="module-workspace-message"></p>
    </article>`;
  }

  function render(requestedId='') {
    const board = $('#departmentBoard');
    if (!board || !window.SavingioWorkflow) return;
    const workflows = window.SavingioWorkflow.list();
    if (requestedId && workflows.some(item => item.id === requestedId)) activeId = requestedId;
    if (!activeId || !workflows.some(item => item.id === activeId)) activeId = workflows[0]?.id || '';
    const active = workflows.find(item => item.id === activeId) || null;
    board.innerHTML = `<section class="workflow-board"><header class="module-workspace-head"><div class="module-workspace-title"><span class="module-workspace-icon">⇢</span><div><h3>Workflow Engine</h3><p>산출물·승인·실행 기록을 프로젝트별 활동 타임라인으로 보존합니다.</p></div></div><button class="btn primary small" data-workflow-new>+ 프로젝트 워크플로</button></header><div class="workflow-grid"><aside class="workflow-list">${renderList()}</aside><section>${renderDetail(active)}</section></div></section>`;
    bind();
  }

  function setMessage(text, type='pass') {
    const message = $('#workflowMessage');
    if (!message) return;
    message.textContent = text;
    message.className = `module-workspace-message ${type}`;
  }

  function openStage(stageId) {
    const workflow = window.SavingioWorkflow.get(activeId);
    const stage = workflow?.stages.find(item => item.id === stageId);
    if (!workflow || !stage || !window.SavingioModuleWorkspace?.open) { setMessage('담당 본부 작업판을 열 수 없습니다.', 'warn'); return; }
    window.SavingioModuleWorkspace.open(stage.moduleId, { workflowId:workflow.id, projectId:workflow.projectId, projectTitle:workflow.title, category:workflow.category, stageId:stage.id, stageName:stage.name, stageStatus:stage.status });
  }

  function bind() {
    document.querySelectorAll('[data-workflow-id]').forEach(button => button.onclick = () => { activeId = button.dataset.workflowId; logFilter = 'all'; logQuery = ''; render(); });
    $('[data-workflow-new]')?.addEventListener('click', () => {
      const title = prompt('새 프로젝트 이름을 입력해 주세요.');
      if (!title) return;
      const workflow = window.SavingioWorkflow.create({ title:title.trim(), category:'미분류' });
      activeId = workflow.id; render(); setMessage('공통 워크플로를 생성하고 실행 로그를 시작했습니다.');
    });
    document.querySelectorAll('[data-stage-open]').forEach(button => button.onclick = () => openStage(button.dataset.stageOpen));
    $('[data-workflow-open-module]')?.addEventListener('click', event => openStage(event.currentTarget.dataset.workflowOpenModule));
    document.querySelectorAll('[data-log-filter]').forEach(button => button.onclick = () => { logFilter = button.dataset.logFilter; render(activeId); });
    $('#workflowLogSearch')?.addEventListener('input', event => { logQuery = event.target.value; render(activeId); requestAnimationFrame(() => { const input=$('#workflowLogSearch'); input?.focus(); input?.setSelectionRange(logQuery.length,logQuery.length); }); });
    document.querySelectorAll('[data-log-stage]').forEach(button => button.onclick = () => {
      const stageId = button.dataset.logStage;
      if (!stageId) return;
      document.getElementById(`workflow-stage-${stageId}`)?.scrollIntoView({ behavior:'smooth', block:'center' });
    });
    document.querySelectorAll('[data-workflow-action]').forEach(button => button.onclick = () => {
      const action = button.dataset.workflowAction;
      if (!activeId) return;
      let result = null;
      if (action === 'approve') {
        const note = prompt('승인 메모를 입력해 주세요.', '승인 완료') ?? '승인 완료';
        result = window.SavingioWorkflow.approve(activeId, { actor:'선장님', note });
      } else if (action === 'reject') {
        const note = prompt('반려 사유를 입력해 주세요.', '수정 후 재검토 필요');
        if (note === null) return;
        result = window.SavingioWorkflow.reject(activeId, { actor:'선장님', note });
      } else if (action === 'pause') result = window.SavingioWorkflow.pause(activeId);
      else if (action === 'resume') result = window.SavingioWorkflow.resume(activeId);
      else result = window.SavingioWorkflow.advance(activeId);
      render();
      setMessage(result ? (action === 'approve' ? '승인과 실행 로그를 저장하고 다음 본부로 인계했습니다.' : action === 'reject' ? '반려와 오류 로그를 저장했습니다.' : action === 'pause' ? '중지 로그를 저장했습니다.' : action === 'resume' ? '재시작 로그를 저장했습니다.' : '단계 완료·인계 로그를 저장했습니다.') : '워크플로를 처리하지 못했습니다.', result ? 'pass' : 'warn');
    });
  }

  function shouldOpen(target) {
    const title = target.closest('.tree-title');
    const child = target.closest('.tree-child');
    return (title?.dataset.dept === 'automation') || (child && child.closest('.tree-group')?.querySelector('.tree-title')?.dataset.dept === 'automation' && ['워크플로 관리','실행 예정','실행 중'].includes(child.dataset.child || child.textContent.trim()));
  }

  function boot() {
    const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = '/admin/os/workflow-board.css'; document.head.appendChild(link);
    const nav = $('#treeNav');
    nav?.addEventListener('click', event => { if (!shouldOpen(event.target)) return; event.stopImmediatePropagation(); render(); }, true);
    $('#newProjectBtn')?.addEventListener('click', () => setTimeout(() => {
      const projects = window.SAVINGIO_ADMIN_DATA?.projects || [];
      const workflows = window.SavingioWorkflow.list();
      projects.forEach(project => { if (!workflows.some(item => item.projectId === project.id)) window.SavingioWorkflow.create({ projectId:project.id, title:project.title, category:project.category }); });
    }, 50));
    window.addEventListener('savingio:workflows-changed', () => { if (document.querySelector('.workflow-board')) render(); });
    window.addEventListener('savingio:assets-changed', event => {
      const detail = event.detail || {};
      if (detail.asset?.workflowId && window.SavingioWorkflow?.log) window.SavingioWorkflow.log(detail.asset.workflowId, { type:'asset-updated', level:'success', title:detail.action === 'archived' ? '산출물 보관' : '산출물 등록', message:detail.asset.title || '산출물 상태가 변경되었습니다.', actor:'담당 본부', moduleId:detail.asset.moduleId || '', stageId:detail.asset.workflowStageId || '', stageName:detail.asset.workflowStageName || '', targetId:detail.asset.id || '' });
      if (document.querySelector('.workflow-board')) render();
    });
    window.addEventListener('storage', event => { if (event.key === ASSET_KEY && document.querySelector('.workflow-board')) render(); });
    window.SavingioWorkflowBoard = Object.freeze({ render, openStage });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();