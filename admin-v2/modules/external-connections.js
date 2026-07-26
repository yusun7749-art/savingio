(() => {
  'use strict';

  const registry = window.SavingioV2Modules;
  const adapter = window.SavingioV2ExternalApiAdapter;
  if (!registry || !adapter) throw new Error('External Connections dependencies are not loaded');

  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const labels = Object.freeze({
    'search-console': 'Search Console',
    analytics: 'Google Analytics',
    adsense: 'AdSense'
  });
  const stateLabels = Object.freeze({
    disconnected: '미연결', configured: '설정됨', syncing: '동기화 중', connected: '연결됨', error: '오류'
  });
  const badge = state => `<strong class="${state === 'connected' ? 'pass' : state === 'error' ? 'fail' : ''}">${esc(stateLabels[state] || state)}</strong>`;
  const time = value => {
    if (!value) return '없음';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '없음' : date.toLocaleString('ko-KR');
  };

  function providerCard(row) {
    const latest = row.history?.[0];
    return `<article class="panel" data-external-provider="${esc(row.id)}"><h3>${esc(labels[row.id] || row.id)}</h3><div class="connection-list"><div><span>연결 상태</span>${badge(row.state)}</div><div><span>Provider 등록</span><strong>${row.configured ? '예' : '아니요'}</strong></div><div><span>인증 확인</span><strong>${row.authenticated ? '확인됨' : '미확인'}</strong></div><div><span>최근 시도</span><strong>${esc(time(row.lastAttemptAt))}</strong></div><div><span>최근 성공</span><strong>${esc(time(row.lastSuccessAt))}</strong></div><div><span>최근 오류</span><strong>${esc(time(row.lastErrorAt))}</strong></div><div><span>현재 메모</span><strong>${esc(row.note)}</strong></div>${row.error ? `<div><span>오류</span><strong class="fail">${esc(row.error)}</strong></div>` : ''}${latest ? `<div><span>최근 이력</span><strong>${esc(latest.event)} · ${esc(time(latest.at))}</strong></div>` : ''}</div><div class="header-actions"><button class="button" type="button" data-external-sync="${esc(row.id)}" ${row.state === 'syncing' ? 'disabled' : ''}>동기화 실행</button><button class="button secondary" type="button" data-external-disconnect="${esc(row.id)}">연결 초기화</button></div></article>`;
  }

  function render() {
    const rows = adapter.readAll();
    const summary = adapter.summary();
    return `<section class="view" data-module-root><header class="hero"><p>EXTERNAL DATA</p><h2>외부 데이터 연결 센터</h2><p>Search Console·Analytics·AdSense 연결 상태와 동기화 이력을 공통 Adapter 기준으로 관리합니다.</p></header><div class="metrics"><article class="metric"><span>전체 Provider</span><strong>${summary.total}</strong></article><article class="metric"><span>설정됨</span><strong>${summary.configured}</strong></article><article class="metric"><span>연결됨</span><strong>${summary.connected}</strong></article><article class="metric"><span>동기화 중</span><strong>${summary.syncing}</strong></article><article class="metric"><span>오류</span><strong>${summary.errors}</strong></article><article class="metric"><span>미연결</span><strong>${summary.disconnected}</strong></article></div><section class="panel"><h3>진실성 LOCK</h3><div class="connection-list"><div><span>Provider 미등록 상태</span><strong>외부 데이터 생성 금지</strong></div><div><span>동기화 실패</span><strong>연결됨으로 변경 금지</strong></div><div><span>인증 미확인</span><strong>실데이터로 표시 금지</strong></div></div></section>${rows.map(providerCard).join('')}</section>`;
  }

  async function syncProvider(id, button) {
    button.disabled = true;
    try {
      const result = await adapter.sync(id, { source: 'external-connections-center' });
      if (result.state === 'error' || result.state === 'disconnected') alert(`${labels[id] || id} 동기화 실패\n${result.error || result.note}`);
      else alert(`${labels[id] || id} 동기화 완료`);
    } finally {
      button.disabled = false;
      window.SavingioAdminV2?.mount?.('tool-external-connections', 'replace');
    }
  }

  document.addEventListener('click', event => {
    const sync = event.target.closest('[data-external-sync]');
    if (sync) {
      event.preventDefault();
      syncProvider(sync.dataset.externalSync, sync);
      return;
    }
    const disconnect = event.target.closest('[data-external-disconnect]');
    if (disconnect) {
      event.preventDefault();
      adapter.disconnect(disconnect.dataset.externalDisconnect);
      window.SavingioAdminV2?.mount?.('tool-external-connections', 'replace');
    }
  });

  registry.register({ id: 'tool-external-connections', title: '외부 데이터 연결 센터', render });
  Object.defineProperty(window, 'SavingioV2ExternalConnectionsCenter', {
    value: Object.freeze({ render, verify() { const status = adapter.verify(); return Object.freeze({ pass: registry.has('tool-external-connections') && status.pass && status.noFabricatedConnection, adapter: status }); } }),
    writable: false, configurable: false
  });
})();