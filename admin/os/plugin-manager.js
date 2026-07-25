(() => {
  'use strict';

  const STORAGE_KEY = 'savingio-os-plugin-registry-v1';
  const EVENT_PREFIX = 'savingio:plugin-';
  const clone = value => JSON.parse(JSON.stringify(value));
  const now = () => new Date().toISOString();

  function readRegistry() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function writeRegistry(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent(`${EVENT_PREFIX}registry-changed`, { detail:{ plugins:clone(items) } }));
    return clone(items);
  }

  function findIndex(items, id) {
    return items.findIndex(item => item.id === String(id || '').trim().toLowerCase());
  }

  function ensureManifestEngine() {
    if (!window.SavingioPluginManifest) {
      const error = new Error('Plugin Manifest Engine이 로드되지 않았습니다.');
      error.code = 'PLUGIN_MANIFEST_ENGINE_MISSING';
      throw error;
    }
    return window.SavingioPluginManifest;
  }

  function ensureDependencies(manifest, items) {
    const manifestEngine = ensureManifestEngine();
    const byId = new Map(items.map(item => [item.id, item]));
    const missing = [];
    const incompatible = [];
    (manifest.dependencies || []).forEach(dependency => {
      const installed = byId.get(dependency.id);
      if (!installed) {
        if (!dependency.optional) missing.push(dependency.id);
        return;
      }
      if (!manifestEngine.satisfies(installed.version, dependency.version)) {
        incompatible.push(`${dependency.id}@${dependency.version}`);
      }
    });
    if (missing.length || incompatible.length) {
      const error = new Error('Plugin 의존성을 충족하지 못했습니다.');
      error.code = 'PLUGIN_DEPENDENCY_UNSATISFIED';
      error.details = { missing, incompatible };
      throw error;
    }
  }

  function dependantsOf(id, items) {
    return items.filter(item => (item.manifest?.dependencies || []).some(dependency => dependency.id === id && !dependency.optional));
  }

  function recordFromManifest(manifest, options={}) {
    const timestamp = now();
    return {
      id:manifest.id,
      name:manifest.name,
      version:manifest.version,
      enabled:options.enabled ?? manifest.enabledByDefault,
      status:'installed',
      manifest:clone(manifest),
      installedAt:options.installedAt || timestamp,
      updatedAt:timestamp,
      enabledAt:options.enabled ?? manifest.enabledByDefault ? timestamp : null,
      disabledAt:options.enabled ?? manifest.enabledByDefault ? null : timestamp,
      source:String(options.source || 'manual'),
      settings:options.settings && typeof options.settings === 'object' ? clone(options.settings) : {}
    };
  }

  function install(input, options={}) {
    const manifestEngine = ensureManifestEngine();
    const validation = manifestEngine.validate(input, { requireIntegrity:Boolean(options.requireIntegrity) });
    if (!validation.valid) {
      const error = new Error(`Plugin 설치 실패: ${validation.errors.join(', ')}`);
      error.code = 'PLUGIN_INSTALL_INVALID_MANIFEST';
      error.details = validation;
      throw error;
    }

    const items = readRegistry();
    const index = findIndex(items, validation.manifest.id);
    if (index >= 0 && !options.replace) {
      const error = new Error(`이미 설치된 Plugin입니다: ${validation.manifest.id}`);
      error.code = 'PLUGIN_ALREADY_INSTALLED';
      throw error;
    }
    ensureDependencies(validation.manifest, items.filter(item => item.id !== validation.manifest.id));

    const existing = index >= 0 ? items[index] : null;
    const record = recordFromManifest(validation.manifest, {
      enabled:options.enabled ?? existing?.enabled,
      installedAt:existing?.installedAt,
      source:options.source,
      settings:existing?.settings
    });
    if (index >= 0) items.splice(index, 1, record); else items.unshift(record);
    writeRegistry(items);
    window.dispatchEvent(new CustomEvent(`${EVENT_PREFIX}installed`, { detail:{ plugin:clone(record), replaced:Boolean(existing) } }));
    return clone(record);
  }

  function uninstall(id, options={}) {
    const pluginId = String(id || '').trim().toLowerCase();
    const items = readRegistry();
    const index = findIndex(items, pluginId);
    if (index < 0) {
      const error = new Error(`설치되지 않은 Plugin입니다: ${pluginId}`);
      error.code = 'PLUGIN_NOT_INSTALLED';
      throw error;
    }
    const dependants = dependantsOf(pluginId, items);
    if (dependants.length && !options.force) {
      const error = new Error(`다른 Plugin이 의존하고 있어 제거할 수 없습니다: ${pluginId}`);
      error.code = 'PLUGIN_HAS_DEPENDANTS';
      error.details = { dependants:dependants.map(item => item.id) };
      throw error;
    }
    const [removed] = items.splice(index, 1);
    writeRegistry(items);
    window.dispatchEvent(new CustomEvent(`${EVENT_PREFIX}uninstalled`, { detail:{ plugin:clone(removed), forced:Boolean(options.force) } }));
    return clone(removed);
  }

  function setEnabled(id, enabled) {
    const pluginId = String(id || '').trim().toLowerCase();
    const items = readRegistry();
    const index = findIndex(items, pluginId);
    if (index < 0) {
      const error = new Error(`설치되지 않은 Plugin입니다: ${pluginId}`);
      error.code = 'PLUGIN_NOT_INSTALLED';
      throw error;
    }
    if (enabled) ensureDependencies(items[index].manifest, items);
    const timestamp = now();
    items[index] = {
      ...items[index],
      enabled:Boolean(enabled),
      enabledAt:enabled ? timestamp : items[index].enabledAt,
      disabledAt:enabled ? null : timestamp,
      updatedAt:timestamp
    };
    writeRegistry(items);
    window.dispatchEvent(new CustomEvent(`${EVENT_PREFIX}${enabled ? 'enabled' : 'disabled'}`, { detail:{ plugin:clone(items[index]) } }));
    return clone(items[index]);
  }

  function update(input, options={}) {
    const manifestEngine = ensureManifestEngine();
    const validation = manifestEngine.validate(input, { requireIntegrity:Boolean(options.requireIntegrity) });
    if (!validation.valid) {
      const error = new Error(`Plugin 업데이트 실패: ${validation.errors.join(', ')}`);
      error.code = 'PLUGIN_UPDATE_INVALID_MANIFEST';
      error.details = validation;
      throw error;
    }
    const installed = get(validation.manifest.id);
    if (!installed) {
      const error = new Error(`업데이트할 Plugin이 설치되어 있지 않습니다: ${validation.manifest.id}`);
      error.code = 'PLUGIN_NOT_INSTALLED';
      throw error;
    }
    if (!options.allowDowngrade && manifestEngine.compareVersions(validation.manifest.version, installed.version) < 0) {
      const error = new Error(`Plugin 버전을 낮출 수 없습니다: ${installed.version} → ${validation.manifest.version}`);
      error.code = 'PLUGIN_DOWNGRADE_BLOCKED';
      throw error;
    }
    return install(validation.manifest, { ...options, replace:true, enabled:installed.enabled, source:options.source || 'update' });
  }

  function get(id) {
    const pluginId = String(id || '').trim().toLowerCase();
    return clone(readRegistry().find(item => item.id === pluginId) || null);
  }

  function list(filter={}) {
    return clone(readRegistry().filter(item => {
      if (filter.enabled !== undefined && item.enabled !== Boolean(filter.enabled)) return false;
      if (filter.status && item.status !== filter.status) return false;
      if (filter.target && !(item.manifest?.target || []).includes(filter.target)) return false;
      return true;
    }));
  }

  function audit() {
    const items = readRegistry();
    const manifestEngine = ensureManifestEngine();
    const manifestAudit = manifestEngine.audit(items.map(item => item.manifest));
    const errors = [...manifestAudit.errors];
    const warnings = [...manifestAudit.warnings];
    const ids = new Set(items.map(item => item.id));

    items.forEach(item => {
      if (item.id !== item.manifest?.id) errors.push(`PLUGIN_RECORD_ID_MISMATCH:${item.id}`);
      if (item.version !== item.manifest?.version) errors.push(`PLUGIN_RECORD_VERSION_MISMATCH:${item.id}`);
      (item.manifest?.dependencies || []).forEach(dependency => {
        if (!dependency.optional && !ids.has(dependency.id)) errors.push(`PLUGIN_DEPENDENCY_MISSING:${item.id}:${dependency.id}`);
        const installed = items.find(candidate => candidate.id === dependency.id);
        if (installed && !manifestEngine.satisfies(installed.version, dependency.version)) {
          errors.push(`PLUGIN_DEPENDENCY_VERSION_MISMATCH:${item.id}:${dependency.id}`);
        }
      });
    });

    return {
      valid:errors.length === 0,
      errors:[...new Set(errors)],
      warnings:[...new Set(warnings)],
      installed:items.length,
      enabled:items.filter(item => item.enabled).length
    };
  }

  function boot() {
    window.SavingioPluginManager = Object.freeze({
      install,
      uninstall,
      update,
      enable:id => setEnabled(id, true),
      disable:id => setEnabled(id, false),
      get,
      list,
      audit,
      reset:() => writeRegistry([])
    });
    window.dispatchEvent(new CustomEvent(`${EVENT_PREFIX}manager-ready`, { detail:{ installed:readRegistry().length } }));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();