(() => {
  'use strict';

  const INDEX_KEY = 'savingio-admin-state-index-v1';
  const BACKUP_KEY = 'savingio-admin-state-backups-v1';
  const LOG_KEY = 'savingio-admin-state-restore-log-v1';
  const UI_KEY = 'savingio-admin-ui-state-v1';
  const VERSION = 1;
  const now = () => new Date().toISOString();
  const clone = value => JSON.parse(JSON.stringify(value));
  const read = (key, fallback) => {
    try {
      const value = JSON.parse(localStorage.getItem(key) || 'null');
      return value ?? fallback;
    } catch {
      return fallback;
    }
  };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));

  const managedKeys = [
    'savingio-admin-hq-state-v1',
    'savingio-admin-hq-role-v1',
    'savingio-admin-hq-role-audit-v1',
    'savingio-admin-router-state-v1',
    'savingio-admin-projects',
    'savingio-project-engine-v1',
    'savingio-workflow-engine-v1',
    'savingio-automation-engine-v1',
    'savingio-approval-center-v1',
    'savingio-cloudflare-deployments-v1',
    'savingio-url-health-v1',
    'savingio-retry-engine-v1',
    'savingio-next-task-v1',
    'savingio-operations-errors-v1',
    'savingio-deployment-history-v1',
    'savingio-log-viewer-state-v1',
    'savingio-plugin-manager-v1',
    'savingio-plugin-settings-v1'
  ];

  let index = read(INDEX_KEY, { version:VERSION, lastSavedAt:'', lastRestoredAt:'', activeSnapshotId:'', checksum:'', errors:[] });
  let backups = Array.isArray(read(BACKUP_KEY, [])) ? read(BACKUP_KEY, []) : [];
  let restoreLog = Array.isArray(read(LOG_KEY, [])) ? read(LOG_KEY, []) : [];
  let timer = null;

  function checksum(value) {
    const text = JSON.stringify(value);
    let hash = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
  }

  function captureUi() {
    return {
      hash:location.hash || '#/home',
      scrollX:window.scrollX,
      scrollY:window.scrollY,
      title:document.title,
      sidebar:[...document.querySelectorAll('details')].map((node, index) => ({ index, open:node.open })),
      focused:document.activeElement?.id || '',
      capturedAt:now()
    };
  }

  function capture() {
    const stores = {};
    managedKeys.forEach(key => {
      const raw = localStorage.getItem(key);
      if (raw !== null) stores[key] = raw;
    });
    const payload = { version:VERSION, createdAt:now(), stores, ui:captureUi() };
    payload.checksum = checksum({ stores:payload.stores, ui:payload.ui, version:payload.version });
    return payload;
  }

  function validate(snapshot) {
    const errors = [];
    if (!snapshot || typeof snapshot !== 'object') errors.push('스냅샷 객체가 아닙니다.');
    if (snapshot?.version !== VERSION) errors.push(`지원하지 않는 버전: ${snapshot?.version}`);
    if (!snapshot?.stores || typeof snapshot.stores !== 'object') errors.push('저장소 데이터가 없습니다.');
    Object.entries(snapshot?.stores || {}).forEach(([key, raw]) => {
      if (typeof raw !== 'string') errors.push(`${key}: 문자열 데이터가 아닙니다.`);
      else {
        try { JSON.parse(raw); } catch { errors.push(`${key}: JSON 파싱 실패`); }
      }
    });
    const expected = checksum({ stores:snapshot?.stores || {}, ui:snapshot?.ui || {}, version:snapshot?.version });
    if (snapshot?.checksum !== expected) errors.push('체크섬이 일치하지 않습니다.');
    return { valid:errors.length === 0, errors, expectedChecksum:expected };
  }

  function log(action, detail={}) {
    const row = { id:`STATE-${Date.now()}-${Math.random().toString(36).slice(2,7)}`, action, detail, createdAt:now() };
    restoreLog = [row, ...restoreLog].slice(0, 500);
    write(LOG_KEY, restoreLog);
    window.dispatchEvent(new CustomEvent('savingio:admin-state-log', { detail:clone(row) }));
    return row;
  }

  function save(options={}) {
    const snapshot = capture();
    const row = { id:options.id || `SNAP-${Date.now()}`, label:options.label || '자동 저장', reason:options.reason || 'manual', snapshot };
    backups = [row, ...backups.filter(item => item.id !== row.id)].slice(0, Number(options.limit || 20));
    index = { ...index, version:VERSION, lastSavedAt:now(), activeSnapshotId:row.id, checksum:snapshot.checksum, errors:[] };
    write(BACKUP_KEY, backups);
    write(INDEX_KEY, index);
    write(UI_KEY, snapshot.ui);
    log('saved', { id:row.id, reason:row.reason, stores:Object.keys(snapshot.stores).length });
    window.dispatchEvent(new CustomEvent('savingio:admin-state-saved', { detail:clone(row) }));
    return clone(row);
  }

  function restore(input, options={}) {
    const row = typeof input === 'string' ? backups.find(item => item.id === input) : input;
    const snapshot = row?.snapshot || row;
    const result = validate(snapshot);
    if (!result.valid) {
      index = { ...index, errors:result.errors };
      write(INDEX_KEY, index);
      log('restore-failed', { errors:result.errors });
      throw new Error(result.errors.join(' | '));
    }
    Object.entries(snapshot.stores).forEach(([key, raw]) => localStorage.setItem(key, raw));
    write(UI_KEY, snapshot.ui || {});
    index = { ...index, lastRestoredAt:now(), activeSnapshotId:row?.id || '', checksum:snapshot.checksum, errors:[] };
    write(INDEX_KEY, index);
    log('restored', { id:row?.id || '', reload:options.reload !== false });
    window.dispatchEvent(new CustomEvent('savingio:admin-state-restored', { detail:{ id:row?.id || '', snapshot:clone(snapshot) } }));
    if (options.reload !== false) location.reload();
    return clone(snapshot);
  }

  function remove(id) {
    const before = backups.length;
    backups = backups.filter(item => item.id !== id);
    write(BACKUP_KEY, backups);
    if (index.activeSnapshotId === id) {
      index.activeSnapshotId = backups[0]?.id || '';
      write(INDEX_KEY, index);
    }
    if (before !== backups.length) log('deleted', { id });
    return before !== backups.length;
  }

  function exportSnapshot(id=index.activeSnapshotId) {
    const row = backups.find(item => item.id === id) || save({ label:'내보내기 스냅샷', reason:'export' });
    const blob = new Blob([JSON.stringify(row, null, 2)], { type:'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `savingio-admin-state-${row.id}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    log('exported', { id:row.id });
    return row.id;
  }

  function importSnapshot(value, options={}) {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    const row = parsed?.snapshot ? parsed : { id:`IMPORT-${Date.now()}`, label:'가져온 스냅샷', reason:'import', snapshot:parsed };
    const result = validate(row.snapshot);
    if (!result.valid) throw new Error(result.errors.join(' | '));
    backups = [row, ...backups.filter(item => item.id !== row.id)].slice(0, 20);
    write(BACKUP_KEY, backups);
    log('imported', { id:row.id });
    if (options.restore) return restore(row, options);
    return clone(row);
  }

  function restoreUi() {
    const ui = read(UI_KEY, {});
    if (ui.hash && !location.hash) location.hash = ui.hash;
    (ui.sidebar || []).forEach(item => {
      const node = document.querySelectorAll('details')[item.index];
      if (node) node.open = Boolean(item.open);
    });
    requestAnimationFrame(() => window.scrollTo(Number(ui.scrollX || 0), Number(ui.scrollY || 0)));
    if (ui.focused) document.getElementById(ui.focused)?.focus?.();
    return ui;
  }

  function schedule(reason='event') {
    clearTimeout(timer);
    timer = setTimeout(() => save({ label:'자동 저장', reason }), 700);
  }

  function audit() {
    const current = capture();
    const validation = validate(current);
    const brokenBackups = backups.filter(item => !validate(item.snapshot).valid).map(item => item.id);
    return {
      valid:validation.valid && brokenBackups.length === 0,
      status:validation.valid && brokenBackups.length === 0 ? 'PASS' : 'WARN',
      checkedAt:now(),
      managedKeys:managedKeys.length,
      capturedKeys:Object.keys(current.stores).length,
      backups:backups.length,
      brokenBackups,
      errors:[...validation.errors, ...brokenBackups.map(id => `${id}: 손상된 백업`)]
    };
  }

  function bind() {
    const events = [
      'savingio:admin-hq-state-changed', 'savingio:admin-role-changed', 'savingio:project-created',
      'savingio:workflow-changed', 'savingio:approval-center-changed', 'savingio:cloudflare-deployments-changed',
      'savingio:url-health-changed', 'savingio:retry-changed', 'savingio:operations-errors-changed',
      'savingio:plugins-changed', 'savingio:admin-route-changed'
    ];
    events.forEach(name => window.addEventListener(name, () => schedule(name)));
    window.addEventListener('beforeunload', () => {
      try { save({ label:'종료 전 자동 저장', reason:'beforeunload', limit:20 }); } catch {}
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') schedule('visibility-hidden');
    });
  }

  function boot() {
    restoreUi();
    bind();
    window.SavingioAdminState = Object.freeze({
      capture, validate, save, restore, remove,
      list:() => clone(backups),
      index:() => clone(index),
      logs:() => clone(restoreLog),
      exportSnapshot, importSnapshot, restoreUi, audit,
      managedKeys:() => [...managedKeys]
    });
    window.dispatchEvent(new CustomEvent('savingio:admin-state-ready', { detail:{ index:clone(index), backups:backups.length } }));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
