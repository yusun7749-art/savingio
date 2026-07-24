(() => {
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  let managerOpen = false;

  function refreshTree() {
    const os = window.SavingioOS?.modules;
    const nav = $('#treeNav');
    if (!os || !nav) return;
    const departments = os.departments();
    if (window.SAVINGIO_ADMIN_DATA) window.SAVINGIO_ADMIN_DATA.departments = departments;
    nav.innerHTML = departments.map((department, index) => `<div class="tree-group ${index === 0 ? 'open' : ''}">
      <button class="tree-title ${index === 0 ? 'active' : ''}" data-dept="${esc(department.id)}"><span>${esc(department.icon || '')} ${esc(department.name)}</span><span>⌄</span></button>
      <div class="tree-children">${department.children.map(child => `<button class="tree-child" data-child="${esc(child)}">${esc(child)}</button>`).join('')}</div>
    </div>`).join('');
  }

  function renderManager() {
    const board = $('#departmentBoard');
    const os = window.SavingioOS?.modules;
    if (!board || !os) return;
    managerOpen = true;
    const modules = os.list({ includeDisabled:true });
    board.innerHTML = `<section class="module-manager">
      <header class="module-manager-head">
        <div><h3>Savingio OS 모듈 관리</h3><p>본부를 켜고 끄거나 새 모듈을 등록해 왼쪽 메뉴에 바로 연결합니다.</p></div>
        <div class="module-manager-actions"><button class="btn ghost small" data-manager-action="reset">기본값 복원</button><button class="btn primary small" data-manager-action="new">+ 새 모듈</button></div>
      </header>
      <div id="moduleManagerForm"></div>
      <div class="module-manager-list">${modules.map(module => `<article class="module-manager-row ${module.enabled ? '' : 'off'}" data-manager-id="${esc(module.id)}">
        <div class="module-manager-name"><span class="module-manager-icon">${esc(module.icon)}</span><div><strong>${esc(module.name)}</strong><small>${esc(module.id)} · 순서 ${module.order}</small></div></div>
        <div class="module-manager-meta"><span>분류 ${module.children.length}</span><span>기능 ${module.capabilities.length}</span><span>${module.removable ? '교체 가능' : 'OS 고정'}</span></div>
        <div class="module-manager-controls"><button class="btn ghost small" data-manager-edit="${esc(module.id)}">수정</button>${module.removable ? `<button class="btn ${module.enabled ? 'danger' : 'primary'} small" data-manager-toggle="${esc(module.id)}">${module.enabled ? '끄기' : '켜기'}</button>` : '<span class="meta">LOCK</span>'}</div>
      </article>`).join('')}</div>
      <p id="moduleManagerMessage" class="module-manager-message"></p>
    </section>`;
    bindManager();
  }

  function showForm(module=null) {
    const host = $('#moduleManagerForm');
    if (!host) return;
    const children = module?.children?.join('\n') || '';
    const capabilities = module?.capabilities?.join(', ') || '';
    host.innerHTML = `<form class="module-manager-form" id="moduleEditorForm">
      <label>모듈 ID<input name="id" value="${esc(module?.id || '')}" ${module ? 'readonly' : ''} required pattern="[a-z0-9-]{2,40}" placeholder="예: image-store"></label>
      <label>표시 이름<input name="name" value="${esc(module?.name || '')}" required placeholder="예: 이미지 판매본부"></label>
      <label>아이콘<input name="icon" value="${esc(module?.icon || '◇')}" maxlength="4"></label>
      <label>메뉴 순서<input name="order" type="number" value="${esc(module?.order || 110)}" min="1" max="999"></label>
      <label class="wide">하위 분류 · 한 줄에 하나<textarea name="children" placeholder="상품 등록&#10;가격 관리&#10;판매 현황">${esc(children)}</textarea></label>
      <label class="wide">기능 · 쉼표로 구분<input name="capabilities" value="${esc(capabilities)}" placeholder="catalog, sell, analytics"></label>
      <div class="module-manager-form-actions"><button type="button" class="btn ghost small" data-editor-cancel>취소</button><button type="submit" class="btn primary small">저장</button></div>
    </form>`;
    host.querySelector('[data-editor-cancel]').onclick = () => { host.innerHTML = ''; };
    host.querySelector('form').onsubmit = event => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const input = {
        id:String(form.get('id') || '').trim(), name:String(form.get('name') || '').trim(), icon:String(form.get('icon') || '◇').trim(),
        order:Number(form.get('order') || 110),
        children:String(form.get('children') || '').split(/\n+/).map(value => value.trim()).filter(Boolean),
        capabilities:String(form.get('capabilities') || '').split(',').map(value => value.trim()).filter(Boolean), enabled:true, removable:true
      };
      try {
        if (module) window.SavingioOS.modules.update(module.id, input); else window.SavingioOS.modules.register(input);
        refreshTree(); renderManager();
        setMessage(module ? '모듈 설정을 저장하고 왼쪽 메뉴를 갱신했습니다.' : '새 모듈을 설치하고 왼쪽 메뉴에 연결했습니다.', 'pass');
      } catch (error) { setMessage(error.message, 'warn'); }
    };
  }

  function setMessage(text, type='pass') {
    const message = $('#moduleManagerMessage');
    if (!message) return;
    message.textContent = text;
    message.className = `module-manager-message ${type}`;
  }

  function bindManager() {
    const os = window.SavingioOS.modules;
    $('[data-manager-action="new"]')?.addEventListener('click', () => showForm());
    $('[data-manager-action="reset"]')?.addEventListener('click', () => {
      if (!confirm('모듈 설정과 사용자 추가 모듈을 모두 기본값으로 되돌릴까요?')) return;
      os.reset(); refreshTree(); renderManager(); setMessage('기본 모듈 구성을 복원했습니다.');
    });
    document.querySelectorAll('[data-manager-toggle]').forEach(button => button.onclick = () => {
      const module = os.get(button.dataset.managerToggle);
      if (!module) return;
      module.enabled ? os.disable(module.id) : os.enable(module.id);
      refreshTree(); renderManager(); setMessage(`${module.name} 모듈을 ${module.enabled ? '껐습니다' : '켰습니다'}.`);
    });
    document.querySelectorAll('[data-manager-edit]').forEach(button => button.onclick = () => showForm(os.get(button.dataset.managerEdit)));
  }

  function bindNavigation() {
    const nav = $('#treeNav');
    if (!nav) return;
    nav.addEventListener('click', event => {
      const child = event.target.closest('.tree-child');
      const title = event.target.closest('.tree-title');
      if (child && child.dataset.child === '모듈 관리') { event.stopImmediatePropagation(); renderManager(); return; }
      if (title && title.dataset.dept !== 'system') managerOpen = false;
      if (child && child.dataset.child !== '모듈 관리') managerOpen = false;
    }, true);
    window.addEventListener('savingio:modules-changed', () => { refreshTree(); if (managerOpen) renderManager(); });
  }

  function boot() {
    const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = '/admin/os/module-manager.css'; document.head.appendChild(link);
    refreshTree(); bindNavigation();
    document.addEventListener('click', event => { if (event.target.closest('[data-module-action="settings"]')) renderManager(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();