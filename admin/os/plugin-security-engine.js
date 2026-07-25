(() => {
  'use strict';

  const DATA_PREFIX = 'savingio-plugin-data:';
  const AUDIT_KEY = 'savingio-plugin-security-audit-v1';
  const clone = value => JSON.parse(JSON.stringify(value));
  const now = () => new Date().toISOString();
  const safeKey = value => String(value || '').trim().replace(/[^a-zA-Z0-9._-]/g, '_');

  function manager() {
    if (!window.SavingioPluginManager) throw Object.assign(new Error('Plugin Manager가 로드되지 않았습니다.'), { code:'PLUGIN_MANAGER_MISSING' });
    return window.SavingioPluginManager;
  }

  function plugin(id) {
    const item = manager().get(id);
    if (!item) throw Object.assign(new Error(`설치되지 않은 Plugin입니다: ${id}`), { code:'PLUGIN_NOT_INSTALLED' });
    if (!item.enabled) throw Object.assign(new Error(`비활성 Plugin입니다: ${id}`), { code:'PLUGIN_DISABLED' });
    return item;
  }

  function hasPermission(id, permission) {
    const item = manager().get(id);
    return Boolean(item?.enabled && (item.manifest?.permissions || []).includes(String(permission || '')));
  }

  function requirePermission(id, permission) {
    if (!hasPermission(id, permission)) {
      audit('permission-denied', id, { permission });
      throw Object.assign(new Error(`Plugin 권한이 없습니다: ${id} → ${permission}`), {
        code:'PLUGIN_PERMISSION_DENIED', details:{ pluginId:id, permission }
      });
    }
    return true;
  }

  function namespaceFor(id) {
    const item = plugin(id);
    const namespace = safeKey(item.manifest?.dataNamespace || item.id);
    if (!namespace) throw Object.assign(new Error(`Plugin dataNamespace가 없습니다: ${id}`), { code:'PLUGIN_NAMESPACE_MISSING' });
    return namespace;
  }

  function storageKey(id) {
    return `${DATA_PREFIX}${namespaceFor(id)}`;
  }

  function readAll(id) {
    requirePermission(id, 'storage:read');
    try {
      const value = JSON.parse(localStorage.getItem(storageKey(id)) || '{}');
      return value && typeof value === 'object' && !Array.isArray(value) ? clone(value) : {};
    } catch {
      return {};
    }
  }

  function get(id, key, fallback=null) {
    const data = readAll(id);
    return Object.prototype.hasOwnProperty.call(data, key) ? clone(data[key]) : fallback;
  }

  function writeAll(id, data) {
    requirePermission(id, 'storage:write');
    const payload = data && typeof data === 'object' && !Array.isArray(data) ? clone(data) : {};
    localStorage.setItem(storageKey(id), JSON.stringify(payload));
    audit('storage-write', id, { keys:Object.keys(payload) });
    window.dispatchEvent(new CustomEvent('savingio:plugin-data-changed', { detail:{ pluginId:id, namespace:namespaceFor(id), keys:Object.keys(payload) } }));
    return clone(payload);
  }

  function set(id, key, value) {
    requirePermission(id, 'storage:read');
    requirePermission(id, 'storage:write');
    const data = readAll(id);
    data[safeKey(key)] = clone(value);
    return writeAll(id, data);
  }

  function remove(id, key) {
    requirePermission(id, 'storage:read');
    requirePermission(id, 'storage:write');
    const data = readAll(id);
    delete data[safeKey(key)];
    return writeAll(id, data);
  }

  function clear(id) {
    requirePermission(id, 'storage:write');
    localStorage.removeItem(storageKey(id));
    audit('storage-clear', id, {});
    window.dispatchEvent(new CustomEvent('savingio:plugin-data-cleared', { detail:{ pluginId:id, namespace:namespaceFor(id) } }));
    return true;
  }

  function createContext(id) {
    const item = plugin(id);
    const permissions = new Set(item.manifest?.permissions || []);
    return Object.freeze({
      pluginId:item.id,
      version:item.version,
      namespace:namespaceFor(id),
      permissions:[...permissions],
      can:permission => permissions.has(permission),
      require:permission => requirePermission(id, permission),
      storage:Object.freeze({
        get:(key, fallback=null) => get(id, key, fallback),
        all:() => readAll(id),
        set:(key, value) => set(id, key, value),
        remove:key => remove(id, key),
        clear:() => clear(id)
      }),
      fetch:async (input, init={}) => {
        requirePermission(id, 'network:fetch');
        audit('network-fetch', id, { url:String(input || '') });
        return window.fetch(input, init);
      }
    });
  }

  function audit(action, id, details={}) {
    let entries = [];
    try { entries = JSON.parse(localStorage.getItem(AUDIT_KEY) || '[]'); } catch { entries = []; }
    if (!Array.isArray(entries)) entries = [];
    entries.unshift({ timestamp:now(), action, pluginId:String(id || ''), details:clone(details) });
    localStorage.setItem(AUDIT_KEY, JSON.stringify(entries.slice(0, 500)));
  }

  function auditReport() {
    const plugins = manager().list();
    const errors = [];
    const namespaces = new Map();
    plugins.forEach(item => {
      const namespace = safeKey(item.manifest?.dataNamespace || item.id);
      if (!namespace) errors.push(`PLUGIN_NAMESPACE_MISSING:${item.id}`);
      if (namespaces.has(namespace)) errors.push(`PLUGIN_NAMESPACE_DUPLICATE:${namespace}`);
      else namespaces.set(namespace, item.id);
      const permissions = item.manifest?.permissions || [];
      if (permissions.includes('storage:write') && !permissions.includes('storage:read')) errors.push(`PLUGIN_STORAGE_WRITE_WITHOUT_READ:${item.id}`);
    });
    return { valid:errors.length === 0, errors:[...new Set(errors)], plugins:plugins.length, namespaces:namespaces.size };
  }

  window.SavingioPluginSecurity = Object.freeze({
    hasPermission,
    requirePermission,
    namespaceFor,
    createContext,
    storage:Object.freeze({ get, all:readAll, set, remove, clear }),
    audit: auditReport,
    auditLog:() => {
      try { const value=JSON.parse(localStorage.getItem(AUDIT_KEY) || '[]'); return Array.isArray(value) ? clone(value) : []; } catch { return []; }
    }
  });

  window.dispatchEvent(new CustomEvent('savingio:plugin-security-ready', { detail:auditReport() }));
})();