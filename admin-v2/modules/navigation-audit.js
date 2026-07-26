(() => {
  'use strict';
  const registry = window.SavingioV2Modules;
  if (!registry) throw new Error('Navigation Audit registry is not loaded');

  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

  function collect() {
    const menuTargets = [...document.querySelectorAll('#adminNav [data-view]')].map(element => ({
      id: String(element.dataset.view || '').trim(),
      label: String(element.textContent || '').replace(/⌄/g, '').trim(),
      source: '왼쪽 메뉴',
      registered: registry.has(element.dataset.view)
    }));
    const routeTargets = [...document.querySelectorAll('#adminWorkspace [data-route]')].map(element => ({
      id: String(element.dataset.route || '').trim(),
      label: String(element.textContent || '').trim().slice(0, 80),
      source: '현재 화면 버튼',
      registered: registry.has(element.dataset.route)
    }));
    const duplicateMenuIds = [...new Set(menuTargets.map(item => item.id).filter((id, index, rows) => rows.indexOf(id) !== index))];
    const blank = [...menuTargets, ...routeTargets].filter(item => !item.id);
    const missing = [...menuTargets, ...routeTargets].filter(item => item.id && !item.registered);
    return Object.freeze({
      menuTargets: Object.freeze(menuTargets),
      routeTargets: Object.freeze(routeTargets),
      duplicateMenuIds: Object.freeze(duplicateMenuIds),
      blank: Object.freeze(blank),
      missing: Object.freeze(missing),
      registeredModules: Object.freeze(registry.list()),
      pass: missing.length === 0 && blank.length === 0 && duplicateMenuIds.length === 0
    });
  }

  function rows(items, empty) {
    if (!items.length) return `<div class="empty">${esc(empty)}</div>`;
    return `<div class="project-list">${items.map(item => `<article class="project-card"><div class="project-top"><div><div class="project-title">${esc(item.label || item.id || '이름 없음')}</div><div class="meta">${esc(item.source)} · route: ${esc(item.id || '(빈 값)')}</div></div><span class="status ${item.registered ? 'done' : 'error'}">${item.registered ? '연결됨' : '연결 끊김'}</span></div>${item.registered ? `<div class="header-actions"><button class="button secondary" type="button" data-route="${esc(item.id)}">화면 열기</button></div>` : ''}</article>`).join('')}</div>`;
  }

  function render() {
    const result = collect();
    const connected = result.menuTargets.filter(item => item.registered).length;
    return `<section class="view" data-module-root><header class="hero"><p>NAVIGATION INTEGRITY</p><h2>메뉴·화면 연결 검사</h2><p>왼쪽 검색트리의 모든 메뉴가 실제 화면 모듈에 연결됐는지 눈으로 확인합니다. 연결이 끊긴 항목은 숨기지 않고 바로 표시합니다.</p></header><div class="metrics"><article class="metric"><span>왼쪽 메뉴</span><strong>${result.menuTargets.length}</strong></article><article class="metric"><span>정상 연결</span><strong>${connected}</strong></article><article class="metric"><span>연결 끊김</span><strong class="${result.missing.length ? 'fail' : ''}">${result.missing.length}</strong></article><article class="metric"><span>중복 Route</span><strong class="${result.duplicateMenuIds.length ? 'fail' : ''}">${result.duplicateMenuIds.length}</strong></article><article class="metric"><span>등록 모듈</span><strong>${result.registeredModules.length}</strong></article><article class="metric"><span>전체 판정</span><strong class="${result.pass ? 'pass' : 'fail'}">${result.pass ? 'PASS' : 'FAIL'}</strong></article></div><section class="panel"><h3>왼쪽 검색트리 전체 연결</h3>${rows(result.menuTargets, '등록된 메뉴가 없습니다.')}</section><section class="panel"><h3>현재 화면 내부 이동 버튼</h3>${rows(result.routeTargets, '현재 화면에는 내부 이동 버튼이 없습니다.')}</section>${result.missing.length ? `<section class="panel"><h3>수정 필요 항목</h3>${rows(result.missing, '연결 끊김이 없습니다.')}</section>` : ''}<section class="panel"><h3>검사 동작</h3><div class="header-actions"><button class="button" type="button" data-navigation-audit="rerun">다시 검사</button><button class="button secondary" type="button" data-route="command-home">어드민 메인</button></div></section></section>`;
  }

  registry.register({ id: 'tool-navigation-audit', title: '메뉴·화면 연결 검사', render });
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-navigation-audit="rerun"]');
    if (!button) return;
    event.preventDefault();
    window.SavingioAdminV2?.mount?.('tool-navigation-audit', 'replace');
  });
  Object.defineProperty(window, 'SavingioV2NavigationAudit', { value: Object.freeze({ collect, verify() { const result = collect(); return Object.freeze({ pass: result.pass, menuCount: result.menuTargets.length, missing: result.missing.map(item => item.id), duplicates: result.duplicateMenuIds }); } }), writable: false, configurable: false });
})();