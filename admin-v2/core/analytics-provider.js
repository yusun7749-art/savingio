(() => {
  'use strict';

  const adapter = window.SavingioV2ExternalApiAdapter;
  const store = window.SavingioV2AnalyticsInventoryStore;
  if (!adapter || !store) throw new Error('Analytics Provider dependencies are not loaded');
  if (window.SavingioV2AnalyticsProvider) throw new Error('Analytics Provider already exists');

  const PROVIDER_ID = 'analytics';
  const BRIDGE_NAME = 'SavingioAnalyticsApiBridge';
  const SITE_ORIGIN = 'https://savingio.com';
  const clean = value => String(value ?? '').trim();
  const number = value => Math.max(0, Number(value) || 0);
  const ratio = value => Math.max(0, Math.min(100, Number(value) || 0));

  function normalizeUrl(value) {
    const raw = clean(value);
    if (!raw) return '';
    try {
      const url = new URL(raw, SITE_ORIGIN);
      if (url.origin !== SITE_ORIGIN) throw new Error('Analytics row origin mismatch');
      return `${url.pathname}${url.search}`;
    } catch {
      throw new Error(`Invalid Analytics URL: ${raw}`);
    }
  }

  function normalizeRow(row = {}, index = 0) {
    const url = normalizeUrl(row.url || row.path);
    if (!url) throw new Error(`Analytics row ${index + 1} URL missing`);
    return {
      id: clean(row.id) || `ANA-EXT-${btoa(unescape(encodeURIComponent(url))).replace(/[^A-Z0-9]/gi, '').slice(0, 18).toUpperCase() || index}`,
      title: clean(row.title) || url,
      url,
      source: 'analytics',
      status: 'verified',
      views: number(row.views),
      clicks: number(row.clicks),
      impressions: number(row.impressions),
      ctr: ratio(row.ctr),
      avgSeconds: number(row.avgSeconds),
      conversions: number(row.conversions),
      revenueSignal: number(row.revenueSignal),
      period: clean(row.period),
      note: clean(row.note) || 'Analytics Bridge 검증 데이터'
    };
  }

  function getBridge() {
    const bridge = window[BRIDGE_NAME];
    return bridge && typeof bridge.sync === 'function' ? bridge : null;
  }

  async function sync(context = {}) {
    const bridge = getBridge();
    if (!bridge) return { ok: false, authenticated: false, error: `${BRIDGE_NAME}.sync 미등록` };

    const result = await bridge.sync(Object.freeze({ site: SITE_ORIGIN, ...context }));
    if (!result || result.ok !== true) return { ok: false, authenticated: false, error: clean(result?.error || result?.message) || 'Analytics Bridge 동기화 실패' };
    if (result.authenticated !== true) return { ok: false, authenticated: false, error: 'Analytics 인증 미확인' };
    if (!Array.isArray(result.rows)) return { ok: false, authenticated: true, error: 'Analytics rows 응답 누락' };

    const rows = result.rows.map(normalizeRow);
    rows.forEach(row => store.upsert(row));
    return {
      ok: true,
      authenticated: true,
      message: `Analytics ${rows.length}건 동기화 완료`,
      metadata: {
        bridge: BRIDGE_NAME,
        site: SITE_ORIGIN,
        rowCount: rows.length,
        period: clean(result.period),
        propertyId: clean(result.propertyId),
        syncedAt: new Date().toISOString()
      }
    };
  }

  function verify() {
    const state = adapter.read(PROVIDER_ID);
    const inventory = store.verify();
    const connectedIsTruthful = state.state !== 'connected' || (state.authenticated && Number(state.metadata?.rowCount) >= 0 && state.metadata?.bridge === BRIDGE_NAME);
    return Object.freeze({
      pass: inventory.pass && connectedIsTruthful,
      provider: PROVIDER_ID,
      bridgeRegistered: Boolean(getBridge()),
      adapterState: state.state,
      authenticated: state.authenticated,
      inventoryCount: inventory.count,
      noFabricatedMetrics: state.state !== 'connected' || state.metadata?.bridge === BRIDGE_NAME
    });
  }

  adapter.register(PROVIDER_ID, { name: 'Google Analytics', sync, verify });
  Object.defineProperty(window, 'SavingioV2AnalyticsProvider', {
    value: Object.freeze({ sync, verify, getBridge, bridgeName: BRIDGE_NAME, providerId: PROVIDER_ID, siteOrigin: SITE_ORIGIN }),
    writable: false,
    configurable: false,
    enumerable: true
  });
})();