(() => {
  'use strict';

  const data = window.SAVINGIO_ADMIN_DATA || { departments: [], projects: [] };
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

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

  function readProjects() {
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
    url.hash = childName
      ? `view=${encodeURIComponent(departmentId)}&item=${encodeURIComponent(childName)}`
      : `view=${encodeURIComponent(departmentId)}`;
    history.replaceState({ departmentId, childName }, '', url.pathname + url.search + url.hash);
  }

  function statusCounts(list) {
    return list.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, { running:0, approval:0, error:0, done:0 });
  }

  function clearRouteWorkspace() {
    routeWorkspace.replaceChildren();
  }

  function renderCommandHome() {
    hideAll();
    clearRouteWorkspace();
    show(sections.notice);
    show(sections.stats);
    show(sections.projects);
    setTitle('통합 상황실');
  }

  function renderProjectPage(title, list, description) {
    const cards = list.length
      ? list.map(project => `<article class="admin-route-project"><div><strong>${esc(project.title)}</strong><small>${esc(project.id)} · ${esc(project.category)} · ${esc(project.type)}</small></div><span class="status ${esc(project.status)}">${esc(project.statusLabel)}</span><div class="progress"><i style="width:${Number(project.progress || 0)}%"></i></div><small>진행률 ${Number(project.progress || 0)}%</small></article>`).join('')
      : '<p class="admin-route-empty">해당 상태의 프로젝트가 없습니다.</p>';

    routeWorkspace.innerHTML = `<section class="admin-route-panel"><header><p class="eyebrow">COMMAND CENTER</p><h2>${esc(title)}</h2><p>${esc(description)}</p></header><div class="admin-route-projects">${cards}</div></section>`;
  }

  function renderCommandChild(childName) {
    hideAll();
    clearRouteWorkspace();

    const list = readProjects();
    const counts = statusCounts(list);
    const average = list.length
      ? Math.round(list.reduce((sum, item) => sum + Number(item.progress || 0), 0) / list.length)
      : 0;

    if (childName === '전체 진행률') {
      show(sections.stats);
      show(sections.projects);
    } else if (childName === '오늘 작업') {
      renderProjectPage('오늘 작업', list.filter(item => item.status === 'running'), '현재 진행 중인 프로젝트와 활성 작업만 표시합니다.');
    } else if (childName === '승인 필요') {
      renderProjectPage('승인 필요', list.filter(item => item.status === 'approval'), '승인 대기 상태인 프로젝트만 표시합니다.');
    } else if (childName === '오류·중지') {
      renderProjectPage('오류·중지', list.filter(item => item.status === 'error'), '오류 또는 사용자 중지 상태인 프로젝트만 표시합니다.');
    } else if (childName === '수익 요약') {
      routeWorkspace.innerHTML = `<section class="admin-route-panel"><header><p class="eyebrow">COMMAND CENTER</p><h2>수익 요약</h2><p>현재 저장된 운영 데이터만 표시합니다. 실제 클릭·전환·정산 데이터는 아직 연결되지 않았습니다.</p></header><div class="admin-route-metrics"><article><span>전체 프로젝트</span><strong>${list.length}</strong></article><article><span>완료</span><strong>${counts.done || 0}</strong></article><article><span>진행 중</span><strong>${counts.running || 0}</strong></article><article><span>평균 진행률</span><strong>${average}%</strong></article></div><div class="admin-route-note">가짜 수익 수치나 임시 데이터를 표시하지 않습니다. 상품·수익 데이터 연결 후 이 화면에 실제 수익 정보만 추가합니다.</div></section>`;
    }

    setTitle(childName);
  }

  function renderExistingDepartment(department, childName = '') {
    hideAll();
    clearRouteWorkspace();

    if (department.id === 'content' && (!childName || childName === '콘텐츠 QA')) {
      show(sections.content);
      setTitle(childName || department.name);
      return;
    }

    show(sections.legacy);
    const departmentTitle = $('#departmentTitle');
    if (departmentTitle) departmentTitle.textContent = childName ? `${childName} 작업판` : `${department.name} 작업판`;
    setTitle(childName || department.name);
  }

  function activate(departmentId, childName = '', writeUrl = true) {
    const department = data.departments.find(item => item.id === departmentId) || data.departments[0];
    if (!department) return;

    if (department.id === 'command') {
      if (childName) renderCommandChild(childName);
      else renderCommandHome();
    } else {
      renderExistingDepartment(department, childName);
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
    activate(hash.get('view') || 'command', hash.get('item') || '', false);
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