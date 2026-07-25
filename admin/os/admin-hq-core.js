(() => {
  'use strict';

  const STORAGE_KEY = 'savingio-admin-hq-state-v1';
  const $ = (selector, root = document) => root.querySelector(selector);
  const clone = value => JSON.parse(JSON.stringify(value));
  const now = () => new Date().toISOString();
  const read = () => {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return value && typeof value === 'object' ? value : {};
    } catch {
      return {};
    }
  };
  const write = value => localStorage.setItem(STORAGE_KEY, JSON.stringify(value));

  const modules = [
    { id:'home', title:'Home HQ', group:'core', global:'SavingioHomeHQ', route:'home' },
    { id:'projects', title:'Project HQ', group:'core', global:'SavingioProject', route:'projects' },
    { id:'workflow', title:'Workflow HQ', group:'core', global:'SavingioWorkflow', route:'workflow' },
    { id:'operations', title:'Operations HQ', group:'core', global:'SavingioOperationsHQ', route:'operations' },
    { id:'approval', title:'Approval HQ', group:'core', global:'SavingioApprovalCenter', route:'approval' },
    { id:'plugins', title:'Plugin Store', group:'extension', global:'SavingioPluginManager', route:'plugins' },
    { id:'marketplace', title:'Plugin Marketplace', group:'extension', global:'SavingioPluginMarketplace', route:'marketplace' },
    { id:'assets', title:'Asset / Image Center', group:'content', global:'SavingioImageStorePlugin', route:'assets' },
    { id:'calculators', title:'Calculator Center', group:'content', global:'SavingioCalculatorPlugin', route:'calculators' },
    { id:'tests', title:'Psychology Test Center', group:'content', global:'SavingioPsychologyTestPlugin', route:'tests' },
    { id:'games', title:'Game Center', group:'content', global:'SavingioGamePlugin', route:'games' },
    { id:'affiliate', title:'Coupon & Affiliate Center', group:'revenue', global:'SavingioCouponAffiliatePlugin', route:'affiliate' },
    { id:'products', title:'Digital Product Center', group:'revenue', global:'SavingioDigitalProductPlugin', route:'products' },
    { id:'analytics', title:'Analytics Center', group:'revenue', global:'SavingioAnalytics', route:'analytics' },
    { id:'revenue', title:'Revenue Center', group:'revenue', global:'SavingioRevenue', route:'revenue' },
    { id:'settings', title:'Settings Center', group:'system', global:'SavingioPluginSettings', route:'settings' }
  ];

  const state = Object.assign({
    version:1,
    activeModule:'home',
    favorites:[],
    recentModules:[],
    recentProjects:[],
    notifications:[],
    tasks:[],
    role:'owner',
    updatedAt:now()
  }, read());

  function persist() {
    state.updatedAt = now();
    write(state);
    window.dispatchEvent(new CustomEvent('savingio:admin-hq-state-changed', { detail:snapshot() }));
  }

  function snapshot() {
    return clone({ state, modules:moduleStatus() });
  }

  function moduleStatus() {
    return modules.map(module => ({
      ...module,
      loaded:Boolean(window[module.global]),
      favorite:state.favorites.includes(module.id),
      active:state.activeModule === module.id
    }));
  }

  function register(module) {
    if (!module?.id || modules.some(item => item.id === module.id)) return false;
    modules.push({ group:'extension', route:module.id, ...module });
    window.dispatchEvent(new CustomEvent('savingio:admin-hq-modules-changed', { detail:moduleStatus() }));
    return true;
  }

  function open(moduleId, meta={}) {
    const module = modules.find(item => item.id === moduleId);
    if (!module) return null;
    state.activeModule = moduleId;
    state.recentModules = [moduleId, ...state.recentModules.filter(id => id !== moduleId)].slice(0, 8);
    persist();
    window.dispatchEvent(new CustomEvent('savingio:admin-hq-open', { detail:{ module:clone(module), meta } }));
    renderStatusBar();
    return clone(module);
  }

  function toggleFavorite(moduleId) {
    if (!modules.some(item => item.id === moduleId)) return false;
    state.favorites = state.favorites.includes(moduleId)
      ? state.favorites.filter(id => id !== moduleId)
      : [moduleId, ...state.favorites].slice(0, 12);
    persist();
    renderStatusBar();
    return state.favorites.includes(moduleId);
  }

  function addNotification(input={}) {
    const entry = { id:input.id || `NOTI-${Date.now()}`, title:input.title || '알림', message:input.message || '', level:input.level || 'info', read:false, createdAt:input.createdAt || now(), source:input.source || 'admin-hq' };
    state.notifications = [entry, ...state.notifications.filter(item => item.id !== entry.id)].slice(0, 200);
    persist();
    renderStatusBar();
    return clone(entry);
  }

  function markNotificationsRead() {
    state.notifications = state.notifications.map(item => ({ ...item, read:true }));
    persist();
    renderStatusBar();
  }

  function enqueue(input={}) {
    const task = { id:input.id || `TASK-${Date.now()}`, title:input.title || '작업', status:input.status || 'queued', projectId:input.projectId || '', source:input.source || 'admin-hq', createdAt:input.createdAt || now(), updatedAt:now() };
    state.tasks = [task, ...state.tasks.filter(item => item.id !== task.id)].slice(0, 300);
    persist();
    renderStatusBar();
    return clone(task);
  }

  function trackProject(project) {
    if (!project?.id) return;
    const item = { id:project.id, title:project.title || project.id, updatedAt:now() };
    state.recentProjects = [item, ...state.recentProjects.filter(row => row.id !== item.id)].slice(0, 10);
    persist();
  }

  function search(term='') {
    const q = String(term).trim().toLowerCase();
    if (!q) return moduleStatus();
    return moduleStatus().filter(item => [item.id, item.title, item.group, item.route].some(value => String(value).toLowerCase().includes(q)));
  }

  function audit() {
    const rows = moduleStatus();
    const required = rows.filter(item => item.group === 'core');
    const missing = required.filter(item => !item.loaded);
    return {
      valid:missing.length === 0,
      status:missing.length ? 'WARN' : 'PASS',
      checkedAt:now(),
      total:rows.length,
      loaded:rows.filter(item => item.loaded).length,
      missing:missing.map(item => item.id),
      warnings:missing.map(item => `${item.title} 모듈이 아직 로딩되지 않았습니다.`),
      errors:[]
    };
  }

  function renderStatusBar() {
    let bar = $('#adminHqStatusBar');
    if (!bar) {
      bar = document.createElement('section');
      bar.id = 'adminHqStatusBar';
      bar.className = 'admin-hq-statusbar';
      document.body.appendChild(bar);
    }
    const active = modules.find(item => item.id === state.activeModule) || modules[0];
    const unread = state.notifications.filter(item => !item.read).length;
    const pending = state.tasks.filter(item => !['done','completed','cancelled'].includes(item.status)).length;
    const loaded = moduleStatus().filter(item => item.loaded).length;
    bar.innerHTML = `<button type="button" data-admin-hq-home><strong>SAVINGIO ADMIN HQ</strong><span>${active.title}</span></button><div><span>모듈 ${loaded}/${modules.length}</span><button type="button" data-admin-hq-tasks>작업 ${pending}</button><button type="button" data-admin-hq-notifications>알림 ${unread}</button><button type="button" data-admin-hq-favorites>즐겨찾기 ${state.favorites.length}</button></div>`;
    $('[data-admin-hq-home]', bar)?.addEventListener('click', () => open('home'));
    $('[data-admin-hq-notifications]', bar)?.addEventListener('click', markNotificationsRead);
    $('[data-admin-hq-tasks]', bar)?.addEventListener('click', () => window.dispatchEvent(new CustomEvent('savingio:admin-hq-task-queue-open', { detail:clone(state.tasks) })));
    $('[data-admin-hq-favorites]', bar)?.addEventListener('click', () => window.dispatchEvent(new CustomEvent('savingio:admin-hq-favorites-open', { detail:state.favorites.map(id => modules.find(item => item.id === id)).filter(Boolean) })));
  }

  function bindEvents() {
    window.addEventListener('savingio:project-created', event => { trackProject(event.detail?.project); enqueue({ title:`${event.detail?.project?.title || '프로젝트'} 워크플로 시작`, projectId:event.detail?.project?.id, source:'project' }); });
    window.addEventListener('savingio:operations-errors-changed', () => addNotification({ title:'Operations HQ 오류 상태 변경', level:'warn', source:'operations' }));
    window.addEventListener('savingio:approval-center-changed', () => addNotification({ title:'승인 작업함 상태 변경', source:'approval' }));
    window.addEventListener('savingio:cloudflare-deployments-changed', () => addNotification({ title:'Cloudflare 배포 상태 변경', source:'cloudflare' }));
    window.addEventListener('keydown', event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        window.dispatchEvent(new CustomEvent('savingio:admin-hq-command-open', { detail:{ modules:moduleStatus(), state:clone(state) } }));
      }
    });
  }

  function boot() {
    if (!$('link[data-admin-hq-core-css]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '/admin/os/admin-hq-core.css';
      link.dataset.adminHqCoreCss = 'true';
      document.head.appendChild(link);
    }
    bindEvents();
    renderStatusBar();
    window.SavingioAdminHQ = Object.freeze({
      modules:() => clone(moduleStatus()),
      state:() => clone(state),
      snapshot,
      register,
      open,
      search,
      toggleFavorite,
      addNotification,
      markNotificationsRead,
      enqueue,
      trackProject,
      audit,
      render:renderStatusBar
    });
    window.dispatchEvent(new CustomEvent('savingio:admin-hq-ready', { detail:snapshot() }));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();