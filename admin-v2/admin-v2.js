(() => {
  'use strict';

  const DEFAULT_PROJECTS = [
    {id:'P-2026-001',title:'40대 주름크림',category:'뷰티 · 스킨케어',type:'통합 캠페인',status:'approval',statusLabel:'승인 대기',progress:62,updated:'오늘 17:40',stages:[['시장분석','done'],['제품 후보 5개','done'],['Savingio 글 1개','done'],['쇼츠 대본 3개','done'],['이미지·음성','active'],['영상 제작','wait'],['최종 승인','wait'],['자동 배포','wait'],['성과 추적','wait']]},
    {id:'P-2026-002',title:'자동차보험 마일리지 환급',category:'보험 · 자동차보험',type:'글+쇼츠',status:'running',statusLabel:'제작 중',progress:44,updated:'오늘 16:15',stages:[['시장분석','done'],['기존 글 확인','done'],['새 본문 작성','active'],['QA','wait'],['승인','wait'],['배포','wait']]},
    {id:'P-2026-003',title:'여름 전기요금 절약',category:'생활비 · 공과금',type:'SNS 캠페인',status:'error',statusLabel:'오류 1건',progress:78,updated:'오늘 14:02',stages:[['콘텐츠 연결','done'],['쇼츠 제작','done'],['YouTube 예약','done'],['Instagram 배포','active'],['Threads 배포','wait'],['성과 추적','wait']]},
    {id:'P-2026-004',title:'구독서비스 정리',category:'생활비 · 구독',type:'글',status:'done',statusLabel:'배포 완료',progress:100,updated:'어제 22:18',stages:[['글 작성','done'],['QA','done'],['승인','done'],['GitHub 반영','done'],['Cloudflare 배포','done'],['실제 URL 확인','done']]}
  ];

  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const readProjects = () => {
    try {
      const stored = JSON.parse(localStorage.getItem('savingio-admin-projects') || 'null');
      return Array.isArray(stored) && stored.length ? stored : DEFAULT_PROJECTS;
    } catch {
      return DEFAULT_PROJECTS;
    }
  };

  const workspace = $('#adminWorkspace');
  const title = $('#pageTitle');
  const registry = new Map();
  let activeId = '';

  const counts = list => list.reduce((result, item) => {
    result[item.status] = (result[item.status] || 0) + 1;
    return result;
  }, {running:0,approval:0,error:0,done:0});

  function metric(label, value) {
    return `<article class="metric"><span>${esc(label)}</span><strong>${esc(value)}</strong></article>`;
  }

  function projectCards(list) {
    if (!list.length) return '<div class="panel empty">해당 조건의 프로젝트가 없습니다.</div>';
    return `<div class="project-list">${list.map(project => `
      <article class="project-card">
        <div class="project-top"><div><div class="project-title">${esc(project.title)}</div><div class="meta">${esc(project.id)} · ${esc(project.category)} · ${esc(project.type)}</div></div><span class="status ${esc(project.status)}">${esc(project.statusLabel)}</span></div>
        <div class="progress"><i style="width:${Number(project.progress || 0)}%"></i></div>
        <div class="meta">진행률 ${Number(project.progress || 0)}% · ${esc(project.updated || '')}</div>
      </article>`).join('')}</div>`;
  }

  function summary(list) {
    const state = counts(list);
    const average = list.length ? Math.round(list.reduce((sum, item) => sum + Number(item.progress || 0), 0) / list.length) : 0;
    return {state, average};
  }

  function baseView(eyebrow, heading, description, body) {
    return `<section class="view" data-module-root="${esc(activeId)}"><header class="hero"><p>${esc(eyebrow)}</p><h2>${esc(heading)}</h2><p>${esc(description)}</p></header>${body}</section>`;
  }

  function commandHome() {
    const list = readProjects();
    const {state, average} = summary(list);
    return baseView('COMMAND CENTER','통합 상황실','전체 운영 현황을 요약하고 상세 화면으로 연결합니다.',`
      <div class="metrics">
        ${metric('전체 진행률',`${average}%`)}${metric('진행 중',`${state.running}건`)}${metric('승인 대기',`${state.approval}건`)}${metric('오류',`${state.error}건`)}${metric('완료',`${state.done}건`)}${metric('등록 프로젝트',`${list.length}건`)}
      </div>
      <div class="two-col">
        <section class="panel"><h3>진행 중인 프로젝트</h3>${projectCards(list)}</section>
        <aside class="panel"><h3>Shell 상태</h3><div class="qa-grid"><article class="qa-card"><span>Explorer</span><strong class="lock-pass">255px LOCK</strong></article><article class="qa-card"><span>Workspace</span><strong class="lock-pass">1개</strong></article><article class="qa-card"><span>활성 모듈</span><strong id="activeModuleValue">command-home</strong></article><article class="qa-card"><span>Legacy Board</span><strong class="lock-pass">없음</strong></article></div></aside>
      </div>`);
  }

  function progressView() {
    const list = readProjects();
    const {state, average} = summary(list);
    return baseView('COMMAND CENTER','전체 진행률','프로젝트 전체 진행률과 상태 분포를 확인합니다.',`
      <div class="metrics">${metric('평균 진행률',`${average}%`)}${metric('진행 중',`${state.running}건`)}${metric('승인 대기',`${state.approval}건`)}${metric('오류',`${state.error}건`)}${metric('완료',`${state.done}건`)}${metric('전체',`${list.length}건`)}</div>
      <section class="panel"><h3>프로젝트별 진행률</h3>${projectCards(list)}</section>`);
  }

  function filteredView(id, eyebrow, heading, description, predicate) {
    const list = readProjects().filter(predicate);
    return baseView(eyebrow, heading, description, `<section class="panel"><h3>${esc(heading)} 목록</h3>${projectCards(list)}</section>`);
  }

  function revenueView() {
    const list = readProjects();
    const {state, average} = summary(list);
    return baseView('COMMAND CENTER','수익 요약','현재 연결 가능한 운영 상태만 표시하며, 실제 클릭·전환·정산 데이터는 추후 별도 데이터 모듈로 연결합니다.',`
      <div class="metrics">${metric('완료 프로젝트',`${state.done}건`)}${metric('진행 중',`${state.running}건`)}${metric('승인 대기',`${state.approval}건`)}${metric('오류',`${state.error}건`)}${metric('평균 진행률',`${average}%`)}${metric('수익 데이터','연결 대기')}</div>
      <section class="panel"><h3>수익 데이터 연결 상태</h3><p class="meta">현재 화면은 임의 수익 숫자를 만들지 않습니다. 상품·제휴·클릭·전환·정산 소스가 연결되면 이 모듈에서만 집계합니다.</p></section>`);
  }

  function register(id, label, render) {
    registry.set(id, {id, label, render});
  }

  register('command-home','통합 상황실',commandHome);
  register('command-progress','전체 진행률',progressView);
  register('command-today','오늘 작업',() => filteredView('command-today','COMMAND CENTER','오늘 작업','현재 진행 중인 프로젝트와 활성 작업을 확인합니다.',item => item.status === 'running'));
  register('command-approval','승인 필요',() => filteredView('command-approval','COMMAND CENTER','승인 필요','승인 대기 상태의 프로젝트만 확인합니다.',item => item.status === 'approval'));
  register('command-error','오류·중지',() => filteredView('command-error','COMMAND CENTER','오류·중지','오류 또는 중지 상태의 프로젝트만 확인합니다.',item => item.status === 'error'));
  register('command-revenue','수익 요약',revenueView);

  function setActiveNavigation(id) {
    document.querySelectorAll('[data-view]').forEach(button => button.classList.toggle('active', button.dataset.view === id));
  }

  function syncUrl(id, mode='push') {
    const url = new URL(location.href);
    url.searchParams.set('view', id);
    const method = mode === 'replace' ? 'replaceState' : 'pushState';
    history[method]({view:id}, '', url.pathname + url.search);
  }

  function mount(id, mode='push') {
    const module = registry.get(id) || registry.get('command-home');
    activeId = module.id;
    title.textContent = module.label;
    workspace.innerHTML = module.render();
    setActiveNavigation(module.id);
    if (mode !== 'none') syncUrl(module.id, mode);
    const activeValue = $('#activeModuleValue');
    if (activeValue) activeValue.textContent = module.id;
  }

  $('#adminNav').addEventListener('click', event => {
    const button = event.target.closest('[data-view]');
    if (!button) return;
    mount(button.dataset.view);
  });

  $('#refreshBtn').addEventListener('click', () => mount(activeId || 'command-home', 'replace'));
  window.addEventListener('popstate', event => mount(event.state?.view || new URLSearchParams(location.search).get('view') || 'command-home', 'none'));

  const requested = new URLSearchParams(location.search).get('view') || 'command-home';
  mount(requested, 'replace');

  window.SavingioAdminV2 = Object.freeze({
    mount,
    verify() {
      return {
        explorerCount: document.querySelectorAll('.admin-sidebar').length,
        workspaceCount: document.querySelectorAll('#adminWorkspace').length,
        activeModuleRoots: document.querySelectorAll('#adminWorkspace [data-module-root]').length,
        activeId,
        sidebarWidth: getComputedStyle(document.documentElement).getPropertyValue('--sidebar').trim()
      };
    }
  });
})();