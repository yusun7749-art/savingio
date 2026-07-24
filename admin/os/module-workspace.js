(() => {
  const STATUS_LABELS = {draft:'초안',working:'작업 중',review:'검토',approved:'승인',scheduled:'예약',published:'게시',paused:'중지',archived:'보관',error:'오류'};
  const STORAGE_KEY = 'savingio-os-assets-v1';
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const readAssets = () => { try { const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); return Array.isArray(value) ? value : []; } catch { return []; } };
  const writeAssets = assets => localStorage.setItem(STORAGE_KEY, JSON.stringify(assets));
  let activeModuleId = 'command';
  let activeChild = '';

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
    const title = prompt(`${module.name}에 추가할 항목 이름을 입력해 주세요.`);
    if (!title) return;
    const asset = window.SavingioOS.modules.createAsset(module.id, { title:title.trim(), category:activeChild || module.children[0] || '미분류', status:'draft' });
    const assets = readAssets(); assets.unshift(asset); writeAssets(assets); render(module.id, activeChild);
  }

  function removeAsset(id) {
    if (!confirm('이 항목을 보관함으로 이동할까요?')) return;
    const assets = readAssets().map(item => item.id === id ? {...item,status:'archived',updatedAt:new Date().toISOString()} : item);
    writeAssets(assets); render(activeModuleId, activeChild);
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
      <header class="module-workspace-head">
        <div class="module-workspace-title"><span class="module-workspace-icon">${esc(module.icon)}</span><div><h3>${esc(module.name)}</h3><p>${activeChild ? esc(activeChild) + ' 분류만 표시 중' : '등록된 항목을 분류별로 넣고 빼는 공통 작업판'}</p></div></div>
        <div class="module-workspace-actions"><button class="btn ghost small" data-module-action="settings">분류·설정</button><button class="btn primary small" data-module-action="add">+ 항목 추가</button></div>
      </header>
      <nav class="module-workspace-tabs">${tabs.map(tab => `<button class="module-workspace-tab ${(tab === '전체' && !activeChild) || tab === activeChild ? 'active' : ''}" data-module-tab="${esc(tab)}">${esc(tab)}</button>`).join('')}</nav>
      <div class="module-workspace-summary">${cards.map(([label,value]) => `<article class="module-summary-card"><span>${esc(label)}</span><strong>${value}</strong></article>`).join('')}</div>
      <div class="module-workspace-body">
        <section class="module-pane"><h4>${activeChild ? esc(activeChild) : '전체 항목'}</h4><div class="module-item-list">${items.length ? items.map(item => `<article class="module-item"><div><strong>${esc(item.title)}</strong><small>${esc(item.category)} · ${new Date(item.updatedAt).toLocaleString('ko-KR')}</small></div><div><span class="module-item-status">${esc(STATUS_LABELS[item.status] || item.status)}</span> <button class="btn ghost small" data-archive-id="${esc(item.id)}">보관</button></div></article>`).join('') : '<div class="module-empty">이 분류에는 아직 항목이 없습니다.<br>‘항목 추가’를 누르면 이 자리에 바로 들어옵니다.</div>'}</div></section>
        <aside class="module-pane"><h4>사용 가능한 기능</h4><div class="module-capabilities">${module.capabilities.map(item => `<span class="module-capability">${esc(item)}</span>`).join('')}</div><h4 style="margin-top:18px">모듈 규격</h4><p class="meta">같은 엔진에서 목록·상태·승인·배포·수익·통계를 공유합니다. 모듈을 끄거나 교체해도 다른 본부 데이터는 건드리지 않습니다.</p></aside>
      </div><p class="module-workspace-message" id="moduleWorkspaceMessage"></p>
    </section>`;

    board.querySelectorAll('[data-module-tab]').forEach(button => button.onclick = () => render(module.id, button.dataset.moduleTab === '전체' ? '' : button.dataset.moduleTab));
    board.querySelector('[data-module-action="add"]')?.addEventListener('click', () => createSample(module));
    board.querySelector('[data-module-action="settings"]')?.addEventListener('click', () => { const message = $('#moduleWorkspaceMessage'); message.textContent = `${module.name}의 분류 ${module.children.length}개와 기능 ${module.capabilities.length}개가 Module Registry에서 관리됩니다.`; message.className = 'module-workspace-message pass'; });
    board.querySelectorAll('[data-archive-id]').forEach(button => button.onclick = () => removeAsset(button.dataset.archiveId));
  }

  function bindTree() {
    const nav = $('#treeNav');
    if (!nav) return;
    nav.addEventListener('click', event => {
      const title = event.target.closest('.tree-title');
      if (title) { activeChild = ''; render(title.dataset.dept, ''); return; }
      const child = event.target.closest('.tree-child');
      if (child) {
        const group = child.closest('.tree-group');
        const moduleId = group?.querySelector('.tree-title')?.dataset.dept || activeModuleId;
        render(moduleId, child.dataset.child || child.textContent.trim());
      }
    });
  }

  function boot() {
    const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = '/admin/os/module-workspace.css'; document.head.appendChild(link);
    bindTree(); render(activeModuleId, '');
    window.addEventListener('savingio:modules-changed', () => render(activeModuleId, activeChild));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();