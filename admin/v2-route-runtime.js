(() => {
  'use strict';

  const groups = [
    ['command', '통합운영본부', ['전체 상황', '오늘 작업', '승인 필요', '오류·중지']],
    ['market', '시장·기회분석본부', ['주제 분석', '키워드 조사', '검색의도 분석', '경쟁 글 분석', '신규 가능 여부']],
    ['content', '콘텐츠자산본부', ['전체 글', '헌법·DNA 검사', '기존 글 재작성', 'SEO 자동재작성', '이미지', '내부 링크', '계산기', '콘텐츠 QA']],
    ['duplicate', '중복관리본부', ['중복센터', '통합 후보', '삭제 후보']],
    ['approval', '승인센터', []],
    ['publish', '배포운영본부', ['GitHub', 'Cloudflare', 'Sitemap', 'Search Console', '배포 검증']],
    ['automation', '자동화센터', ['워크플로 관리', '실행 예정', '실행 중', '완료', '실패', '재실행', '긴급 중지']],
    ['analytics', '데이터·분석본부', ['검색 유입', '콘텐츠 성과', '애드센스', '다음 주제']],
    ['system', '시스템관리본부', ['API 연결', 'Publisher LOCK', '보안센터', '백업·기록']]
  ];

  const descriptions = {
    command: '실제 작업·승인·오류 상태를 한곳에서 확인합니다.',
    market: '주제와 키워드의 수요·경쟁·검색의도를 조사합니다.',
    publish: '승인된 결과의 GitHub 반영과 Cloudflare 배포 상태를 관리합니다.',
    automation: '실제 자동화 작업의 실행 상태와 재실행을 관리합니다.',
    analytics: '검색 유입과 콘텐츠·수익 성과를 확인합니다.',
    system: 'API·Publisher LOCK·보안·백업 상태를 관리합니다.'
  };

  const nav = document.getElementById('treeNav');
  const title = document.getElementById('pageTitle');
  const content = document.getElementById('contentApprovalCenter');
  const contentTitle = document.getElementById('contentWorkspaceTitle');
  const contentSubtitle = document.getElementById('contentWorkspaceSubtitle');
  const department = document.getElementById('departmentPanel');
  const departmentTitle = document.getElementById('departmentTitle');
  const departmentSubtitle = document.getElementById('departmentSubtitle');
  const departmentBoard = document.getElementById('departmentBoard');
  const securityNotice = document.getElementById('securityNotice');

  if (!nav || !title || !content || !department) return;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function renderNav(activeGroup, activeTask) {
    nav.innerHTML = groups.map(([id, name, items]) => `
      <section class="tree-group ${id === activeGroup ? 'open' : ''}">
        <button type="button" class="tree-parent ${id === activeGroup && !activeTask ? 'active' : ''}" data-v2-group="${id}">
          <span>${esc(name)}</span>${items.length ? '<span aria-hidden="true">⌄</span>' : ''}
        </button>
        ${items.length ? `<div class="tree-children">${items.map(item => `<button type="button" class="tree-child ${id === activeGroup && item === activeTask ? 'active' : ''}" data-v2-group="${id}" data-v2-task="${esc(item)}">${esc(item)}</button>`).join('')}</div>` : ''}
      </section>`).join('');
  }

  function clickFilter(filter) {
    const button = content.querySelector(`[data-content-filter="${filter}"]`);
    if (button && !button.classList.contains('active')) button.click();
  }

  function showContent(group, task) {
    content.hidden = false;
    department.hidden = true;
    securityNotice.hidden = true;

    let heading = '전체 글 승인 · 헌법/DNA 검사';
    let subtitle = '운영 중인 전체 글을 불러와 품질과 중복 여부를 검사합니다.';
    let filter = 'all';

    if (group === 'approval') {
      heading = '승인센터';
      subtitle = '전체 글의 재작성·보류·승인·숨기기·삭제·발행 요청을 한 화면에서 처리합니다.';
    } else if (group === 'duplicate') {
      heading = task || '중복센터';
      subtitle = '제목·URL·검색의도가 겹치는 글과 통합·삭제 후보를 확인합니다.';
      filter = 'duplicate';
    } else if (['헌법·DNA 검사', '기존 글 재작성', 'SEO 자동재작성', '콘텐츠 QA'].includes(task)) {
      heading = task;
      subtitle = '헌법 미달 글을 찾아 검사하고 재작성 작업으로 연결합니다.';
      filter = 'fail';
    } else if (task) {
      heading = task;
    }

    contentTitle.textContent = heading;
    contentSubtitle.textContent = subtitle;
    clickFilter(filter);
  }

  function showDepartment(group, task) {
    content.hidden = true;
    department.hidden = false;
    securityNotice.hidden = group !== 'system';

    const groupName = groups.find(item => item[0] === group)?.[1] || '운영본부';
    const heading = task || groupName;
    departmentTitle.textContent = heading;
    departmentSubtitle.textContent = descriptions[group] || '';
    departmentBoard.innerHTML = `<div class="v2-empty-workspace"><strong>${esc(heading)}</strong><p>실제 기능이 연결되기 전에는 샘플 프로젝트나 가짜 데이터를 표시하지 않습니다.</p></div>`;
  }

  function route(group = 'content', task = '전체 글') {
    const found = groups.find(item => item[0] === group) || groups.find(item => item[0] === 'content');
    group = found[0];
    if (group === 'approval') task = '';

    title.textContent = task || found[1];
    renderNav(group, task);

    if (['content', 'duplicate', 'approval'].includes(group)) showContent(group, task);
    else showDepartment(group, task);

    const url = new URL(location.href);
    url.search = '';
    url.hash = '';
    url.searchParams.set('group', group);
    if (task) url.searchParams.set('task', task);
    history.replaceState({ group, task }, '', url.pathname + url.search);
  }

  nav.addEventListener('click', event => {
    const target = event.target.closest('[data-v2-group]');
    if (!target) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    route(target.dataset.v2Group, target.dataset.v2Task || '');
  }, true);

  document.getElementById('securityBtn')?.addEventListener('click', () => document.getElementById('securityDialog')?.showModal());
  document.getElementById('emergencyBtn')?.addEventListener('click', () => route('automation', '긴급 중지'));
  document.getElementById('newProjectBtn')?.addEventListener('click', () => route('market', '신규 가능 여부'));

  const params = new URLSearchParams(location.search);
  route(params.get('group') || 'content', params.get('task') || (params.get('group') === 'approval' ? '' : '전체 글'));
})();