(() => {
  const STORAGE_KEY = 'savingio-os-module-state-v1';
  const registry = window.SAVINGIO_MODULE_REGISTRY;
  if (!registry) throw new Error('Savingio module registry is missing.');

  const clone = value => JSON.parse(JSON.stringify(value));
  const readState = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
    catch { return {}; }
  };
  const writeState = state => localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

  let state = readState();
  const customModules = Array.isArray(state.customModules) ? state.customModules : [];

  function normalize(module) {
    return {
      id:String(module.id || '').trim(),
      name:String(module.name || '').trim(),
      icon:String(module.icon || '◇'),
      order:Number(module.order || 999),
      enabled:module.enabled !== false,
      removable:module.removable !== false,
      children:Array.isArray(module.children) ? module.children.map(String) : [],
      capabilities:Array.isArray(module.capabilities) ? module.capabilities.map(String) : []
    };
  }

  function mergedModules() {
    const disabled = new Set(Array.isArray(state.disabled) ? state.disabled : []);
    const overrides = state.overrides || {};
    return [...registry.modules, ...customModules]
      .map(item => ({ ...normalize(item), ...(overrides[item.id] || {}) }))
      .map(item => ({ ...item, enabled: !disabled.has(item.id) && item.enabled !== false }))
      .sort((a,b) => a.order - b.order || a.name.localeCompare(b.name, 'ko'));
  }

  function persist() {
    state.customModules = customModules;
    writeState(state);
    window.dispatchEvent(new CustomEvent('savingio:modules-changed', { detail:{ modules:api.list() } }));
  }

  const api = {
    version:registry.version,
    schema:clone(registry.assetSchema),
    list(options={}) {
      const modules = mergedModules();
      return clone(options.includeDisabled ? modules : modules.filter(item => item.enabled));
    },
    get(id) { return clone(mergedModules().find(item => item.id === id) || null); },
    enable(id) {
      state.disabled = (state.disabled || []).filter(item => item !== id);
      persist();
      return api.get(id);
    },
    disable(id) {
      const module = mergedModules().find(item => item.id === id);
      if (!module || module.removable === false) return false;
      state.disabled = Array.from(new Set([...(state.disabled || []), id]));
      persist();
      return true;
    },
    register(input) {
      const module = normalize(input);
      if (!/^[a-z0-9-]{2,40}$/.test(module.id)) throw new Error('모듈 ID는 영문 소문자, 숫자, 하이픈만 사용할 수 있습니다.');
      if (!module.name) throw new Error('모듈 이름이 필요합니다.');
      if (mergedModules().some(item => item.id === module.id)) throw new Error('이미 존재하는 모듈 ID입니다.');
      customModules.push(module);
      persist();
      return clone(module);
    },
    unregister(id) {
      const index = customModules.findIndex(item => item.id === id);
      if (index < 0) return false;
      customModules.splice(index, 1);
      state.disabled = (state.disabled || []).filter(item => item !== id);
      persist();
      return true;
    },
    update(id, patch={}) {
      state.overrides = state.overrides || {};
      state.overrides[id] = { ...(state.overrides[id] || {}), ...patch, id };
      persist();
      return api.get(id);
    },
    reset() {
      state = {};
      customModules.splice(0, customModules.length);
      localStorage.removeItem(STORAGE_KEY);
      window.dispatchEvent(new CustomEvent('savingio:modules-changed', { detail:{ modules:api.list() } }));
    },
    createAsset(moduleId, input={}) {
      const module = api.get(moduleId);
      if (!module || !module.enabled) throw new Error('사용할 수 없는 모듈입니다.');
      const now = new Date().toISOString();
      return {
        id:input.id || `${moduleId}-${Date.now()}`,
        moduleId,
        title:String(input.title || '새 항목'),
        type:String(input.type || moduleId),
        status:String(input.status || 'draft'),
        category:String(input.category || '미분류'),
        createdAt:input.createdAt || now,
        updatedAt:now,
        ...input
      };
    },
    departments() {
      return api.list().map(item => ({ id:item.id, name:item.name, icon:item.icon, children:item.children }));
    }
  };

  window.SavingioOS = Object.freeze({ modules:api });

  if (window.SAVINGIO_ADMIN_DATA) {
    window.SAVINGIO_ADMIN_DATA.departments = api.departments();
  }

  const workspace = document.createElement('script');
  workspace.src = '/admin/os/module-workspace.js';
  workspace.defer = true;
  document.head.appendChild(workspace);
})();