(() => {
  'use strict';

  const MENU_ROOT_SELECTOR = '#treeNav';
  const BOARD_ROOT_SELECTOR = '#departmentBoard';
  const MENU_GROUP_ID = 'savingio-plugin-menu-group';
  const EVENT_PREFIX = 'savingio:plugin-ui-';
  const clone = value => JSON.parse(JSON.stringify(value));
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));

  const state = { menus:new Map(), workboards:new Map(), activeWorkboard:'' };

  function manager() {
    if (!window.SavingioPluginManager) throw Object.assign(new Error('Plugin Manager가 로드되지 않았습니다.'), { code:'PLUGIN_MANAGER_MISSING' });
    return window.SavingioPluginManager;
  }

  function enabledPlugins() {
    return manager().list({ enabled:true });
  }

  function collect() {
    state.menus.clear();
    state.workboards.clear();
    const errors = [];
    enabledPlugins().forEach(plugin => {
      const manifest = plugin.manifest || {};
      if (manifest.menu) {
        if (state.menus.has(manifest.menu.id)) errors.push(`PLUGIN_MENU_DUPLICATE:${manifest.menu.id}`);
        else state.menus.set(manifest.menu.id, { ...clone(manifest.menu), pluginId:plugin.id });
      }
      if (manifest.workboard) {
        if (state.workboards.has(manifest.workboard.id)) errors.push(`PLUGIN_WORKBOARD_DUPLICATE:${manifest.workboard.id}`);
        else state.workboards.set(manifest.workboard.id, { ...clone(manifest.workboard), pluginId:plugin.id });
      }
    });
    return errors;
  }

  function orderedMenus() {
    return [...state.menus.values()].sort((a, b) => Number(a.order || 100) - Number(b.order || 100) || a.label.localeCompare(b.label, 'ko'));
  }

  function removeMenuGroup() {
    document.getElementById(MENU_GROUP_ID)?.remove();
  }

  function renderMenus() {
    const root = document.querySelector(MENU_ROOT_SELECTOR);
    if (!root) return false;
    removeMenuGroup();
    const menus = orderedMenus();
    if (!menus.length) return true;

    const section = document.createElement('section');
    section.id = MENU_GROUP_ID;
    section.className = 'tree-group plugin-tree-group';
    section.dataset.pluginGenerated = 'true';
    section.innerHTML = `<button type="button" class="tree-title" data-dept="plugins"><span>🧩</span><strong>Plugin Store</strong></button><div class="tree-children">${menus.map(menu => `<button type="button" class="tree-child plugin-tree-child" data-plugin-id="${esc(menu.pluginId)}" data-menu-id="${esc(menu.id)}" data-route="${esc(menu.route)}"><span>${esc(menu.icon || '•')}</span><strong>${esc(menu.label)}</strong></button>`).join('')}</div>`;
    root.appendChild(section);
    return true;
  }

  function resolveRenderer(workboard) {
    if (!workboard.renderer) return null;
    return workboard.renderer.split('.').reduce((value, key) => value?.[key], window);
  }

  function renderWorkboard(id, context={}) {
    const workboard = state.workboards.get(String(id || ''));
    if (!workboard) throw Object.assign(new Error(`등록되지 않은 Plugin 작업판입니다: ${id}`), { code:'PLUGIN_WORKBOARD_NOT_FOUND' });
    const root = document.querySelector(BOARD_ROOT_SELECTOR);
    if (!root) throw Object.assign(new Error('작업판 출력 영역을 찾을 수 없습니다.'), { code:'PLUGIN_WORKBOARD_ROOT_MISSING' });
    const renderer = resolveRenderer(workboard);
    if (typeof renderer !== 'function') throw Object.assign(new Error(`Plugin 작업판 Renderer가 없습니다: ${workboard.renderer}`), { code:'PLUGIN_WORKBOARD_RENDERER_MISSING' });
    state.activeWorkboard = workboard.id;
    const result = renderer(root, { ...clone(context), pluginId:workboard.pluginId, workboard:clone(workboard) });
    window.dispatchEvent(new CustomEvent(`${EVENT_PREFIX}workboard-rendered`, { detail:{ workboard:clone(workboard) } }));
    return result;
  }

  function handleMenuClick(event) {
    const item = event.target.closest('[data-plugin-generated="true"] .plugin-tree-child, #savingio-plugin-menu-group .plugin-tree-child');
    if (!item) return;
    const route = item.dataset.route || '';
    const menu = state.menus.get(item.dataset.menuId);
    if (!menu) return;
    event.preventDefault();
    const workboard = [...state.workboards.values()].find(board => board.pluginId === menu.pluginId && (!route || board.id === route || `#${board.id}` === route));
    if (workboard) renderWorkboard(workboard.id, { source:'menu', route });
    else window.dispatchEvent(new CustomEvent(`${EVENT_PREFIX}route-requested`, { detail:{ menu:clone(menu), route } }));
  }

  function sync() {
    const errors = collect();
    renderMenus();
    const report = audit(errors);
    window.dispatchEvent(new CustomEvent(`${EVENT_PREFIX}synced`, { detail:clone(report) }));
    return report;
  }

  function audit(seedErrors=[]) {
    const errors = [...seedErrors];
    const warnings = [];
    state.menus.forEach(menu => {
      if (!menu.id || !menu.label || !menu.route) errors.push(`PLUGIN_MENU_INVALID:${menu.pluginId}`);
    });
    state.workboards.forEach(workboard => {
      if (!workboard.id || !workboard.title || !workboard.renderer) errors.push(`PLUGIN_WORKBOARD_INVALID:${workboard.pluginId}`);
      else if (typeof resolveRenderer(workboard) !== 'function') warnings.push(`PLUGIN_WORKBOARD_RENDERER_UNAVAILABLE:${workboard.id}`);
    });
    return { valid:errors.length === 0, errors:[...new Set(errors)], warnings:[...new Set(warnings)], menus:state.menus.size, workboards:state.workboards.size };
  }

  function boot() {
    document.addEventListener('click', handleMenuClick, true);
    ['installed','uninstalled','enabled','disabled','registry-changed'].forEach(name => window.addEventListener(`savingio:plugin-${name}`, sync));
    window.SavingioPluginUI = Object.freeze({ sync, audit, renderMenus, renderWorkboard, menus:() => clone([...state.menus.values()]), workboards:() => clone([...state.workboards.values()]) });
    try { sync(); } catch (error) { window.dispatchEvent(new CustomEvent(`${EVENT_PREFIX}error`, { detail:{ code:error.code || 'PLUGIN_UI_BOOT_FAILED', message:error.message } })); }
    window.dispatchEvent(new CustomEvent(`${EVENT_PREFIX}ready`));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();