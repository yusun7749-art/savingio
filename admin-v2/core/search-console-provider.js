(() => {
  'use strict';

  const adapter = window.SavingioV2ExternalApiAdapter;
  const store = window.SavingioV2SearchConsoleStore;
  if (!adapter || !store) throw new Error('Search Console Provider dependencies are not loaded');
  if (window.SavingioV2SearchConsoleProvider) throw new Error('Search Console Provider already exists');

  const PROVIDER_ID = 'search-console';
  const PROPERTY = 'https://savingio.com/';
  const STATES = new Set(['unverified', 'verified', 'warning', 'error']);
  const clean = value => String(value ?? '').trim();
  const finiteOrNull = value => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : null;

  function bridge() {
    const api = window.SavingioSearchConsoleApiBridge;
    return api && typeof api.sync === 'function' ? api : null;
  }

  function normalize(result = {}) {
    const property = clean(result.property || PROPERTY);
    if (property !== PROPERTY) throw new Error(`Search Console property mismatch: ${property}`);
    const state = value => STATES.has(value) ? value : 'unverified';
    return Object.freeze({
      property: PROPERTY,
      connection: state(result.connection),
      sitemap: state(result.sitemap),
      urlInspection: state(result.urlInspection),
      indexing: state(result.indexing),
      crawl: state(result.crawl),
      indexedPages: finiteOrNull(result.indexedPages),
      excludedPages: finiteOrNull(result.excludedPages),
      note: clean(result.note) || 'Search Console 동기화 결과',
      source: clean(result.source) || 'api-bridge',
      fetchedAt: clean(result.fetchedAt) || new Date().toISOString()
    });
  }

  async function sync(context = {}) {
    const api = bridge();
    if (!api) return { ok: false, authenticated: false, error: 'SavingioSearchConsoleApiBridge 미등록' };
    const raw = await api.sync(Object.freeze({ property: PROPERTY, ...context }));
    if (!raw || raw.ok !== true) return { ok: false, authenticated: false, error: clean(raw?.error || raw?.message) || 'Search Console API 응답 실패' };
    const data = normalize(raw.data || raw);
    store.write({
      connection: data.connection,
      sitemap: data.sitemap,
      urlInspection: data.urlInspection,
      indexing: data.indexing,
      crawl: data.crawl,
      indexedPages: data.indexedPages,
      excludedPages: data.excludedPages,
      note: `${data.note} · ${data.source}`
    }, 'Search Console Provider 동기화');
    return {
      ok: true,
      authenticated: raw.authenticated === true,
      message: 'Search Console Store 반영 완료',
      metadata: {
        property: data.property,
        source: data.source,
        fetchedAt: data.fetchedAt,
        indexedPages: data.indexedPages,
        excludedPages: data.excludedPages
      }
    };
  }

  function verify() {
    const api = bridge();
    const state = adapter.read(PROVIDER_ID);
    const storeResult = store.verify();
    const noFalseAuth = !state.authenticated || Boolean(api);
    const propertyLock = store.read().property === PROPERTY;
    return Object.freeze({
      pass: storeResult.pass && propertyLock && noFalseAuth,
      bridgeRegistered: Boolean(api),
      providerState: state.state,
      authenticated: state.authenticated,
      propertyLock,
      noFalseAuth
    });
  }

  adapter.register(PROVIDER_ID, { name: 'Google Search Console', sync, verify });

  Object.defineProperty(window, 'SavingioV2SearchConsoleProvider', {
    value: Object.freeze({ sync, verify, normalize, bridge, providerId: PROVIDER_ID, property: PROPERTY }),
    writable: false, configurable: false, enumerable: true
  });
})();