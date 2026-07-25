(() => {
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const labels = () => window.SavingioWorkflow?.labels || {};
  let activeId = '';

  function progress(workflow) {
    const done = workflow.stages.filter(stage => stage.status === 'done').length;
    return workflow.stages.length ? Math.round(done / workflow.stages.length * 100) : 0;
  }

  function renderList() {
    const workflows = window.SavingioWorkflow?.list() || [];
    return workflows.map(workflow => `<button class="workflow-list-item ${workflow.id === activeId ? 'active' : ''}" data-workflow-id="${esc(workflow.id)}"><span><strong>${esc(workflow.title)}</strong><small>${esc(workflow.category)} · ${progress(workflow)}%</small></span><span class="workflow-state">${esc(workflow.status === 'done' ? '완료' : workflow.status === 'paused' ? '중지' : '진행')}</span></button>`).join('') || '<div class="module-empty">등록된 워크플로가 없습니다.</div>';
  }

  function renderDetail(workflow) {
    if (!workflow) return '<div class="module-empty">왼쪽에서 프로젝트를 선택해 주세요.</div>';
    const review = workflow.stages.some(stage => stage.status === 'review');
    const paused = workflow.status === 'paused';
    return `<article class="workflow-detail">
      <header><div><p class="eyebrow">PROJECT WORKFLOW</p><h4>${esc(workflow.title)}</h4><p>${esc(workflow.category)} · ${progress(workflow)}% 완료</p></div><span class="workflow-progress"><i style="width:${progress(workflow)}%"></i></span></header>
      <div class="workflow-stage-list">${workflow.stages.map((stage, index) => `<div class="workflow-stage ${esc(stage.status)}"><span class="workflow-stage-index">${index + 1}</span><div><strong>${esc(stage.name)}</strong><small>${esc(stage.moduleId)} · ${esc(labels()[stage.status] || stage.status)}</small></div><span class="workflow-stage-badge">${esc(labels()[stage.status] || stage.status)}</span></div>`).join('')}</div>
      <footer class="workflow-actions"><button class="btn ghost small" data-workflow-action="${paused ? 'resume' : 'pause'}">${paused ? '다시 시작' : '일시 중지'}</button>${review ? '<button class="btn primary small" data-workflow-action="approve">승인 후 다음 단계</button>' : '<button class="btn primary small" data-workflow-action="advance">현재 단계 완료·인계</button>'}</footer>
      <p id="workflowMessage" class="module-workspace-message"></p>
    </article>`;
  }

  function render() {
    const board = $('#departmentBoard');
    if (!board || !window.SavingioWorkflow) return;
    const workflows = window.SavingioWorkflow.list();
    if (!activeId || !workflows.some(item => item.id === activeId)) activeId = workflows[0]?.id || '';
    const active = workflows.find(item => item.id === activeId) || null;
    board.innerHTML = `<section class="workflow-board"><header class="module-workspace-head"><div class="module-workspace-title"><span class="module-workspace-icon">⇢</span><div><h3>Workflow Engine</h3><p>시장분석부터 배포·성과분석까지 한 프로젝트를 본부 간 자동 인계합니다.</p></div></div><button class="btn primary small" data-workflow-new>+ 프로젝트 워크플로</button></header><div class="workflow-grid"><aside class="workflow-list">${renderList()}</aside><section>${renderDetail(active)}</section></div></section>`;
    bind();
  }

  function setMessage(text, type='pass') {
    const message = $('#workflowMessage');
    if (!message) return;
    message.textContent = text;
    message.className = `module-workspace-message ${type}`;
  }

  function bind() {
    document.querySelectorAll('[data-workflow-id]').forEach(button => button.onclick = () => { activeId = button.dataset.workflowId; render(); });
    $('[data-workflow-new]')?.addEventListener('click', () => {
      const title = prompt('새 프로젝트 이름을 입력해 주세요.');
      if (!title) return;
      const workflow = window.SavingioWorkflow.create({ title:title.trim(), category:'미분류' });
      activeId = workflow.id; render(); setMessage('공통 워크플로를 생성하고 시장분석 단계부터 시작했습니다.');
    });
    document.querySelectorAll('[data-workflow-action]').forEach(button => button.onclick = () => {
      const action = button.dataset.workflowAction;
      if (!activeId) return;
      const result = action === 'approve' ? window.SavingioWorkflow.approve(activeId) : action === 'pause' ? window.SavingioWorkflow.pause(activeId) : action === 'resume' ? window.SavingioWorkflow.resume(activeId) : window.SavingioWorkflow.advance(activeId);
      render();
      setMessage(result ? (action === 'approve' ? '승인 완료 후 다음 본부로 인계했습니다.' : action === 'pause' ? '워크플로를 일시 중지했습니다.' : action === 'resume' ? '워크플로를 다시 시작했습니다.' : '현재 단계를 완료하고 다음 본부로 인계했습니다.') : '워크플로를 처리하지 못했습니다.', result ? 'pass' : 'warn');
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
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();