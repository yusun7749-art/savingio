(() => {
  const STATUS_LABELS = {draft:'초안',working:'작업 중',review:'검토',approved:'승인',scheduled:'예약',published:'게시',paused:'중지',archived:'보관',error:'오류'};
  const STORAGE_KEY = 'savingio-os-assets-v1';
  const CONTEXT_KEY = 'savingio-os-module-context-v1';
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const readAssets = () => { try { const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); return Array.isArray(value) ? value : []; } catch { return []; } };
  const readContext = () => { try { return JSON.parse(sessionStorage.getItem(CONTEXT_KEY) || 'null'); } catch { return null; } };
  const writeContext = context => context ? sessionStorage.setItem(CONTEXT_KEY, JSON.stringify(context)) : sessionStorage.removeItem(CONTEXT_KEY);
  let activeModuleId = 'command';
  let activeChild = '';
  let activeContext = readContext();

  function syncProjectAsset(asset, action) {
    if (!asset?.projectId || !window.SavingioProject) return;
    if (action === 'archived' || action === 'removed') window.SavingioProject.unlinkAsset(asset.projectId, asset.id);
    else window.SavingioProject.linkAsset(asset.projectId, asset.id);
  }

  function writeAssets(assets, detail={}) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(assets));
    if (detail.asset) syncProjectAsset(detail.asset, detail.action || 'updated');
    window.dispatchEvent(new CustomEvent('savingio:assets-changed', { detail:{ assets, ...detail } }));
  }

  function moduleItems(module) {
    return readAssets().filter(item => item.moduleId === module.id && (!activeChild || item.category === activeChild || item.subcategory === activeChild));
  }

  function summary(items) {
    return [
      ['전체 항목', items.length],
      ['작업 중', items.filter(item => ['draft','working'].includes(item.status)).length],
      ['승인 대기', items.filter(item => item.status === 'review').length],
      ['게시·완료', items.filter(item => ['approved','scheduled','published'].includes(item.status)).length]
    ];
  }

  function createSample(module) {
    const title = prompt(`${module.name}에 추가할 산출물 이름을 입력해 주세요.`);
    if (!title) return;
    const asset = window.SavingioOS.modules.createAsset(module.id, {
      title:title.trim(),
      category:activeChild || module.children[0] || '미분류',
      status:'draft',
      projectId:activeContext?.projectId || '',
      projectTitle:activeContext?.projectTitle || '',
      workflowId:activeContext?.workflowId || '',
      workflowStageId:activeContext?.stageId || '',
      workflowStageName:activeContext?.stageName || '',
      outputType:module.id === 'video' ? 'media' : module.id === 'content' ? 'document' : module.id === 'market' ? 'report' : 'asset'
    });
    const assets = readAssets();
    assets.unshift(asset);
    writeAssets(assets, { action:'created', asset });
    render(module.id, activeChild);
  }

  function removeAsset(id) {
    if (!confirm('이 항목을 보관함으로 이동할까요?')) return;
    let archived = null;
    const assets = readAssets().map(item => {
      if (item.id !== id) return item;
      archived = {...item,status:'archived',updatedAt:new Date().toISOString()};
      return archived;
    });
    writeAssets(assets, { action:'archived', asset:archived });
    render(activeModuleId, activeChild);
  }

  function contextBanner(module) {
    if (!activeContext || activeContext.moduleId !== module.id) return '';
    const linked = readAssets().filter(item => item.workflowId === activeContext.workflowId && item.workflowStageId === activeContext.stageId && item.status !== 'archived').length;
    return `<section class="module-project-context"><div><small>WORKFLOW PROJECT CONTEXT</small><strong>${esc(activeContext.projectTitle || '프로젝트')}</strong><span>${esc(activeContext.stageName || '현재 단계')} · ${esc(activeContext.category || '미분류')} · 연결 산출물 ${linked}개</span></div><div><button class="btn ghost small" data-context-action="workflow">워크플로로 돌아가기</button><button class="btn ghost small" data-context-action="clear">문맥 해제</button></div></section>`;
  }

  function render(moduleId='command', child='') {
    const board = $('#departmentBoard');
    if (!board || !window.SavingioOS?.modules) return;
    const module = window.SavingioOS.modules.get(moduleId) || window.SavingioOS.modules.get('command');
    if (!module) return;
    activeModuleId = module.id; activeChild = child || '';
    const items = moduleItems(module);
    const cards = summary(items);
    const tabs = ['전체', ...module.children];
    board.innerHTML = `<section class="module-workspace" data-module="${esc(module.id)}">
      ${contextBanner(module)}
      <header class="module-workspace-head">
        <div class="module-workspace-title"><span class="module-workspace-icon">${esc(module.icon)}</span><div><h3>${esc(module.name)}</h3><p>${activeChild ? esc(activeChild) + ' 분류만 표시 중' : '등록된 항목을 분류별로 넣고 빼는 공통 작업판'}</p></div></div>
        <div class="module-workspace-actions"><button class="btn ghost small" data-module-action="settings">분류·설정</button><button class="btn primary small" data-module-action="add">+ 산출물 추가</button></div>
      </header>
      <nav class="module-workspace-tabs">${tabs.map(tab => `<button class="module-workspace-tab ${(tab === '전체' && !activeChild) || tab === activeChild ? 'active' : ''}" data-module-tab="${esc(tab)}">${esc(tab)}</button>`).join('')}</nav>
      <div class="module-workspace-summary">${cards.map(([label,value]) => `<article class="module-summary-card"><span>${esc(label)}</span><strong>${value}</strong></article>`).join('')}</div>
      <div class="module-workspace-body">
        <section class="module-pane"><h4>${activeChild ? esc(activeChild) : '전체 항목'}</h4><div class="module-item-list">${items.length ? items.map(item => `<article class="module-item"><div><strong>${esc(item.title)}</strong><small>${esc(item.category)} · ${new Date(item.updatedAt).toLocaleString('ko-KR')}${item.projectId ? ' · 프로젝트 연결' : ''}${item.workflowStageId ? ' · 워크플로 연결' : ''}</small></div><div><span class="module-item-status">${esc(STATUS_LABELS[item.status] || item.status)}</span> <button class="btn ghost small" data-archive-id="${esc(item.id)}">보관</button></div></article>`).join('') : '<div class="module-empty">이 분류에는 아직 항목이 없습니다.<br>‘산출물 추가’를 누르면 현재 프로젝트와 워크플로 단계에 자동 연결됩니다.</div>'}</div></section>
        <aside class="module-pane"><h4>사용 가능한 기능</h4><div class="module-capabilities">${module.capabilities.map(item => `<span class="module-capability">${esc(item)}</span>`).join('')}</div><h4 style="margin-top:18px">모듈 규격</h4><p class="meta">같은 엔진에서 목록·상태·승인·배포·수익·통계를 공유합니다. 워크플로에서 들어온 산출물은 프로젝트와 단계 ID로 자동 연결되고, 보관 시 프로젝트 연결 목록에서도 해제됩니다.</p></aside>
      </div><p class="module-workspace-message" id="moduleWorkspaceMessage"></p>
    </section>`;

    board.querySelectorAll('[data-module-tab]').forEach(button => button.onclick = () => render(module.id, button.dataset.moduleTab === '전체' ? '' : button.dataset.moduleTab));
    board.querySelector('[data-module-action="add"]')?.addEventListener('click', () => createSample(module));
    board.querySelector('[data-module-action="settings"]')?.addEventListener('click', () => { const message = $('#moduleWorkspaceMessage'); message.textContent = `${module.name}의 분류 ${module.children.length}개와 기능 ${module.capabilities.length}개가 Module Registry에서 관리됩니다.`; message.className = 'module-workspace-message pass'; });
    board.querySelectorAll('[data-archive-id]').forEach(button => button.onclick = () => removeAsset(button.dataset.archiveId));
    board.querySelector('[data-context-action="clear"]')?.addEventListener('click', () => { activeContext = null; writeContext(null); render(module.id, activeChild); });
    board.querySelector('[data-context-action="workflow"]')?.addEventListener('click', () => window.SavingioWorkflowBoard?.render?.(activeContext?.workflowId));
  }

  function open(moduleId, context={}) {
    activeContext = {...context, moduleId};
    writeContext(activeContext);
    const title = document.querySelector(`.tree-title[data-dept="${CSS.escape(moduleId)}"]`);
    title?.closest('.tree-group')?.classList.add('open');
    document.querySelectorAll('.tree-title').forEach(item => item.classList.toggle('active', item === title));
    render(moduleId, '');
  }

  function reconcileProjectAssets() {
    if (!window.SavingioProject) return;
    const activeAssets = readAssets().filter(item => item.projectId && item.status !== 'archived');
    const grouped = new Map();
    activeAssets.forEach(asset => {
      if (!grouped.has(asset.projectId)) grouped.set(asset.projectId, []);
      grouped.get(asset.projectId).push(asset.id);
    });
    window.SavingioProject.list({includeArchived:true}).forEach(project => {
      const expected = grouped.get(project.id) || [];
      const current = Array.isArray(project.assetIds) ? project.assetIds : [];
      if (expected.length !== current.length || expected.some(id => !current.includes(id))) window.SavingioProject.update(project.id, { assetIds:expected });
    });
  }

  function bindTree() {
    const nav = $('#treeNav');
    if (!nav) return;
    nav.addEventListener('click', event => {
      const title = event.target.closest('.tree-title');
      if (title) { activeChild = ''; activeContext = null; writeContext(null); render(title.dataset.dept, ''); return; }
      const child = event.target.closest('.tree-child');
      if (child) {
        const group = child.closest('.tree-group');
        const moduleId = group?.querySelector('.tree-title')?.dataset.dept || activeModuleId;
        activeContext = null; writeContext(null); render(moduleId, child.dataset.child || child.textContent.trim());
      }
    });
  }

  function boot() {
    const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = '/admin/os/module-workspace.css'; document.head.appendChild(link);
    reconcileProjectAssets();
    bindTree(); render(activeModuleId, '');
    window.addEventListener('savingio:modules-changed', () => render(activeModuleId, activeChild));
    window.SavingioModuleWorkspace = Object.freeze({ open, render, reconcileProjectAssets, getContext:() => activeContext ? {...activeContext} : null });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();