(() => {
  'use strict';

  function boot() {
    const data = window.SAVINGIO_ADMIN_DATA;
    const nav = document.getElementById('treeNav');
    const main = document.querySelector('main.main');
    const pageTitle = document.getElementById('pageTitle');
    const securityNotice = document.getElementById('securityNotice');
    const stats = document.getElementById('stats');
    const homeWorkspace = document.querySelector('.workspace-grid');
    const contentCenter = document.getElementById('contentApprovalCenter');
    const departmentPanel = document.querySelector('.department-panel');
    const departmentTitle = document.getElementById('departmentTitle');
    const departmentBoard = document.getElementById('departmentBoard');

    if (!data || !nav || !main || !pageTitle || !departmentPanel || !departmentTitle || !departmentBoard) {
      console.error('[Savingio Admin] Department router boot failed: required DOM is missing.');
      return;
    }

    // The department workspace must occupy the main page area, never the page footer.
    // Move both routed workspaces directly below the top bar once and keep one render target.
    const topbar = main.querySelector('.topbar');
    const anchor = topbar?.nextSibling || main.firstChild;
    main.insertBefore(departmentPanel, anchor);
    if (contentCenter) main.insertBefore(contentCenter, departmentPanel.nextSibling);

    const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));

    const statusText = {
      done: '완료', active: '진행 중', wait: '대기', running: '진행 중',
      approval: '승인 대기', error: '오류·중지'
    };

    const columns = {
      market: ['프로젝트', '시장분석 업무', '상태', '진행률', '최근 갱신'],
      content: ['프로젝트', '콘텐츠 업무', '상태', '진행률', '최근 갱신'],
      video: ['프로젝트', '영상·쇼츠 업무', '상태', '진행률', '최근 갱신'],
      social: ['프로젝트', '배포 업무', '상태', '진행률', '최근 갱신'],
      product: ['프로젝트', '상품·수익 업무', '상태', '진행률', '최근 갱신'],
      approval: ['프로젝트', '승인 업무', '상태', '진행률', '최근 갱신'],
      automation: ['프로젝트', '자동화 업무', '상태', '진행률', '최근 갱신'],
      analytics: ['프로젝트', '분석 업무', '상태', '진행률', '최근 갱신'],
      system: ['관리 항목', '연결 대상', '상태', '확인 내용', '작업']
    };

    const keywords = {
      market: ['시장', '분석', '제품 후보', '주제', '경쟁'],
      content: ['글', '본문', '콘텐츠', 'SEO', '이미지', '링크', '계산기', 'QA'],
      video: ['쇼츠', '영상', '대본', '장면', '음성', '자막', '렌더'],
      social: ['YouTube', 'Instagram', 'Threads', 'Facebook', 'Pinterest', '배포', '예약'],
      product: ['상품', '제휴', '클릭', '전환', '수익', '정산'],
      approval: ['승인', '검수', '반려'],
      automation: ['실행', '자동', '워크플로', '중지', '재실행'],
      analytics: ['성과', '유입', '조회', '전환', '추적', '애드센스']
    };

    function projects() {
      try {
        return JSON.parse(localStorage.getItem('savingio-admin-projects') || 'null') || data.projects || [];
      } catch {
        return data.projects || [];
      }
    }

    function hide(element) {
      if (!element) return;
      element.hidden = true;
      element.style.setProperty('display', 'none', 'important');
    }

    function show(element, display = '') {
      if (!element) return;
      element.hidden = false;
      element.style.removeProperty('display');
      if (display) element.style.display = display;
    }

    function hideAllPages() {
      [securityNotice, stats, homeWorkspace, contentCenter, departmentPanel].forEach(hide);
    }

    function setActive(departmentId, childName = '') {
      nav.querySelectorAll('.tree-title,.tree-child').forEach(item => item.classList.remove('active'));
      const title = nav.querySelector(`.tree-title[data-dept="${CSS.escape(departmentId)}"]`);
      title?.classList.add('active');
      title?.closest('.tree-group')?.classList.add('open');
      if (childName) {
        [...(title?.closest('.tree-group')?.querySelectorAll('.tree-child') || [])]
          .find(item => (item.dataset.child || item.textContent.trim()) === childName)
          ?.classList.add('active');
      }
    }

    function stageFor(project, departmentId, childName = '') {
      const stages = Array.isArray(project.stages) ? project.stages : [];
      const exact = childName ? stages.find(([name]) => String(name).includes(childName)) : null;
      if (exact) return exact;
      return stages.find(([name]) => (keywords[departmentId] || []).some(word => String(name).includes(word))) || null;
    }

    function table(tableColumns, rows, empty = '현재 연결된 작업이 없습니다.') {
      const body = rows.length
        ? rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')
        : `<tr><td colspan="${tableColumns.length}" class="content-empty">${esc(empty)}</td></tr>`;
      return `<div class="content-table-wrap"><table class="content-table"><thead><tr>${tableColumns.map(column => `<th>${esc(column)}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table></div>`;
    }

    function projectRows(departmentId, childName = '') {
      return projects().map(project => {
        const stage = stageFor(project, departmentId, childName);
        const state = stage?.[1] || project.status || 'wait';
        return [
          `<strong>${esc(project.title)}</strong><div class="meta">${esc(project.id)} · ${esc(project.category)}</div>`,
          esc(childName || stage?.[0] || '연결 대기'),
          `<span class="status ${esc(state)}">${esc(statusText[state] || project.statusLabel || state)}</span>`,
          `${Number(project.progress || 0)}%`,
          esc(project.updated || '-')
        ];
      });
    }

    function renderHome(childName = '') {
      if (!childName) {
        show(securityNotice);
        show(stats, 'grid');
        show(homeWorkspace, 'grid');
        return;
      }

      if (childName === '전체 진행률') {
        show(stats, 'grid');
        show(homeWorkspace, 'grid');
        return;
      }

      show(departmentPanel);
      departmentTitle.textContent = childName;
      let list = projects();
      if (childName === '오늘 작업') list = list.filter(project => project.status === 'running' || project.stages?.some(stage => stage[1] === 'active'));
      if (childName === '승인 필요') list = list.filter(project => project.status === 'approval' || project.stages?.some(stage => String(stage[0]).includes('승인') && stage[1] !== 'done'));
      if (childName === '오류·중지') list = list.filter(project => project.status === 'error');

      if (childName === '수익 요약') {
        departmentBoard.innerHTML = table(
          ['수익 구분', '연결 상태', '현재 값', '데이터 출처', '다음 작업'],
          [
            ['AdSense', '센터 연결', '실데이터 연결 대기', 'AdSense Center', 'API 확인'],
            ['제휴 수익', '본부 연결', '실데이터 연결 대기', '상품·수익본부', '전환 연결'],
            ['콘텐츠 성과', '파이프라인 연결', `${list.length}개 프로젝트`, '프로젝트 파이프라인', '성과분석 연결']
          ].map(row => row.map(esc))
        );
        return;
      }

      departmentBoard.innerHTML = table(
        ['프로젝트', '상태', '진행률', '현재 단계', '최근 갱신'],
        list.map(project => [
          `<strong>${esc(project.title)}</strong><div class="meta">${esc(project.id)}</div>`,
          `<span class="status ${esc(project.status)}">${esc(project.statusLabel)}</span>`,
          `${Number(project.progress || 0)}%`,
          esc(project.stages?.find(stage => stage[1] === 'active')?.[0] || '-'),
          esc(project.updated || '-')
        ])
      );
    }

    function renderSystem(childName = '') {
      const department = data.departments.find(item => item.id === 'system');
      const items = childName ? [childName] : department.children;
      const definitions = {
        '분류 관리': ['대·중·소분류', 'Savingio 콘텐츠 분류'],
        'API 연결': ['외부 서비스', '연결 상태 점검'],
        'Publisher LOCK': ['pub-7605193583747751', '단일 설정값 검사'],
        GitHub: ['yusun7749-art/savingio', 'main 반영 상태'],
        Cloudflare: ['savingio.com', '배포 상태'],
        '백업·기록': ['MASTER LOG', '운영 기록과 복구점']
      };
      departmentBoard.innerHTML = table(columns.system, items.map(item => [
        esc(item), esc(definitions[item]?.[0] || '-'), '구조 연결됨',
        esc(definitions[item]?.[1] || '-'), '<button class="btn ghost small" type="button">확인</button>'
      ]));
    }

    function renderDepartment(department, childName = '') {
      show(departmentPanel);
      departmentTitle.textContent = childName || `${department.name} 업무 구조`;

      if (department.id === 'system') {
        renderSystem(childName);
        return;
      }

      if (!childName) {
        const allProjects = projects();
        const rows = department.children.map(child => {
          const connected = allProjects.filter(project => stageFor(project, department.id, child));
          const active = connected.filter(project => stageFor(project, department.id, child)?.[1] === 'active').length;
          return [
            `<button class="btn ghost small" type="button" data-route-child="${esc(child)}">${esc(child)}</button>`,
            `${connected.length}건`, `${active}건`, connected.length ? '파이프라인 연결됨' : '구조 준비됨',
            `<button class="btn ghost small" type="button" data-route-child="${esc(child)}">열기</button>`
          ];
        });
        departmentBoard.innerHTML = table(['하위 업무', '연결 프로젝트', '진행 중', '연결 상태', '화면'], rows);
        return;
      }

      departmentBoard.innerHTML = table(columns[department.id] || columns.content, projectRows(department.id, childName));
    }

    function route(departmentId = 'command', childName = '', updateHistory = true) {
      const department = data.departments.find(item => item.id === departmentId) || data.departments[0];
      hideAllPages();
      setActive(department.id, childName);
      pageTitle.textContent = childName || department.name;

      if (department.id === 'command') {
        renderHome(childName);
      } else if (department.id === 'content' && ['기존 글 재작성', '콘텐츠 QA'].includes(childName) && contentCenter) {
        show(contentCenter);
      } else {
        renderDepartment(department, childName);
      }

      if (updateHistory) {
        const url = new URL(location.href);
        url.searchParams.set('dept', department.id);
        childName ? url.searchParams.set('task', childName) : url.searchParams.delete('task');
        history.pushState({ departmentId: department.id, childName }, '', `${url.pathname}${url.search}`);
      }
    }

    // One authoritative tree handler. Capture phase blocks all legacy click handlers.
    nav.addEventListener('click', event => {
      const title = event.target.closest('.tree-title');
      const child = event.target.closest('.tree-child');
      if (!title && !child) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      if (title) {
        route(title.dataset.dept || 'command');
        return;
      }

      const group = child.closest('.tree-group');
      const departmentId = group?.querySelector('.tree-title')?.dataset.dept || 'command';
      route(departmentId, child.dataset.child || child.textContent.trim());
    }, true);

    departmentBoard.addEventListener('click', event => {
      const button = event.target.closest('[data-route-child]');
      if (!button) return;
      const activeDepartment = nav.querySelector('.tree-title.active')?.dataset.dept || 'command';
      route(activeDepartment, button.dataset.routeChild || '');
    });

    window.addEventListener('popstate', event => {
      const params = new URLSearchParams(location.search);
      route(event.state?.departmentId || params.get('dept') || 'command', event.state?.childName || params.get('task') || '', false);
    });

    const params = new URLSearchParams(location.search);
    route(params.get('dept') || 'command', params.get('task') || '', false);
    window.SavingioDepartmentRouter = Object.freeze({ route });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();