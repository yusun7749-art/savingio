(() => {
  'use strict';

  const data = window.SAVINGIO_ADMIN_DATA;
  const nav = document.getElementById('treeNav');
  const pageTitle = document.getElementById('pageTitle');
  const homeNotice = document.getElementById('securityNotice');
  const homeStats = document.getElementById('stats');
  const homeWorkspace = document.querySelector('.workspace-grid');
  const contentCenter = document.getElementById('contentApprovalCenter');
  const departmentPanel = document.querySelector('.department-panel');
  const departmentTitle = document.getElementById('departmentTitle');
  const departmentBoard = document.getElementById('departmentBoard');

  if (!data || !nav || !pageTitle || !departmentPanel || !departmentTitle || !departmentBoard) return;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));

  const statusText = {
    done: '완료', active: '진행 중', wait: '대기', running: '진행 중',
    approval: '승인 대기', error: '오류·중지'
  };

  const departmentColumns = {
    market: ['프로젝트', '분석 항목', '현재 상태', '진행률', '최근 갱신'],
    content: ['프로젝트', '콘텐츠 작업', '현재 상태', '진행률', '최근 갱신'],
    video: ['프로젝트', '영상 작업', '현재 상태', '진행률', '최근 갱신'],
    social: ['프로젝트', '배포 채널', '현재 상태', '진행률', '최근 갱신'],
    product: ['프로젝트', '상품·수익 작업', '현재 상태', '진행률', '최근 갱신'],
    approval: ['프로젝트', '승인 항목', '현재 상태', '진행률', '최근 갱신'],
    automation: ['프로젝트', '자동화 단계', '현재 상태', '진행률', '최근 갱신'],
    analytics: ['프로젝트', '분석 항목', '현재 상태', '진행률', '최근 갱신'],
    system: ['관리 항목', '연결 대상', '현재 상태', '확인 내용', '작업']
  };

  const stageKeywords = {
    market: ['시장', '분석', '제품 후보', '주제'],
    content: ['글', '본문', '콘텐츠', 'SEO', '이미지', '링크', '계산기', 'QA'],
    video: ['쇼츠', '영상', '대본', '장면', '음성', '자막', '렌더'],
    social: ['YouTube', 'Instagram', 'Threads', 'Facebook', 'Pinterest', '배포', '예약'],
    product: ['상품', '제휴', '클릭', '전환', '수익', '정산'],
    approval: ['승인', '검수', '반려'],
    automation: ['실행', '자동', '워크플로', '중지', '재실행'],
    analytics: ['성과', '유입', '조회', '전환', '추적', '애드센스']
  };

  function readProjects() {
    try {
      return JSON.parse(localStorage.getItem('savingio-admin-projects') || 'null') || data.projects || [];
    } catch {
      return data.projects || [];
    }
  }

  function hideMainAreas() {
    [homeNotice, homeStats, homeWorkspace, contentCenter, departmentPanel].forEach(element => {
      if (element) element.hidden = true;
    });
  }

  function setActive(departmentId, childName = '') {
    nav.querySelectorAll('.tree-title,.tree-child').forEach(item => item.classList.remove('active'));
    const title = nav.querySelector(`.tree-title[data-dept="${CSS.escape(departmentId)}"]`);
    title?.classList.add('active');
    title?.closest('.tree-group')?.classList.add('open');
    if (childName) {
      [...(title?.closest('.tree-group')?.querySelectorAll('.tree-child') || [])]
        .find(item => item.dataset.child === childName)?.classList.add('active');
    }
  }

  function matchingStage(project, departmentId, childName) {
    const stages = Array.isArray(project.stages) ? project.stages : [];
    const direct = stages.find(([name]) => childName && String(name).includes(childName));
    if (direct) return direct;
    const keywords = stageKeywords[departmentId] || [];
    return stages.find(([name]) => keywords.some(keyword => String(name).includes(keyword))) || null;
  }

  function renderTable(columns, rows, emptyMessage = '현재 연결된 작업이 없습니다.') {
    const body = rows.length
      ? rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')
      : `<tr><td colspan="${columns.length}" class="content-empty">${esc(emptyMessage)}</td></tr>`;
    return `<div class="content-table-wrap"><table class="content-table"><thead><tr>${columns.map(column => `<th>${esc(column)}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table></div>`;
  }

  function projectRows(departmentId, childName = '') {
    return readProjects().map(project => {
      const stage = matchingStage(project, departmentId, childName);
      const workName = childName || stage?.[0] || '연결 대기';
      const state = stage?.[1] || project.status || 'wait';
      return [
        `<strong>${esc(project.title)}</strong><div class="meta">${esc(project.id)} · ${esc(project.category)}</div>`,
        esc(workName),
        `<span class="status ${esc(state)}">${esc(statusText[state] || project.statusLabel || state)}</span>`,
        `${Number(project.progress || 0)}%`,
        esc(project.updated || '-')
      ];
    });
  }

  function renderDepartmentRoot(department) {
    const projects = readProjects();
    const rows = department.children.map(child => {
      const connected = projects.filter(project => matchingStage(project, department.id, child));
      const active = connected.filter(project => {
        const stage = matchingStage(project, department.id, child);
        return stage?.[1] === 'active' || project.status === 'running';
      }).length;
      return [
        `<button type="button" class="btn ghost small" data-open-child="${esc(child)}">${esc(child)}</button>`,
        `${connected.length}건`,
        `${active}건`,
        connected.length ? '파이프라인 연결됨' : '구조 준비됨',
        `<button type="button" class="btn ghost small" data-open-child="${esc(child)}">열기</button>`
      ];
    });
    departmentBoard.innerHTML = renderTable(['하위 업무', '연결 프로젝트', '진행 중', '연결 상태', '화면'], rows);
  }

  function renderCommand(childName = '') {
    const projects = readProjects();
    hideMainAreas();
    if (!childName) {
      [homeNotice, homeStats, homeWorkspace].forEach(element => { if (element) element.hidden = false; });
      pageTitle.textContent = '통합 상황실';
      return;
    }

    if (childName === '전체 진행률') {
      [homeStats, homeWorkspace].forEach(element => { if (element) element.hidden = false; });
      return;
    }

    departmentPanel.hidden = false;
    departmentTitle.textContent = childName;
    let filtered = projects;
    if (childName === '승인 필요') filtered = projects.filter(project => project.status === 'approval' || project.stages?.some(stage => String(stage[0]).includes('승인') && stage[1] !== 'done'));
    if (childName === '오류·중지') filtered = projects.filter(project => project.status === 'error');
    if (childName === '오늘 작업') filtered = projects.filter(project => project.status === 'running' || project.stages?.some(stage => stage[1] === 'active'));

    if (childName === '수익 요약') {
      departmentBoard.innerHTML = renderTable(
        ['수익 구분', '연결 상태', '현재 값', '데이터 출처', '다음 작업'],
        [
          ['AdSense', '구조 연결', '실데이터 연결 대기', 'AdSense Center', 'API 연결'],
          ['제휴 수익', '구조 연결', '실데이터 연결 대기', '상품·수익본부', '전환 데이터 연결'],
          ['콘텐츠 성과', '구조 연결', `${projects.length}개 프로젝트`, '프로젝트 파이프라인', '성과분석 연결']
        ].map(row => row.map(esc))
      );
      return;
    }

    departmentBoard.innerHTML = renderTable(
      ['프로젝트', '상태', '진행률', '현재 단계', '최근 갱신'],
      filtered.map(project => {
        const activeStage = project.stages?.find(stage => stage[1] === 'active')?.[0] || '-';
        return [
          `<strong>${esc(project.title)}</strong><div class="meta">${esc(project.id)}</div>`,
          `<span class="status ${esc(project.status)}">${esc(project.statusLabel)}</span>`,
          `${Number(project.progress || 0)}%`, esc(activeStage), esc(project.updated || '-')
        ];
      })
    );
  }

  function renderSystem(childName = '') {
    const items = childName ? [childName] : data.departments.find(item => item.id === 'system').children;
    const definitions = {
      '분류 관리': ['대·중·소분류', 'Savingio 콘텐츠 분류'],
      'API 연결': ['외부 서비스', '연결 상태 점검'],
      'Publisher LOCK': ['pub-7605193583747751', '단일 설정값 검사'],
      'GitHub': ['yusun7749-art/savingio', 'main 반영 상태'],
      'Cloudflare': ['savingio.com', '배포 상태'],
      '백업·기록': ['MASTER LOG', '운영 기록과 복구점']
    };
    departmentBoard.innerHTML = renderTable(
      departmentColumns.system,
      items.map(item => [esc(item), esc(definitions[item]?.[0] || '-'), '구조 연결됨', esc(definitions[item]?.[1] || '-'), '<button class="btn ghost small" type="button">확인</button>'])
    );
  }

  function mount(departmentId, childName = '', updateUrl = true) {
    const department = data.departments.find(item => item.id === departmentId) || data.departments[0];
    hideMainAreas();
    setActive(department.id, childName);
    pageTitle.textContent = childName || department.name;

    if (department.id === 'command') {
      renderCommand(childName);
    } else if (department.id === 'content' && ['기존 글 재작성', '콘텐츠 QA'].includes(childName)) {
      if (contentCenter) contentCenter.hidden = false;
    } else {
      departmentPanel.hidden = false;
      departmentTitle.textContent = childName || `${department.name} 업무 구조`;
      if (department.id === 'system') renderSystem(childName);
      else if (!childName) renderDepartmentRoot(department);
      else departmentBoard.innerHTML = renderTable(departmentColumns[department.id] || departmentColumns.content, projectRows(department.id, childName));
    }

    if (updateUrl) {
      const url = new URL(location.href);
      url.searchParams.set('dept', department.id);
      if (childName) url.searchParams.set('task', childName); else url.searchParams.delete('task');
      history.pushState({ departmentId: department.id, childName }, '', url.pathname + url.search);
    }
  }

  nav.addEventListener('click', event => {
    const title = event.target.closest('.tree-title');
    const child = event.target.closest('.tree-child');
    if (!title && !child) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (title) {
      mount(title.dataset.dept);
      return;
    }
    const group = child.closest('.tree-group');
    const departmentId = group?.querySelector('.tree-title')?.dataset.dept;
    if (departmentId) mount(departmentId, child.dataset.child || child.textContent.trim());
  }, true);

  departmentBoard.addEventListener('click', event => {
    const button = event.target.closest('[data-open-child]');
    if (!button) return;
    const activeDepartment = nav.querySelector('.tree-title.active')?.dataset.dept;
    if (activeDepartment) mount(activeDepartment, button.dataset.openChild);
  });

  window.addEventListener('popstate', event => {
    const params = new URLSearchParams(location.search);
    mount(event.state?.departmentId || params.get('dept') || 'command', event.state?.childName || params.get('task') || '', false);
  });

  queueMicrotask(() => {
    const params = new URLSearchParams(location.search);
    mount(params.get('dept') || 'command', params.get('task') || '', false);
  });
})();