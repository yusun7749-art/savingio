(() => {
  'use strict';

  const ready = callback => document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', callback, { once: true })
    : callback();

  const safeJson = (value, fallback) => {
    try { return JSON.parse(value); } catch (_) { return fallback; }
  };

  const readJobs = () => {
    const jobs = safeJson(localStorage.getItem('savingio-hq-execution-jobs-v1') || '[]', []);
    return Array.isArray(jobs) ? jobs : [];
  };

  const readProjects = () => document.querySelectorAll('#projectList [data-project-id], #projectList .project-card').length;
  const readContentRows = () => [...document.querySelectorAll('#contentApprovalRows tr[data-path]')];
  const countContentIssues = rows => rows.filter(row => /미달|❌|B|C|D|오류/.test(row.textContent || '')).length;

  const formatTime = value => {
    const date = value ? new Date(value) : new Date();
    if (Number.isNaN(date.getTime())) return '확인 필요';
    return new Intl.DateTimeFormat('ko-KR', { hour: '2-digit', minute: '2-digit' }).format(date);
  };

  const inspectBridge = async () => {
    try {
      if (!window.SavingioExecutionBridge?.capabilities) return null;
      const result = await window.SavingioExecutionBridge.capabilities();
      return result && typeof result === 'object' ? result : null;
    } catch (_) {
      return null;
    }
  };

  const deriveState = ({ jobs, projects, rows, bridge }) => {
    const failedJobs = jobs.filter(job => /failed|blocked|error/.test(String(job.status || job.bridgeStatus || ''))).length;
    const activeJobs = jobs.filter(job => /queued|running|checking|approved/.test(String(job.status || job.bridgeStatus || ''))).length;
    const contentIssues = countContentIssues(rows);
    const bridgeReady = Boolean(bridge?.ok || bridge?.capabilities || bridge?.executable);

    const cards = [
      { key: 'github', name: 'GitHub', level: 'ok', state: 'main 연결', meta: '최근 반영 상태 정상' },
      { key: 'cloudflare', name: 'Cloudflare', level: bridgeReady ? 'ok' : 'warn', state: bridgeReady ? '실행 브리지 연결' : '브리지 확인 필요', meta: bridgeReady ? '관리 API 응답 확인' : '페이지는 운영 중' },
      { key: 'adsense', name: 'AdSense', level: 'warn', state: '심사 상태 확인', meta: '승인 대기 운영 항목' },
      { key: 'search', name: 'Search Console', level: contentIssues ? 'warn' : 'idle', state: contentIssues ? `콘텐츠 점검 ${contentIssues}건` : '색인 상태 확인', meta: rows.length ? `Doctor ${rows.length}건 기준` : 'Doctor 미실행' },
      { key: 'security', name: 'Security', level: document.body.textContent.includes('신뢰된 기기') ? 'ok' : 'warn', state: document.body.textContent.includes('신뢰된 기기') ? '신뢰 기기 활성' : '보안 상태 확인', meta: 'Admin 비공개 운영' },
      { key: 'ai', name: 'AI Engine', level: 'warn', state: 'OFFLINE OPS', meta: 'API 연료 대기 중' }
    ];

    const deductions = cards.reduce((sum, card) => sum + (card.level === 'bad' ? 20 : card.level === 'warn' ? 8 : card.level === 'idle' ? 4 : 0), 0);
    const score = Math.max(0, 100 - deductions - Math.min(20, failedJobs * 4));
    const issue = failedJobs
      ? `실행 대기열 실패·차단 ${failedJobs}건을 먼저 확인하세요.`
      : contentIssues
        ? `헌법·DNA 또는 품질 확인이 필요한 콘텐츠 ${contentIssues}건이 있습니다.`
        : activeJobs
          ? `실행 중이거나 대기 중인 작업 ${activeJobs}건을 추적하고 있습니다.`
          : projects
            ? `진행 프로젝트 ${projects}건의 다음 승인 단계를 확인하세요.`
            : '새 기능보다 현재 운영 상태와 기존 프로젝트 정리를 우선하세요.';

    return { cards, score, issue, failedJobs, activeJobs, contentIssues, projects };
  };

  const mount = () => {
    if (document.getElementById('hqOperationsWall')) return document.getElementById('hqOperationsWall');
    const anchor = document.getElementById('securityNotice') || document.querySelector('.topbar');
    if (!anchor) return null;
    const section = document.createElement('section');
    section.id = 'hqOperationsWall';
    section.className = 'hq-operations-wall';
    section.setAttribute('aria-label', 'Savingio 운영 현황판');
    anchor.insertAdjacentElement('afterend', section);
    return section;
  };

  ready(() => {
    const wall = mount();
    if (!wall) return;
    let bridgeSnapshot = null;
    let rendering = false;
    let renderQueued = false;

    const render = async ({ refreshBridge = false } = {}) => {
      if (rendering) return;
      rendering = true;
      try {
        if (refreshBridge || bridgeSnapshot === null) bridgeSnapshot = await inspectBridge();

        const jobs = readJobs();
        const rows = readContentRows();
        const state = deriveState({ jobs, projects: readProjects(), rows, bridge: bridgeSnapshot });
        wall.innerHTML = `
          <div class="hq-ops-head">
            <div><p class="eyebrow">OPERATIONS WALL</p><h2>Savingio 통합 운영 현황</h2></div>
            <div class="hq-ops-score"><span>운영 Health</span><strong>${state.score}</strong><span>/ 100</span></div>
          </div>
          <div class="hq-ops-grid">
            ${state.cards.map(card => `
              <article class="hq-ops-card" data-ops-key="${card.key}">
                <div class="hq-ops-card-top"><span class="hq-ops-name">${card.name}</span><i class="hq-ops-led ${card.level}" aria-label="${card.level}"></i></div>
                <span class="hq-ops-state">${card.state}</span>
                <span class="hq-ops-meta">${card.meta}</span>
              </article>`).join('')}
          </div>
          <div class="hq-ops-footer">
            <div class="hq-ops-issue"><strong>오늘의 핵심 이슈</strong><span>${state.issue}</span></div>
            <button class="hq-ops-refresh" type="button" data-ops-refresh><strong>상태 새로고침</strong><span>마지막 확인 ${formatTime()}</span></button>
          </div>`;
      } finally {
        rendering = false;
      }
    };

    const scheduleRender = options => {
      if (renderQueued) return;
      renderQueued = true;
      window.requestAnimationFrame(() => {
        renderQueued = false;
        render(options);
      });
    };

    wall.addEventListener('click', event => {
      if (event.target.closest('[data-ops-refresh]')) render({ refreshBridge: true });
    });
    window.addEventListener('savingio:execution-queue-changed', () => scheduleRender());

    const targets = [document.getElementById('projectList'), document.getElementById('contentApprovalRows')].filter(Boolean);
    if (targets.length) {
      const observer = new MutationObserver(() => scheduleRender());
      targets.forEach(target => observer.observe(target, { childList: true, subtree: true, characterData: true }));
    }

    render({ refreshBridge: true });
  });
})();
