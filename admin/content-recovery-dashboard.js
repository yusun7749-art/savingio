(() => {
  'use strict';

  const DEFAULT_STATE = {
    version: 'V3.039',
    baselineArticles: 0,
    currentPublishedArticles: 0,
    historicalRemovedOrExcluded: 0,
    historicalClassificationPending: 0,
    rewritten: 0,
    integrated: 0,
    deleted: 0,
    redirected: 0,
    completedUltimate: 0,
    inProgress: 0,
    currentTask: '전체 공개 글 검색 의도·중복·얇은 콘텐츠 전수 분석',
    updatedAt: '2026-07-27 KST'
  };

  const number = value => Number.isFinite(Number(value)) ? Number(value) : 0;
  const format = value => number(value).toLocaleString('ko-KR');

  async function loadState() {
    const [indexResult, stateResult] = await Promise.allSettled([
      fetch('/data/savingio-search-index.json', { cache: 'no-store' }).then(response => {
        if (!response.ok) throw new Error(`search-index ${response.status}`);
        return response.json();
      }),
      fetch('/admin/content-recovery-progress.json', { cache: 'no-store' }).then(response => {
        if (!response.ok) throw new Error(`progress ${response.status}`);
        return response.json();
      })
    ]);

    const progress = stateResult.status === 'fulfilled' ? stateResult.value : DEFAULT_STATE;
    const indexedCurrent = indexResult.status === 'fulfilled'
      ? number(indexResult.value.count || Object.keys(indexResult.value.items || {}).length)
      : 0;
    const current = indexedCurrent || number(progress.currentPublishedArticles);
    const baseline = Math.max(current, number(progress.baselineArticles) || current);
    const historicalRemovedOrExcluded = Math.max(
      0,
      number(progress.historicalRemovedOrExcluded) || baseline - current
    );
    const handled = Math.min(
      baseline,
      number(progress.rewritten) + number(progress.integrated) + number(progress.deleted)
    );
    const rate = baseline > 0 ? Math.round((handled / baseline) * 1000) / 10 : 0;

    return {
      ...DEFAULT_STATE,
      ...progress,
      baseline,
      current,
      historicalRemovedOrExcluded,
      handled,
      rate
    };
  }

  function stat(label, value, tone = '', note = '') {
    return `<article class="recovery-stat ${tone}"><span>${label}</span><strong>${value}</strong>${note ? `<small>${note}</small>` : ''}</article>`;
  }

  function render(data) {
    if (document.getElementById('contentRecoveryDashboard')) return;
    const host = document.querySelector('.main');
    const anchor = document.getElementById('securityNotice') || document.getElementById('stats');
    if (!host || !anchor) return;

    const section = document.createElement('section');
    section.id = 'contentRecoveryDashboard';
    section.className = 'content-recovery-dashboard';
    section.innerHTML = `
      <header class="recovery-head">
        <div>
          <p class="eyebrow">ADSENSE RECOVERY</p>
          <h2>저가치 콘텐츠 해결 진행판</h2>
          <p>${data.currentTask}</p>
        </div>
        <div class="recovery-rate"><strong>${data.rate}%</strong><span>이번 재승인 정비 진행률</span></div>
      </header>
      <div class="recovery-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${data.rate}"><span style="width:${Math.min(100, data.rate)}%"></span></div>
      <div class="recovery-stats">
        ${stat('정비 시작 기준', `${format(data.baseline)}개`, 'total')}
        ${stat('현재 공개 글', `${format(data.current)}개`, 'current')}
        ${stat('기존 감소분', `${format(data.historicalRemovedOrExcluded)}개`, 'history', '통합·삭제·제외 세부 분류 중')}
        ${stat('수정 완료', `${format(data.rewritten)}개`, 'rewrite')}
        ${stat('통합 완료', `${format(data.integrated)}개`, 'merge')}
        ${stat('삭제 완료', `${format(data.deleted)}개`, 'delete')}
        ${stat('301 완료', `${format(data.redirected)}개`, 'redirect')}
      </div>
      <footer class="recovery-foot">
        <span>초고품질 대표글 완료 <strong>${format(data.completedUltimate)}개</strong></span>
        <span>현재 작업 중 <strong>${format(data.inProgress)}개</strong></span>
        <span>분류 대기 <strong>${format(data.historicalClassificationPending)}개</strong></span>
        <span>마지막 갱신 <strong>${data.updatedAt || '-'}</strong></span>
      </footer>`;

    anchor.insertAdjacentElement('afterend', section);
  }

  async function boot() {
    try {
      render(await loadState());
    } catch (error) {
      console.error('[Savingio] content recovery dashboard failed', error);
      render({ ...DEFAULT_STATE, baseline: 0, current: 0, historicalRemovedOrExcluded: 0, handled: 0, rate: 0 });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
