(() => {
  'use strict';

  const data = window.SAVINGIO_ADMIN_DATA || { departments: [], departmentCards: [], projects: [] };
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const slug = value => String(value || '').trim().toLowerCase().replace(/[^0-9a-z가-힣]+/g, '-').replace(/^-+|-+$/g, '');

  const sections = {
    notice: $('#securityNotice'),
    stats: $('#stats'),
    projects: document.querySelector('.workspace-grid'),
    content: $('#contentApprovalCenter'),
    legacy: document.querySelector('.department-panel')
  };

  const routeWorkspace = document.createElement('section');
  routeWorkspace.id = 'adminRouteWorkspace';
  routeWorkspace.className = 'admin-route-workspace';
  document.querySelector('.topbar')?.insertAdjacentElement('afterend', routeWorkspace);

  const hide = node => node?.classList.add('admin-route-hidden');
  const show = node => node?.classList.remove('admin-route-hidden');
  const hideAll = () => Object.values(sections).forEach(hide);

  function projects() {
    try {
      const saved = JSON.parse(localStorage.getItem('savingio-admin-projects') || 'null');
      return Array.isArray(saved) ? saved : (data.projects || []);
    } catch {
      return data.projects || [];
    }
  }

  function setTitle(title) {
    const element = $('#pageTitle');
    if (element) element.textContent = title;
  }

  function syncUrl(departmentId, childName = '') {
    const url = new URL(location.href);
    url.searchParams.delete('hq');
    url.hash = childName ? `view=${encodeURIComponent(departmentId)}&item=${encodeURIComponent(childName)}` : `view=${encodeURIComponent(departmentId)}`;
    history.replaceState({ departmentId, childName }, '', url.pathname + url.search + url.hash);
  }

  function statusCounts(list) {
    return list.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, { running:0, approval:0, error:0, done:0 });
  }

  function renderCommandHome() {
    hideAll();
    routeWorkspace.replaceChildren();
    show(sections.notice);
    show(sections.stats);
    show(sections.projects);
    setTitle('통합 상황실');
  }

  function renderCommandChild(childName) {
    hideAll();
    routeWorkspace.replaceChildren();
    const list = projects();
    const counts = statusCounts(list);
    const average = list.length ? Math.round(list.reduce((sum, item) => sum + Number(item.progress || 0), 0) / list.length) : 0;

    if (childName === '전체 진행률') {
      show(sections.stats);
      show(sections.projects);
    } else if (childName === '오늘 작업') {
      renderProjectPage(childName, list.filter(item => item.status === 'running'), '현재 진행 중인 프로젝트와 활성 단계를 표시합니다.');
    } else if (childName === '승인 필요') {
      renderProjectPage(childName, list.filter(item => item.status === 'approval'), '승인 대기 상태인 프로젝트만 표시합니다.');
    } else if (childName === '오류·중지') {
      renderProjectPage(childName, list.filter(item => item.status === 'error'), '오류 또는 사용자 중지 상태인 프로젝트만 표시합니다.');
    } else if (childName === '수익 요약') {
      routeWorkspace.innerHTML = `<section class="admin-route-panel"><header><p class="eyebrow">COMMAND CENTER</p><h2>수익 요약</h2><p>현재 운영 데이터에서 확인 가능한 프로젝트 상태와 수익 연결 준비 현황입니다.</p></header><div class="admin-route-metrics"><article><span>전체 프로젝트</span><strong>${list.length}</strong></article><article><span>완료</span><strong>${counts.done || 0}</strong></article><article><span>진행 중</span><strong>${counts.running || 0}</strong></article><article><span>평균 진행률</span><strong>${average}%</strong></article></div><div class="admin-route-note">클릭·전환·정산 데이터는 상품·수익본부의 실제 데이터 소스 연결 후 이 화면에 집계됩니다.</div></section>`;
    }
    setTitle(childName);
  }

  function renderProjectPage(title, list, description) {
    const cards = list.length ? list.map(project => `<article class="admin-route-project"><div><strong>${esc(project.title)}</strong><small>${esc(project.id)} · ${esc(project.category)} · ${esc(project.type)}</small></div><span class="status ${esc(project.status)}">${esc(project.statusLabel)}</span><div class="progress"><i style="width:${Number(project.progress || 0)}%"></i></div><small>진행률 ${Number(project.progress || 0)}%</small></article>`).join('') : '<p class="admin-route-empty">해당 상태의 프로젝트가 없습니다.</p>';
    routeWorkspace.innerHTML = `<section class="admin-route-panel"><header><p class="eyebrow">COMMAND CENTER</p><h2>${esc(title)}</h2><p>${esc(description)}</p></header><div class="admin-route-projects">${cards}</div></section>`;
  }

  function cardForDepartment(departmentId) {
    const map = {
      market:'시장분석', content:'콘텐츠', video:'영상·음성', social:'SNS 배포', product:'상품·수익', approval:'승인센터', automation:'자동화센터', analytics:'성과분석', system:'시스템'
    };
    return (data.departmentCards || []).find(card => card.title === map[departmentId]);
  }

  function renderDepartment(department, childName = '') {
    hideAll();
    routeWorkspace.replaceChildren();

    if (department.id === 'content' && (!childName || childName === '콘텐츠 QA')) {
      show(sections.content);
      setTitle(childName || department.name);
      return;
    }

    const card = cardForDepartment(department.id);
    const items = childName ? [childName] : department.children;
    const cardItems = card?.items || [];
    const projectsForDepartment = projects().filter(project => String(project.category || '').includes(department.name.replace('본부','').replace('센터','')));

    routeWorkspace.innerHTML = `<section class="admin-route-panel" data-department="${esc(department.id)}"><header><p class="eyebrow">SAVINGIO DEPARTMENT</p><h2>${esc(childName || department.name)}</h2><p>${childName ? `${esc(department.name)}의 ${esc(childName)} 전용 작업 화면입니다.` : `${esc(department.name)}의 실제 업무와 연결 상태를 한 화면에서 관리합니다.`}</p></header><div class="admin-route-grid">${items.map((item,index) => `<article class="admin-route-card"><span>${String(index+1).padStart(2,'0')}</span><strong>${esc(item)}</strong><small>${cardItems[index] ? esc(cardItems[index]) : '업무 화면 연결 대상'}</small></article>`).join('')}</div>${projectsForDepartment.length ? `<div class="admin-route-projects"><h3>연결 프로젝트</h3>${projectsForDepartment.map(project => `<article class="admin-route-project"><div><strong>${esc(project.title)}</strong><small>${esc(project.id)} · ${esc(project.category)}</small></div><span class="status ${esc(project.status)}">${esc(project.statusLabel)}</span></article>`).join('')}</div>` : '<div class="admin-route-note">현재 이 부서에 분류된 프로젝트 데이터가 없습니다. 새 프로젝트에서 분류를 지정하면 이 화면에 연결됩니다.</div>'}</section>`;
    setTitle(childName || department.name);
  }

  function activate(departmentId, childName = '', writeUrl = true) {
    const department = data.departments.find(item => item.id === departmentId) || data.departments[0];
    if (!department) return;
    if (department.id === 'command') {
      if (childName) renderCommandChild(childName);
      else renderCommandHome();
    } else {
      renderDepartment(department, childName);
    }
    document.querySelectorAll('#treeNav .tree-title, #treeNav .tree-child').forEach(item => item.classList.remove('active'));
    document.querySelector(`#treeNav .tree-title[data-dept="${CSS.escape(department.id)}"]`)?.classList.add('active');
    if (childName) {
      [...document.querySelectorAll('#treeNav .tree-child')].find(item => item.dataset.child === childName)?.classList.add('active');
    }
    if (writeUrl) syncUrl(department.id, childName);
  }

  function routeFromUrl() {
    const hash = new URLSearchParams(location.hash.replace(/^#/, ''));
    const departmentId = hash.get('view') || 'command';
    const childName = hash.get('item') || '';
    activate(departmentId, childName, false);
  }

  const nav = $('#treeNav');
  nav?.addEventListener('click', event => {
    const title = event.target.closest('.tree-title[data-dept]');
    if (title) {
      queueMicrotask(() => activate(title.dataset.dept));
      return;
    }
    const child = event.target.closest('.tree-child');
    if (child) {
      const departmentId = child.closest('.tree-group')?.querySelector('.tree-title[data-dept]')?.dataset.dept;
      if (departmentId) queueMicrotask(() => activate(departmentId, child.dataset.child || child.textContent.trim()));
    }
  });

  window.addEventListener('popstate', routeFromUrl);
  window.SavingioAdminWorkspaceRouter = Object.freeze({ activate, routeFromUrl });
  routeFromUrl();
})();