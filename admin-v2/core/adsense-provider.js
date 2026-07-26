(() => {
  'use strict';

  const adapter = window.SavingioV2ExternalApiAdapter;
  const store = window.SavingioV2AdSenseStore;
  const config = window.SavingioV2AdSenseConfig;
  if (!adapter || !store || !config) throw new Error('AdSense Provider dependencies are not loaded');
  if (window.SavingioV2AdSenseProvider) throw new Error('AdSense Provider already exists');

  const PROVIDER_ID = 'adsense';
  const BRIDGE_NAME = 'SavingioAdSenseApiBridge';
  const clean = value => String(value ?? '').trim();
  const SITE_STATES = new Set(store.siteStates);
  const ADS_TXT_STATES = new Set(store.adsTxtStates);
  const AD_STATES = new Set(store.adStates);
  const POLICY_STATES = new Set(store.policyStates);

  function getBridge() {
    const bridge = window[BRIDGE_NAME];
    return bridge && typeof bridge.sync === 'function' ? bridge : null;
  }

  function normalizeState(value, allowed, fallback) {
    return allowed.has(value) ? value : fallback;
  }

  function assertLocks(result = {}) {
    if (clean(result.publisherId) !== config.publisherId) throw new Error('AdSense Publisher ID LOCK mismatch');
    if (clean(result.clientId) !== config.clientId) throw new Error('AdSense Client ID LOCK mismatch');
    if (clean(result.site) !== config.site) throw new Error('AdSense site LOCK mismatch');
    if (clean(result.adsTxtLine) !== config.adsTxtLine) throw new Error('ads.txt LOCK mismatch');
  }

  async function sync(context = {}) {
    const bridge = getBridge();
    if (!bridge) return { ok: false, authenticated: false, error: `${BRIDGE_NAME}.sync 미등록` };

    const result = await bridge.sync(Object.freeze({
      site: config.site,
      publisherId: config.publisherId,
      clientId: config.clientId,
      adsTxtLine: config.adsTxtLine,
      ...context
    }));

    if (!result || result.ok !== true) return { ok: false, authenticated: false, error: clean(result?.error || result?.message) || 'AdSense Bridge 동기화 실패' };
    if (result.authenticated !== true) return { ok: false, authenticated: false, error: 'AdSense 인증 미확인' };
    assertLocks(result);

    const patch = {
      siteStatus: normalizeState(result.siteStatus, SITE_STATES, 'unverified'),
      adsTxtStatus: normalizeState(result.adsTxtStatus, ADS_TXT_STATES, 'unknown'),
      adServingStatus: normalizeState(result.adServingStatus, AD_STATES, 'unknown'),
      policyStatus: normalizeState(result.policyStatus, POLICY_STATES, 'unknown'),
      revenueConnected: result.revenueConnected === true,
      note: clean(result.note) || 'AdSense Bridge 검증 데이터'
    };
    store.write(patch);

    return {
      ok: true,
      authenticated: true,
      message: 'AdSense 상태 동기화 완료',
      metadata: {
        bridge: BRIDGE_NAME,
        site: config.site,
        publisherId: config.publisherId,
        clientId: config.clientId,
        adsTxtLine: config.adsTxtLine,
        siteStatus: patch.siteStatus,
        adsTxtStatus: patch.adsTxtStatus,
        adServingStatus: patch.adServingStatus,
        policyStatus: patch.policyStatus,
        revenueConnected: patch.revenueConnected,
        syncedAt: new Date().toISOString()
      }
    };
  }

  function verify() {
    const state = adapter.read(PROVIDER_ID);
    const data = store.read();
    const storeCheck = store.verify();
    const publisherLock = data.publisherId === config.publisherId && data.clientId === config.clientId;
    const adsTxtLock = data.adsTxtLine === config.adsTxtLine;
    const siteLock = data.site === config.site;
    const truthfulConnection = state.state !== 'connected' || (state.authenticated && state.metadata?.bridge === BRIDGE_NAME && state.metadata?.publisherId === config.publisherId && state.metadata?.adsTxtLine === config.adsTxtLine);
    return Object.freeze({
      pass: storeCheck.pass && publisherLock && adsTxtLock && siteLock && truthfulConnection,
      provider: PROVIDER_ID,
      bridgeRegistered: Boolean(getBridge()),
      adapterState: state.state,
      authenticated: state.authenticated,
      publisherLock,
      adsTxtLock,
      siteLock,
      noFabricatedStatus: state.state !== 'connected' || state.metadata?.bridge === BRIDGE_NAME
    });
  }

  adapter.register(PROVIDER_ID, { name: 'Google AdSense', sync, verify });
  Object.defineProperty(window, 'SavingioV2AdSenseProvider', {
    value: Object.freeze({ sync, verify, getBridge, bridgeName: BRIDGE_NAME, providerId: PROVIDER_ID }),
    writable: false,
    configurable: false,
    enumerable: true
  });
})();