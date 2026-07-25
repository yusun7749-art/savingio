(() => {
  'use strict';

  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const state = { query:'', status:'all', category:'all', priority:'all', sort:'updated-desc', includeArchived:false, selected:'' };
  const labels = {draft:'초안',running:'진행 중',approval:'승인 대기',paused:'중지',error:'오류',done:'완료',archived:'보관'};
  const priorityRank = {urgent:4,high:3,normal:2,low:1};

  function projects() {
    return window.SavingioProject?.list?.({ includeArchived:true }) || [];
  }

  function filtered() {
    const query = state.query.trim().toLocaleLowerCase('ko-KR');
    const items = projects().filter(project => {
      if (!state.includeArchived && project.status === 'archived') return false;
      if (state.status !== 'all' && project.status !== state.status) return false;
      if (state.category !== 'all' && project.category !== state.category) return false;
      if (state.priority !== 'all' && project.priority !== state.priority) return false;
      if (!query) return true;
      const haystack = [project.id, project.title, project.description, project.category, project.type, project.owner, ...(project.tags || [])].join(' ').toLocaleLowerCase('ko-KR');
      return haystack.includes(query);
    });
    return items.sort((a,b) => {
      if (state.sort === 'title-asc') return a.title.localeCompare(b.title, 'ko');
      if (state.sort === 'progress-desc') return Number(b.progress || 0) - Number(a.progress || 0);
      if (state.sort === 'priority-desc') return (priorityRank[b.priority] || 0) - (priorityRank[a.priority] || 0);
      if (state.sort === 'created-desc') return new Date(b.metadata?.createdAt || 0) - new Date(a.metadata?.createdAt || 0);
      return new Date(b.metadata?.updatedAt || 0) - new Date(a.metadata?.updatedAt || 0);
    });
  }

  function ensureToolbar() {
    const panel = $('.main-panel');
    const head = panel?.querySelector('.panel-head');
    if (!panel || !head || $('#projectControlToolbar')) return;
    const toolbar = document.createElement('section');
    toolbar.id = 'projectControlToolbar';
    toolbar.className = 'project-control-toolbar';
    toolbar.innerHTML = `<input id="projectSearchInput" type="search" placeholder="프로젝트명·ID·담당자·태그 검색" aria-label="프로젝트 검색">
      <select id="projectCategorySelect" aria-label="카테고리 필터"><option value="all">전체 카테고리</option></select>
      <select id="projectPrioritySelect" aria-label="우선순위 필터"><option value="all">전체 우선순위</option><option value="urgent">긴급</option><option value="high">높음</option><option value="normal">보통</option><option value="low">낮음</option></select>
      <select id="projectSortSelect" aria-label="정렬"><option value="updated-desc">최근 수정순</option><option value="created-desc">최근 생성순</option><option value="priority-desc">우선순위순</option><option value="progress-desc">진행률순</option><option value="title-asc">이름순</option></select>
      <label class="project-archive-toggle"><input id="projectArchivedToggle" type="checkbox">보관 포함</label>
      <button class="btn ghost small" id="projectFilterReset" type="button">초기화</button>
      <span id="projectResultCount" class="meta"></span>`;
    head.insertAdjacentElement('afterend', toolbar);

    $('#projectSearchInput').addEventListener('input', event => { state.query = event.target.value; render(); });
    $('#projectCategorySelect').addEventListener('change', event => { state.category = event.target.value; render(); });
    $('#projectPrioritySelect').addEventListener('change', event => { state.priority = event.target.value; render(); });
    $('#projectSortSelect').addEventListener('change', event => { state.sort = event.target.value; render(); });
    $('#projectArchivedToggle').addEventListener('change', event => { state.includeArchived = event.target.checked; render(); });
    $('#projectFilterReset').addEventListener('click', () => {
      Object.assign(state, { query:'', status:'all', category:'all', priority:'all', sort:'updated-desc', includeArchived:false });
      $('#projectSearchInput').value = '';
      $('#projectCategorySelect').value = 'all';
      $('#projectPrioritySelect').value = 'all';
      $('#projectSortSelect').value = 'updated-desc';
      $('#projectArchivedToggle').checked = false;
      document.querySelectorAll('.main-panel [data-filter]').forEach(button => button.classList.toggle('active', button.dataset.filter === 'all'));
      render();
    });
  }

  function syncCategories(items) {
    const select = $('#projectCategorySelect');
    if (!select) return;
    const selected = state.category;
    const categories = [...new Set(items.map(item => item.category).filter(Boolean))].sort((a,b) => a.localeCompare(b,'ko'));
    select.innerHTML = '<option value="all">전체 카테고리</option>' + categories.map(value => `<option value="${esc(value)}">${esc(value)}</option>`).join('');
    select.value = categories.includes(selected) ? selected : 'all';
    if (select.value === 'all' && selected !== 'all') state.category = 'all';
  }

  function render() {
    ensureToolbar();
    const all = projects();
    syncCategories(all);
    const items = filtered();
    const list = $('#projectList');
    if (!list) return;
    if (!state.selected || !items.some(item => item.id === state.selected)) state.selected = items[0]?.id || '';
    list.innerHTML = items.length ? items.map(project => `<article class="project-card ${project.id === state.selected ? 'selected' : ''}" data-id="${esc(project.id)}">
      <div class="project-top"><div><div class="project-title">${esc(project.title)}</div><div class="meta">${esc(project.id)} · ${esc(project.category)} · ${esc(project.type)}</div></div><span class="status ${esc(project.status)}">${esc(labels[project.status] || project.status)}</span></div>
      <div class="project-card-tags">${(project.tags || []).slice(0,4).map(tag => `<span>${esc(tag)}</span>`).join('')}</div>
      <div class="progress"><i style="width:${Math.max(0,Math.min(100,Number(project.progress || 0)))}%"></i></div>
      <div class="project-card-foot"><span>진행률 ${Number(project.progress || 0)}%</span><span>${esc(project.owner)} · ${esc(project.priority)}</span></div>
    </article>`).join('') : '<p class="empty">검색 조건에 맞는 프로젝트가 없습니다.</p>';
    $('#projectResultCount').textContent = `${items.length}/${all.length}개 표시`;
    list.querySelectorAll('.project-card').forEach(card => card.addEventListener('click', () => {
      state.selected = card.dataset.id;
      render();
      window.SavingioProjectDetail?.render?.(state.selected);
    }));
    if (state.selected) window.SavingioProjectDetail?.render?.(state.selected);
  }

  function bindStatusFilters() {
    const panel = $('.main-panel');
    panel?.addEventListener('click', event => {
      const button = event.target.closest('[data-filter]');
      if (!button) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      state.status = button.dataset.filter || 'all';
      panel.querySelectorAll('[data-filter]').forEach(item => item.classList.toggle('active', item === button));
      render();
    }, true);
  }

  function boot() {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/admin/os/project-list-control.css';
    document.head.appendChild(link);
    bindStatusFilters();
    render();
    ['savingio:projects-changed','savingio:workflows-changed','savingio:assets-changed','savingio:project-lifecycle'].forEach(name => window.addEventListener(name, render));
    window.SavingioProjectList = Object.freeze({ render, state, results:() => filtered().map(item => item.id) });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();