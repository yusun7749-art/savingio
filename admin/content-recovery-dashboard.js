(() => {
  'use strict';

  const DEFAULT_STATE = {
    version: 'V3.040',
    baselineArticles: 0,
    verifiedSitemapArticles: 0,
    searchIndexArticles: 0,
    indexDiscrepancy: 0,
    historicalRemovedOrExcluded: 0,
    historicalClassificationPending: 0,
    redirectRulesTotal: 0,
    articleRelatedRedirectRules: 0,
    rewritten: 0,
    integrated: 0,
    deleted: 0,
    redirected: 0,
    completedUltimate: 0,
    inProgress: 0,
    replacementPaused: true,
    currentTask: '전체 사이트 재검수',
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
    const liveIndexCount = indexResult.status === 'fulfilled'
      ? number(indexResult.value.count || Object.keys(indexResult.value.items || {}).length)
      : 0;
    const sitemapCurrent = number(progress.verifiedSitemapArticles);
    const indexCount = liveIndexCount || number(progress.searchIndexArticles);
    const baseline = Math.max(sitemapCurrent, number(progress.baselineArticles) || sitemapCurrent);
    const removed = Math.max(0, number(progress.historicalRemovedOrExcluded) || baseline - sitemapCurrent);
    const discrepancy = Math.max(0, number(progress.indexDiscrepancy) || indexCount - sitemapCurrent);
    const handled = Math.min(
      baseline,
      number(progress.rewritten) + number(progress.integrated) + number(progress.deleted)
    );
    const rate = baseline > 0 ? Math.round((handled / baseline) * 1000) / 10 : 0;

    return {
      ...DEFAULT_STATE,
      ...progress,
      baseline,
      current: sitemapCurrent,
      indexCount,
      discrepancy,
      removed,
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
          <p class="eyebrow">ADSENSE RECOVERY · FULL AUDIT</p>
          <h2>저가치 콘텐츠 해결 진행판</h2>
          <p>${data.currentTask}</p>
        </div>
        <div class="recovery-rate"><strong>${data.rate}%</strong><span>교체 작업 진행률</span></div>
      </header>
      <div class="recovery-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${data.rate}"><span style="width:${Math.min(100, data.rate)}%"></span></div>
      <div class="recovery-stats">
        ${stat('초기 검증 기준', `${format(data.baseline)}개`, 'total')}
        ${stat('현재 운영 글', `${format(data.current)}개`, 'current', 'sitemap의 /articles/ URL 기준')}
        ${stat('검색 인덱스', `${format(data.indexCount)}개`, 'history', `운영 글보다 ${format(data.discrepancy)}개 많음`)}
        ${stat('기존 감소분', `${format(data.removed)}개`, 'history', '통합·삭제·제외 이력 재검수 중')}
        ${stat('수정 완료', `${format(data.rewritten)}개`, 'rewrite')}
        ${stat('통합 완료', `${format(data.integrated)}개`, 'merge')}
        ${stat('삭제 완료', `${format(data.deleted)}개`, 'delete')}
        ${stat('301 확정', `${format(data.redirected)}개`, 'redirect')}
      </div>
      <footer class="recovery-foot">
        <span>전체 301 규칙 <strong>${format(data.redirectRulesTotal)}개</strong></span>
        <span>글 관련 301 규칙 <strong>${format(data.articleRelatedRedirectRules)}개</strong></span>
        <span>이력 분류 대기 <strong>${format(data.historicalClassificationPending)}개</strong></span>
        <span>교체 작업 <strong>${data.replacementPaused ? '일시 중지' : '진행 중'}</strong></span>
        <span>마지막 갱신 <strong>${data.updatedAt || '-'}</strong></span>
      </footer>`;

    anchor.insertAdjacentElement('afterend', section);
  }

  async function boot() {
    try {
      render(await loadState());
    } catch (error) {
      console.error('[Savingio] content recovery dashboard failed', error);
      render({ ...DEFAULT_STATE, baseline: 0, current: 0, indexCount: 0, discrepancy: 0, removed: 0, handled: 0, rate: 0 });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();