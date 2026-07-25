(() => {
  'use strict';

  const SPEC_VERSION = '1.0.0';
  const ID_PATTERN = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;
  const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
  const ENTRY_PATTERN = /^(?:\/|\.\/)[^\s]+\.js$/;
  const ALLOWED_PERMISSIONS = Object.freeze([
    'project:read', 'project:write',
    'workflow:read', 'workflow:write',
    'automation:read', 'automation:write',
    'asset:read', 'asset:write',
    'menu:register', 'workboard:register',
    'storage:read', 'storage:write',
    'network:fetch', 'analytics:write'
  ]);
  const ALLOWED_TARGETS = Object.freeze(['admin', 'site', 'worker']);

  const clone = value => JSON.parse(JSON.stringify(value));
  const unique = values => [...new Set((Array.isArray(values) ? values : []).map(value => String(value || '').trim()).filter(Boolean))];
  const text = (value, fallback='') => String(value ?? fallback).trim();

  function normalizeMenu(menu) {
    if (!menu || typeof menu !== 'object') return null;
    return {
      id:text(menu.id),
      label:text(menu.label),
      icon:text(menu.icon),
      order:Number.isFinite(Number(menu.order)) ? Number(menu.order) : 100,
      parent:text(menu.parent),
      route:text(menu.route)
    };
  }

  function normalizeWorkboard(workboard) {
    if (!workboard || typeof workboard !== 'object') return null;
    return {
      id:text(workboard.id),
      title:text(workboard.title),
      department:text(workboard.department),
      order:Number.isFinite(Number(workboard.order)) ? Number(workboard.order) : 100,
      renderer:text(workboard.renderer)
    };
  }

  function normalizeDependency(value) {
    if (typeof value === 'string') return { id:text(value), version:'*', optional:false };
    if (!value || typeof value !== 'object') return null;
    return {
      id:text(value.id),
      version:text(value.version, '*') || '*',
      optional:Boolean(value.optional)
    };
  }

  function normalize(input={}) {
    const manifest = {
      specVersion:text(input.specVersion, SPEC_VERSION) || SPEC_VERSION,
      id:text(input.id).toLowerCase(),
      name:text(input.name),
      version:text(input.version, '0.1.0') || '0.1.0',
      description:text(input.description),
      author:text(input.author, 'Savingio'),
      license:text(input.license, 'proprietary'),
      target:unique(input.target?.length ? input.target : ['admin']),
      entry:text(input.entry),
      styles:unique(input.styles),
      permissions:unique(input.permissions),
      dependencies:(Array.isArray(input.dependencies) ? input.dependencies : []).map(normalizeDependency).filter(Boolean),
      menu:normalizeMenu(input.menu),
      workboard:normalizeWorkboard(input.workboard),
      settingsSchema:input.settingsSchema && typeof input.settingsSchema === 'object' ? clone(input.settingsSchema) : {},
      dataNamespace:text(input.dataNamespace, input.id).toLowerCase(),
      homepage:text(input.homepage),
      repository:text(input.repository),
      integrity:text(input.integrity),
      enabledByDefault:input.enabledByDefault !== false,
      createdAt:text(input.createdAt),
      updatedAt:text(input.updatedAt)
    };
    return manifest;
  }

  function validate(input, options={}) {
    const manifest = normalize(input);
    const errors = [];
    const warnings = [];

    if (manifest.specVersion !== SPEC_VERSION) errors.push(`SPEC_VERSION_UNSUPPORTED:${manifest.specVersion}`);
    if (!manifest.id) errors.push('PLUGIN_ID_REQUIRED');
    else if (!ID_PATTERN.test(manifest.id)) errors.push(`PLUGIN_ID_INVALID:${manifest.id}`);
    if (!manifest.name) errors.push('PLUGIN_NAME_REQUIRED');
    if (!VERSION_PATTERN.test(manifest.version)) errors.push(`PLUGIN_VERSION_INVALID:${manifest.version}`);
    if (!manifest.entry) errors.push('PLUGIN_ENTRY_REQUIRED');
    else if (!ENTRY_PATTERN.test(manifest.entry)) errors.push(`PLUGIN_ENTRY_INVALID:${manifest.entry}`);
    if (!manifest.target.length) errors.push('PLUGIN_TARGET_REQUIRED');
    manifest.target.filter(target => !ALLOWED_TARGETS.includes(target)).forEach(target => errors.push(`PLUGIN_TARGET_INVALID:${target}`));
    manifest.permissions.filter(permission => !ALLOWED_PERMISSIONS.includes(permission)).forEach(permission => errors.push(`PLUGIN_PERMISSION_INVALID:${permission}`));
    if (!manifest.dataNamespace) errors.push('PLUGIN_DATA_NAMESPACE_REQUIRED');
    else if (!ID_PATTERN.test(manifest.dataNamespace)) errors.push(`PLUGIN_DATA_NAMESPACE_INVALID:${manifest.dataNamespace}`);

    const dependencyIds = manifest.dependencies.map(item => item.id);
    dependencyIds.filter((id, index, all) => all.indexOf(id) !== index).forEach(id => errors.push(`PLUGIN_DEPENDENCY_DUPLICATE:${id}`));
    manifest.dependencies.forEach(dependency => {
      if (!dependency.id || !ID_PATTERN.test(dependency.id)) errors.push(`PLUGIN_DEPENDENCY_ID_INVALID:${dependency.id || 'empty'}`);
      if (dependency.id === manifest.id) errors.push(`PLUGIN_DEPENDENCY_SELF:${manifest.id}`);
    });

    if (manifest.menu) {
      if (!manifest.menu.id) errors.push('PLUGIN_MENU_ID_REQUIRED');
      if (!manifest.menu.label) errors.push('PLUGIN_MENU_LABEL_REQUIRED');
      if (!manifest.menu.route) errors.push('PLUGIN_MENU_ROUTE_REQUIRED');
      if (!manifest.permissions.includes('menu:register')) warnings.push('PLUGIN_MENU_PERMISSION_MISSING');
    }
    if (manifest.workboard) {
      if (!manifest.workboard.id) errors.push('PLUGIN_WORKBOARD_ID_REQUIRED');
      if (!manifest.workboard.title) errors.push('PLUGIN_WORKBOARD_TITLE_REQUIRED');
      if (!manifest.workboard.renderer) errors.push('PLUGIN_WORKBOARD_RENDERER_REQUIRED');
      if (!manifest.permissions.includes('workboard:register')) warnings.push('PLUGIN_WORKBOARD_PERMISSION_MISSING');
    }
    if (!manifest.description) warnings.push('PLUGIN_DESCRIPTION_EMPTY');
    if (!manifest.integrity && options.requireIntegrity) errors.push('PLUGIN_INTEGRITY_REQUIRED');
    else if (!manifest.integrity) warnings.push('PLUGIN_INTEGRITY_EMPTY');

    return { valid:errors.length === 0, errors, warnings, manifest:clone(manifest) };
  }

  function create(input={}) {
    const timestamp = new Date().toISOString();
    const manifest = normalize({ ...input, specVersion:SPEC_VERSION, createdAt:input.createdAt || timestamp, updatedAt:timestamp });
    const result = validate(manifest);
    if (!result.valid) {
      const error = new Error(`Invalid plugin manifest: ${result.errors.join(', ')}`);
      error.code = 'PLUGIN_MANIFEST_INVALID';
      error.details = result;
      throw error;
    }
    return clone(result.manifest);
  }

  function compareVersions(left, right) {
    const parse = value => String(value || '0.0.0').split('-')[0].split('.').map(part => Number(part) || 0);
    const a = parse(left);
    const b = parse(right);
    for (let index = 0; index < 3; index += 1) {
      if (a[index] > b[index]) return 1;
      if (a[index] < b[index]) return -1;
    }
    return 0;
  }

  function satisfies(version, range='*') {
    const value = text(range, '*');
    if (!value || value === '*') return true;
    if (value.startsWith('>=')) return compareVersions(version, value.slice(2)) >= 0;
    if (value.startsWith('>')) return compareVersions(version, value.slice(1)) > 0;
    if (value.startsWith('<=')) return compareVersions(version, value.slice(2)) <= 0;
    if (value.startsWith('<')) return compareVersions(version, value.slice(1)) < 0;
    if (value.startsWith('^')) {
      const base = value.slice(1);
      return compareVersions(version, base) >= 0 && String(version).split('.')[0] === String(base).split('.')[0];
    }
    if (value.startsWith('~')) {
      const base = value.slice(1);
      const [major, minor] = String(base).split('.');
      const [vMajor, vMinor] = String(version).split('.');
      return compareVersions(version, base) >= 0 && major === vMajor && minor === vMinor;
    }
    return compareVersions(version, value) === 0;
  }

  function audit(manifests=[]) {
    const list = Array.isArray(manifests) ? manifests : [];
    const reports = list.map(item => validate(item));
    const ids = reports.map(report => report.manifest.id).filter(Boolean);
    const duplicateIds = ids.filter((id, index, all) => all.indexOf(id) !== index);
    const errors = reports.flatMap(report => report.errors);
    const warnings = reports.flatMap(report => report.warnings);
    duplicateIds.forEach(id => errors.push(`PLUGIN_ID_DUPLICATE:${id}`));
    return { valid:errors.length === 0, errors:[...new Set(errors)], warnings:[...new Set(warnings)], reports:clone(reports) };
  }

  window.SavingioPluginManifest = Object.freeze({
    SPEC_VERSION,
    permissions:clone(ALLOWED_PERMISSIONS),
    targets:clone(ALLOWED_TARGETS),
    normalize,
    validate,
    create,
    compareVersions,
    satisfies,
    audit
  });
  window.dispatchEvent(new CustomEvent('savingio:plugin-manifest-ready', { detail:{ specVersion:SPEC_VERSION } }));
})();