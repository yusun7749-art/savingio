(() => {
  'use strict';

  const adapter = window.SavingioV2ExternalApiAdapter;
  if (!adapter) throw new Error('External Retry Engine dependency is not loaded');
  if (window.SavingioV2ExternalRetryEngine) throw new Error('External Retry Engine already exists');

  const STORAGE_KEY = 'savingio-admin-v2-external-retry-engine';
  const AUDIT_KEY = 'savingio-admin-v2-external-retry-audit';
  const MAX_ATTEMPTS = 3;
  const DELAYS_MS = Object.freeze([60_000, 300_000, 900_000]);
  const timers = new Map();
  const now = () => new Date().toISOString();
  const clean = value => String(value ?? '').trim();
  const clone = value => JSON.parse(JSON.stringify(value));

  function readState() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return value && typeof value === 'object' ? value : {};
    } catch {
      return {};
    }
  }

  function persistState(value) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent('savingio:v2-external-retry-changed', { detail: clone(value) }));
    return value;
  }

  function readAudit() {
    try {
      const rows = JSON.parse(localStorage.getItem(AUDIT_KEY) || '[]');
      return Array.isArray(rows) ? rows : [];
    } catch {
      return [];
    }
  }

  function audit(record) {
    const row = Object.freeze({ at: now(), ...record });
    localStorage.setItem(AUDIT_KEY, JSON.stringify([row, ...readAudit()].slice(0, 100)));
    window.dispatchEvent(new CustomEvent('savingio:v2-external-retry-audited', { detail: row }));
    return row;
  }

  function read(providerId) {
    const state = readState()[providerId] || {};
    return Object.freeze({
      providerId,
      attempts: Math.max(0, Number(state.attempts) || 0),
      scheduledAt: clean(state.scheduledAt),
      nextRetryAt: clean(state.nextRetryAt),
      lastRetryAt: clean(state.lastRetryAt),
      exhausted: Boolean(state.exhausted),
      active: timers.has(providerId)
    });
  }

  function reset(providerId, reason = '재시도 상태 초기화') {
    const state = readState();
    delete state[providerId];
    const timer = timers.get(providerId);
    if (timer) clearTimeout(timer);
    timers.delete(providerId);
    persistState(state);
    audit({ providerId, event: 'reset', ok: true, message: reason });
    return read(providerId);
  }

  function eligible(providerId) {
    const provider = adapter.read(providerId);
    const retry = read(providerId);
    return Object.freeze({
      eligible: provider.state === 'error' && provider.configured && !retry.active && !retry.exhausted && retry.attempts < MAX_ATTEMPTS,
      provider,
      retry
    });
  }

  async function execute(providerId, context = {}) {
    const before = eligible(providerId);
    if (before.provider.state !== 'error') {
      reset(providerId, 'Provider 오류 해소');
      return Object.freeze({ ok: false, skipped: true, reason: 'Provider is not in error state' });
    }

    const state = readState();
    const current = state[providerId] || {};
    const attempt = Math.max(0, Number(current.attempts) || 0) + 1;
    state[providerId] = { ...current, attempts: attempt, lastRetryAt: now(), scheduledAt: '', nextRetryAt: '', exhausted: false };
    persistState(state);
    audit({ providerId, event: 'retry-start', attempt, ok: true, message: `자동 재시도 ${attempt}/${MAX_ATTEMPTS}` });

    const result = await adapter.sync(providerId, Object.freeze({ ...context, retry: true, attempt }));
    const success = result.state === 'connected' && result.authenticated === true;
    if (success) {
      reset(providerId, `자동 재시도 ${attempt}회 성공`);
      audit({ providerId, event: 'retry-success', attempt, ok: true, message: result.note || '동기화 성공' });
      return Object.freeze({ ok: true, attempt, result });
    }

    const latest = readState();
    const exhausted = attempt >= MAX_ATTEMPTS;
    latest[providerId] = { ...(latest[providerId] || {}), attempts: attempt, exhausted };
    persistState(latest);
    audit({ providerId, event: exhausted ? 'retry-exhausted' : 'retry-failed', attempt, ok: false, message: result.error || result.note || '동기화 실패' });
    if (!exhausted) schedule(providerId, context);
    return Object.freeze({ ok: false, attempt, exhausted, result });
  }

  function schedule(providerId, context = {}) {
    const check = eligible(providerId);
    if (!check.eligible) return Object.freeze({ scheduled: false, ...check.retry });
    const delay = DELAYS_MS[Math.min(check.retry.attempts, DELAYS_MS.length - 1)];
    const scheduledAt = now();
    const nextRetryAt = new Date(Date.now() + delay).toISOString();
    const state = readState();
    state[providerId] = { ...(state[providerId] || {}), attempts: check.retry.attempts, scheduledAt, nextRetryAt, exhausted: false };
    persistState(state);
    const timer = setTimeout(() => {
      timers.delete(providerId);
      execute(providerId, context).catch(error => audit({ providerId, event: 'retry-engine-error', ok: false, message: error?.message || String(error) }));
    }, delay);
    timers.set(providerId, timer);
    audit({ providerId, event: 'retry-scheduled', attempt: check.retry.attempts + 1, ok: true, message: `${Math.round(delay / 60000)}분 후 재시도`, nextRetryAt });
    return Object.freeze({ scheduled: true, providerId, delay, scheduledAt, nextRetryAt, attempts: check.retry.attempts });
  }

  function scheduleErrors(context = {}) {
    return Object.freeze(adapter.readAll().filter(row => row.state === 'error').map(row => schedule(row.id, context)));
  }

  function cancel(providerId, reason = '운영자 취소') {
    const timer = timers.get(providerId);
    if (timer) clearTimeout(timer);
    timers.delete(providerId);
    const state = readState();
    const current = state[providerId] || {};
    state[providerId] = { ...current, scheduledAt: '', nextRetryAt: '' };
    persistState(state);
    audit({ providerId, event: 'retry-cancelled', ok: true, message: reason });
    return read(providerId);
  }

  function summary() {
    const rows = adapter.providers.map(read);
    return Object.freeze({
      total: rows.length,
      active: rows.filter(row => row.active).length,
      exhausted: rows.filter(row => row.exhausted).length,
      attempted: rows.filter(row => row.attempts > 0).length,
      rows: Object.freeze(rows)
    });
  }

  function verify() {
    const rows = adapter.providers.map(read);
    const valid = rows.every(row => row.attempts >= 0 && row.attempts <= MAX_ATTEMPTS && (!row.exhausted || row.attempts >= MAX_ATTEMPTS));
    return Object.freeze({ pass: valid, maxAttempts: MAX_ATTEMPTS, delays: DELAYS_MS.slice(), auditCount: readAudit().length, ...summary() });
  }

  window.addEventListener('savingio:v2-external-api-changed', event => {
    const providerId = event.detail?.provider;
    if (!providerId) return;
    const provider = adapter.read(providerId);
    if (provider.state === 'connected') reset(providerId, 'Provider 연결 복구');
    if (provider.state === 'error') schedule(providerId);
  });

  Object.defineProperty(window, 'SavingioV2ExternalRetryEngine', {
    value: Object.freeze({ read, readAudit, schedule, scheduleErrors, execute, cancel, reset, eligible, summary, verify, maxAttempts: MAX_ATTEMPTS, delays: DELAYS_MS, storageKey: STORAGE_KEY, auditKey: AUDIT_KEY }),
    writable: false,
    configurable: false,
    enumerable: true
  });

  scheduleErrors();
})();