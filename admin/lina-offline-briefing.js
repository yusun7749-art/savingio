(() => {
  'use strict';

  const ready = callback => document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', callback, { once: true })
    : callback();

  ready(() => {
    const panel = document.getElementById('linaPanel');
    if (!panel || panel.dataset.offlineBriefingBound) return;
    panel.dataset.offlineBriefingBound = 'true';

    const getRows = () => [...document.querySelectorAll('#contentApprovalRows tr[data-path]')];
    const countFailures = rows => rows.filter(row => /미달|❌|B|C|D/.test(row.textContent || '')).length;
    const projectCount = () => document.querySelectorAll('#projectList [data-project-id], #projectList .project-card').length;
    const currentContext = () => {
      const active = document.querySelector('#treeNav .tree-child.active, #treeNav .tree-title.active, #treeNav [aria-current="page"]');
      return String(active?.textContent || document.getElementById('pageTitle')?.textContent || '통합 상황실')
        .replace(/[⌂◫▤▶↗₩✓⚙▥•◇▼▾⌄∨˅]+/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    };

    const ensureOfflineNote = () => {
      if (panel.querySelector('.hq-offline-note')) return;
      const note = document.createElement('p');
      note.className = 'hq-offline-note';
      note.textContent = 'AI 연료 대기 중 · 현재는 Savingio 내부 데이터와 화면 상태를 읽는 오프라인 운영모드입니다.';
      const briefing = panel.querySelector('.hq-briefing');
      if (briefing) briefing.insertAdjacentElement('afterend', note);
      else panel.querySelector('.lina-head')?.insertAdjacentElement('afterend', note);
    };

    const ensurePriorityList = () => {
      const briefing = panel.querySelector('.hq-briefing');
      if (!briefing) return null;
      let list = briefing.querySelector('.hq-priority-list');
      if (!list) {
        list = document.createElement('div');
        list.className = 'hq-priority-list';
        briefing.appendChild(list);
      }
      return list;
    };

    const buildPriorities = () => {
      const rows = getRows();
      const failed = countFailures(rows);
      const projects = projectCount();
      const priorities = [];

      if (!rows.length) priorities.push('전체 Doctor 검사를 실행해 현재 콘텐츠 상태를 불러오기');
      else if (failed) priorities.push(`헌법·DNA 확인 필요 글 ${failed}건부터 검토하기`);
      else priorities.push('콘텐츠 미달 표시 없음 · 실제 URL과 배포 상태 점검하기');

      priorities.push(projects ? `진행 중 프로젝트 ${projects}건의 승인·오류 상태 확인하기` : '새 프로젝트보다 기존 운영 항목 정리 우선하기');
      priorities.push('Search Console 색인과 AdSense 승인 준비 상태 확인하기');
      return priorities.slice(0, 3);
    };

    const render = () => {
      panel.dataset.linaMode = 'offline';
      ensureOfflineNote();

      const badge = panel.querySelector('.hq-online');
      if (badge) badge.textContent = 'OFFLINE OPS';

      const small = panel.querySelector('.lina-id small');
      if (small && !/API/.test(small.textContent || '')) small.textContent = 'Savingio 오프라인 운영비서';

      const contextNode = panel.querySelector('[data-hq-context]');
      if (contextNode) contextNode.textContent = currentContext();

      const rows = getRows();
      const failed = countFailures(rows);
      const failedNode = panel.querySelector('[data-hq-failed]');
      const rowsNode = panel.querySelector('[data-hq-rows]');
      if (failedNode) failedNode.textContent = `${failed}건`;
      if (rowsNode) rowsNode.textContent = `${rows.length}건`;

      const list = ensurePriorityList();
      if (list) {
        list.innerHTML = buildPriorities()
          .map((text, index) => `<div class="hq-priority-item"><b>${index + 1}</b><span>${text}</span></div>`)
          .join('');
      }
    };

    render();
    new MutationObserver(() => window.requestAnimationFrame(render)).observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });

    document.addEventListener('click', () => window.setTimeout(render, 80), true);
  });
})();
