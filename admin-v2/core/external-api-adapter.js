(() => {
  'use strict';

  if (window.SavingioV2ExternalApiAdapter) throw new Error('External API Adapter already exists');

  const STORAGE_KEY = 'savingio-admin-v2-external-api-adapter';
  const SCHEMA_VERSION = 1;
  const PROVIDERS = Object.freeze(['search-console', 'analytics', 'adsense']);
  const STATES = Object.freeze(['disconnected', 'configured', 'syncing', 'connected', 'error']);
  const registry = new Map();
  const clone = value => JSON.parse(JSON.stringify(value));
  const now = () => new Date().toISOString();
  const clean = value => String(value ?? '').trim();

  const seed = Object.freeze(Object.fromEntries(PROVIDERS.map(id => [id, {
    id,
    state: 'disconnected',
    configured: false,
    authenticated: false,
    lastAttemptAt: '',
    lastSuccessAt: '',
    lastErrorAt: '',
    error: '',
    note: '외부 API 미연결',
    metadata: {},
    history: []
  }])));

  function normalizeProvider(id, value = {}) {
    return {
      id,
      state: STATES.includes(value.state) ? value.state : 'disconnected',
      configured: Boolean(value.configured),
      authenticated: Boolean(value.authenticated),
      lastAttemptAt: clean(value.lastAttemptAt),
      lastSuccessAt: clean(value.lastSuccessAt),
      lastErrorAt: clean(value.lastErrorAt),
      error: clean(value.error),
      note: clean(value.note) || '외부 API 미연결',
      metadata: value.metadata && typeof value.metadata === 'object' && !Array.isArray(value.metadata) ? clone(value.metadata) : {},
      history: Array.isArray(value.history) ? value.history.slice(0, 50).map(row => ({
        at: clean(row.at),
        event: clean(row.event),
        state: STATES.includes(row.state) ? row.state : 'disconnected',
        ok: Boolean(row.ok),
        message: clean(row.message),
        metadata: row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata) ? clone(row.metadata) : {}
      })) : []
    };
  }

  function readPayload() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!raw || Number(raw.schemaVersion) !== SCHEMA_VERSION || !raw.providers) throw new Error('schema');
      return {
        schemaVersion: SCHEMA_VERSION,
        providers: Object.fromEntries(PROVIDERS.map(id => [id, normalizeProvider(id, raw.providers[id])]))
      };
    } catch {
      return { schemaVersion: SCHEMA_VERSION, providers: clone(seed) };
    }
  }

  function persist(payload, detail = {}) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent('savingio:v2-external-api-changed', { detail }));
    return payload;
  }

  function read(id) {
    if (!PROVIDERS.includes(id)) throw new Error(`Unknown external provider: ${id}`);
    return Object.freeze(clone(readPayload().providers[id]));
  }

  function readAll() {
    return Object.freeze(PROVIDERS.map(read));
  }

  function write(id, patch = {}, event = '상태 갱신', ok = false) {
    if (!PROVIDERS.includes(id)) throw new Error(`Unknown external provider: ${id}`);
    const payload = readPayload();
    const current = payload.providers[id];
    const next = normalizeProvider(id, { ...current, ...patch });
    next.history = [{
      at: now(), event: clean(event), state: next.state, ok: Boolean(ok),
      message: clean(patch.note || patch.error || next.note), metadata: clone(patch.metadata || {})
    }, ...current.history].slice(0, 50);
    payload.providers[id] = next;
    persist(payload, { provider: id, state: next.state, event });
    return Object.freeze(clone(next));
  }

  function register(id, provider) {
    if (!PROVIDERS.includes(id)) throw new Error(`Unknown external provider: ${id}`);
    if (!provider || typeof provider.sync !== 'function') throw new TypeError(`${id} provider.sync is required`);
    registry.set(id, Object.freeze({
      sync: provider.sync,
      verify: typeof provider.verify === 'function' ? provider.verify : () => ({ pass: true }),
      name: clean(provider.name) || id
    }));
    return configure(id, { note: `${clean(provider.name) || id} Provider 등록` });
  }

  function configure(id, patch = {}) {
    const registered = registry.has(id);
    return write(id, {
      configured: registered,
      state: registered ? 'configured' : 'disconnected',
      authenticated: false,
      error: '',
      note: clean(patch.note) || (registered ? 'Provider 등록 · 인증 대기' : '외부 API 미연결'),
      metadata: patch.metadata || read(id).metadata
    }, registered ? 'Provider 등록' : 'Provider 연결 해제', registered);
  }

  async function sync(id, context = {}) {
    const provider = registry.get(id);
    if (!provider) {
      return write(id, {
        state: 'disconnected', configured: false, authenticated: false,
        lastAttemptAt: now(), error: 'Provider not registered', note: '외부 API Provider 미등록'
      }, '동기화 차단', false);
    }

    write(id, { state: 'syncing', configured: true, lastAttemptAt: now(), error: '', note: '외부 데이터 동기화 중' }, '동기화 시작', true);
    try {
      const result = await provider.sync(Object.freeze({ ...context, provider: id }));
      if (!result || result.ok !== true) throw new Error(clean(result?.error || result?.message) || 'Provider returned unsuccessful result');
      return write(id, {
        state: 'connected', configured: true, authenticated: result.authenticated !== false,
        lastSuccessAt: now(), error: '', note: clean(result.message) || '외부 데이터 동기화 완료',
        metadata: result.metadata && typeof result.metadata === 'object' ? result.metadata : {}
      }, '동기화 성공', true);
    } catch (error) {
      return write(id, {
        state: 'error', configured: true, authenticated: false,
        lastErrorAt: now(), error: error?.message || String(error), note: '외부 데이터 동기화 실패'
      }, '동기화 실패', false);
    }
  }

  async function syncAll(context = {}) {
    const results = [];
    for (const id of PROVIDERS) results.push(await sync(id, context));
    return Object.freeze(results);
  }

  function disconnect(id) {
    registry.delete(id);
    return write(id, {
      state: 'disconnected', configured: false, authenticated: false,
      error: '', note: '외부 API 연결 해제', metadata: {}
    }, '연결 해제', true);
  }

  function summary() {
    const rows = readAll();
    return Object.freeze({
      total: rows.length,
      configured: rows.filter(row => row.configured).length,
      connected: rows.filter(row => row.state === 'connected' && row.authenticated).length,
      syncing: rows.filter(row => row.state === 'syncing').length,
      errors: rows.filter(row => row.state === 'error').length,
      disconnected: rows.filter(row => row.state === 'disconnected').length
    });
  }

  function verify() {
    const rows = readAll();
    const valid = rows.every(row => PROVIDERS.includes(row.id) && STATES.includes(row.state) && Array.isArray(row.history));
    const registryValid = [...registry.entries()].every(([id, provider]) => PROVIDERS.includes(id) && typeof provider.sync === 'function');
    return Object.freeze({ pass: valid && registryValid, providers: rows.length, registered: registry.size, schemaVersion: SCHEMA_VERSION, noFabricatedConnection: rows.every(row => row.state !== 'connected' || (row.configured && row.authenticated)) });
  }

  Object.defineProperty(window, 'SavingioV2ExternalApiAdapter', {
    value: Object.freeze({ read, readAll, write, register, configure, sync, syncAll, disconnect, summary, verify, providers: PROVIDERS, states: STATES, storageKey: STORAGE_KEY, schemaVersion: SCHEMA_VERSION }),
    writable: false, configurable: false, enumerable: true
  });
})();