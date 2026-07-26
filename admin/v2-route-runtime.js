(() => {
  'use strict';

  const groups = [
    ['command', '통합운영본부', ['전체 상황', '오늘 작업', '승인 필요', '오류·중지']],
    ['market', '시장·기회분석본부', ['주제 분석', '키워드 조사', '검색의도 분석', '경쟁 글 분석', '신규 가능 여부']],
    ['content', '콘텐츠자산본부', ['전체 글', '헌법·DNA 검사', '기존 글 재작성', 'SEO 자동재작성', '이미지', '내부 링크', '계산기', '콘텐츠 QA']],
    ['duplicate', '중복관리본부', ['중복센터', '제목 중복', 'URL 중복', '검색의도 중복', '통합 후보', '삭제 후보']],
    ['approval', '승인센터', []],
    ['publish', '배포운영본부', ['GitHub', 'Cloudflare', 'Sitemap', 'Search Console', '배포 검증']],
    ['automation', '자동화센터', ['워크플로 관리', '실행 예정', '실행 중', '완료', '실패', '재실행', '긴급 중지']],
    ['analytics', '데이터·분석본부', ['검색 유입', '콘텐츠 성과', '애드센스', '다음 주제']],
    ['system', '시스템관리본부', ['API 연결', 'Publisher LOCK', '보안센터', '백업·기록']]
  ];

  const nav = document.getElementById('treeNav');
  const title = document.getElementById('pageTitle');
  const stats = document.getElementById('stats');
  const workspace = document.querySelector('.workspace-grid');
  const content = document.getElementById('contentApprovalCenter');
  const department = document.querySelector('.department-panel');
  const securityNotice = document.getElementById('securityNotice');

  if (!nav || !title || !content) return;

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

  function setVisible(element, visible) {
    if (element) element.hidden = !visible;
  }

  function setContentHeading(group, task) {
    const eyebrow = content.querySelector('.content-center-head .eyebrow');
    const heading = content.querySelector('.content-center-head h2');
    const subtitle = content.querySelector('.content-subtitle');

    if (group === 'approval') {
      if (eyebrow) eyebrow.textContent = 'Savingio 통합 승인센터';
      if (heading) heading.textContent = '전체 승인 작업판';
      if (subtitle) subtitle.textContent = '글·재작성·통합·삭제·발행 대상을 한 목록에서 검토하고 승인합니다.';
      return;
    }

    if (group === 'duplicate') {
      if (eyebrow) eyebrow.textContent = 'Savingio 중복관리본부';
      if (heading) heading.textContent = task || '중복센터';
      if (subtitle) subtitle.textContent = '제목·URL·검색의도 중복과 통합·삭제 후보를 확인합니다.';
      return;
    }

    if (eyebrow) eyebrow.textContent = 'Savingio 콘텐츠자산본부';
    if (heading) heading.textContent = task || '전체 글 승인 · 헌법/DNA 검사';
    if (subtitle) subtitle.textContent = '운영 중인 전체 글을 불러와 품질과 중복 여부를 검사합니다.';
  }

  function applyContentFilter(group, task) {
    const map = {
      '전체 글': 'all',
      '헌법·DNA 검사': 'fail',
      '기존 글 재작성': 'fail',
      'SEO 자동재작성': 'fail',
      '콘텐츠 QA': 'fail',
      '중복센터': 'duplicate',
      '제목 중복': 'duplicate',
      'URL 중복': 'duplicate',
      '검색의도 중복': 'duplicate',
      '통합 후보': 'duplicate',
      '삭제 후보': 'duplicate'
    };
    const filter = group === 'approval' ? 'all' : (map[task] || 'all');
    const button = content.querySelector(`[data-content-filter="${filter}"]`);
    if (button) button.click();
  }

  function renderPlaceholder(group, task) {
    const board = document.getElementById('departmentBoard');
    const heading = document.getElementById('departmentTitle');
    if (!board || !heading) return;
    const groupName = groups.find(item => item[0] === group)?.[1] || '운영본부';
    heading.textContent = task || groupName;
    board.innerHTML = `<div class="v2-empty-workspace"><strong>${esc(task || groupName)}</strong><p>이 화면에는 해당 본부 기능만 연결합니다. 기존 /admin은 수정하지 않고 필요한 기능만 V2로 복사합니다.</p></div>`;
  }

  function route(group = 'command', task = '') {
    const isContent = group === 'content' || group === 'duplicate' || group === 'approval';
    const isCommand = group === 'command';

    title.textContent = task || groups.find(item => item[0] === group)?.[1] || '통합운영본부';
    renderNav(group, task);

    setVisible(stats, isCommand);
    setVisible(workspace, isCommand);
    setVisible(content, isContent);
    setVisible(department, !isCommand && !isContent);
    setVisible(securityNotice, group === 'system' || isCommand);

    if (isContent) {
      setContentHeading(group, task);
      applyContentFilter(group, task || (group === 'duplicate' ? '중복센터' : '전체 글'));
      content.scrollIntoView({ block: 'start' });
    } else if (!isCommand) {
      renderPlaceholder(group, task);
    }

    const url = new URL(location.href);
    url.searchParams.set('group', group);
    if (task) url.searchParams.set('task', task); else url.searchParams.delete('task');
    history.replaceState({ group, task }, '', url.pathname + url.search);
  }

  nav.addEventListener('click', event => {
    const target = event.target.closest('[data-v2-group]');
    if (!target) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    route(target.dataset.v2Group, target.dataset.v2Task || '');
  }, true);

  const params = new URLSearchParams(location.search);
  route(params.get('group') || 'content', params.get('task') || '전체 글');
})();