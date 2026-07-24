(() => {
  'use strict';

  const rows = document.getElementById('contentApprovalRows');
  if (!rows) return;

  const LABELS = {
    published: '공개', hold: '보류', approved: '승인', hidden: '숨김', error: '오류',
    rewrite_pending: '수정 대기', rewrite_review: '설계 검토', rewrite_generation_pending: '초안 생성 대기',
    generation_approved: '초안 생성 승인', draft_review_ready: '초안 검토', final_approval_pending: '최종 승인 대기',
    approved_for_publish: '운영 반영 대기', publishing: 'GitHub 반영 중', github_committed: 'GitHub 반영 완료',
    deployed_verification_failed: '배포 확인 대기', deployed_verified: '배포 검증 PASS', publish_failed: '배포 실패',
    regeneration_pending: '설계 재생성', hide_pending: '숨김 대기', delete_pending: '삭제 대기',
    merge_review: '통합 검토', delete_review: '삭제 검토'
  };
  const CLASS_NAMES = Object.keys(LABELS);

  function setRowStatus(path, status) {
    const row = [...rows.querySelectorAll('tr[data-path]')].find(item => item.dataset.path === path);
    if (!row) return;
    const badge = row.querySelector('.content-status');
    if (!badge) return;
    CLASS_NAMES.forEach(name => badge.classList.remove(`status-${name}`));
    badge.classList.add(`status-${status}`);
    badge.textContent = LABELS[status] || status;
    localStorage.setItem(`savingio-content-status:${path}`, status);
  }

  function setBusy(button, busy, text = '') {
    if (!button) return;
    if (busy) {
      button.dataset.originalText = button.textContent;
      button.disabled = true;
      button.textContent = text || '등록 중…';
    } else {
      button.disabled = false;
      button.textContent = button.dataset.originalText || button.textContent;
    }
  }

  async function queueAction(button) {
    const action = button.dataset.action;
    const path = button.dataset.path;
    if (!['rewrite', 'hold', 'approve', 'hide', 'delete'].includes(action) || !path) return false;
    const row = button.closest('tr');
    const title = row?.querySelector('.content-title-cell a')?.textContent?.trim() || path;
    const category = row?.querySelector('td:nth-child(3)')?.textContent?.trim() || '';
    const score = Number(row?.querySelector('td:first-child strong')?.textContent || 0);
    const missingText = row?.querySelector('.audit-detail-btn')?.textContent || '';
    const confirms = {
      rewrite: `${title}\n헌법 자동수정 준비를 시작할까요?\n원본 HTML을 먼저 백업하고 URL·H1·slug를 보존한 수정 설계를 만듭니다.`,
      hide: `${title}\n숨김 요청을 등록할까요?\n최종 승인 전에는 실제 페이지가 숨겨지지 않습니다.`,
      delete: `${title}\n삭제 요청을 등록할까요?\n백업과 최종 승인 전에는 실제 파일이 삭제되지 않습니다.`
    };
    if (confirms[action] && !confirm(confirms[action])) return true;
    setBusy(button, true, action === 'rewrite' ? '백업·설계 중…' : '등록 중…');
    try {
      const response = await fetch('/api/admin/content-action', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, article: { path, title, category, score, missing: missingText ? [missingText] : [] }, requestedAt: new Date().toISOString() })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || '작업 등록에 실패했습니다.');
      setRowStatus(path, result.status);
      if (action === 'rewrite' && result.actionId) window.dispatchEvent(new CustomEvent('savingio:rewrite-review', { detail: { actionId: result.actionId, result } }));
      else alert(result.message || '승인센터 대기열에 등록했습니다.');
    } catch (error) { alert(error.message); }
    finally { setBusy(button, false); }
    return true;
  }

  rows.addEventListener('click', event => {
    const button = event.target.closest('button[data-action]');
    if (!button || button.dataset.action === 'detail' || !['rewrite', 'hold', 'approve', 'hide', 'delete'].includes(button.dataset.action)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    queueAction(button);
  }, true);

  window.addEventListener('savingio:content-status-changed', event => {
    const { path, status } = event.detail || {};
    if (path && status) setRowStatus(path, status);
  });

  async function restoreServerStatuses() {
    const listedRows = [...rows.querySelectorAll('tr[data-path]')];
    await Promise.all(listedRows.map(async row => {
      const path = row.dataset.path;
      try {
        const response = await fetch(`/api/admin/content-action?path=${encodeURIComponent(path)}`, { cache: 'no-store' });
        const result = await response.json();
        if (response.ok && result.ok && result.status) setRowStatus(path, result.status);
      } catch {}
    }));
  }

  function mountPublishHealth() {
    if (document.getElementById('publishHealthPanel')) return;
    const host = document.getElementById('contentApprovalCenter');
    const head = host?.querySelector('.content-center-head');
    if (!head) return;
    const panel = document.createElement('div');
    panel.id = 'publishHealthPanel';
    panel.style.cssText = 'margin:12px 0;padding:12px 14px;border:1px solid #dbe4ee;border-radius:12px;background:#f8fafc;display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap';
    panel.innerHTML = '<div><strong>배포 연결 상태</strong><div id="publishHealthText" style="margin-top:4px;font-size:13px;color:#475569">자동 확인 중</div></div><button id="publishHealthBtn" class="btn ghost" type="button">다시 확인</button>';
    head.insertAdjacentElement('afterend', panel);
    document.getElementById('publishHealthBtn')?.addEventListener('click', runPublishHealth);
    runPublishHealth();
  }

  async function runPublishHealth() {
    const button = document.getElementById('publishHealthBtn');
    const text = document.getElementById('publishHealthText');
    const panel = document.getElementById('publishHealthPanel');
    if (!button || !text || !panel) return;
    button.disabled = true;
    button.textContent = '확인 중…';
    text.textContent = 'Cloudflare Secret과 GitHub 연결을 확인하고 있습니다.';
    try {
      const response = await fetch('/api/admin/publish-health', { cache: 'no-store' });
      const result = await response.json().catch(() => ({}));
      const c = result.checks || {};
      text.textContent = `${c.secretAvailable ? '✅' : '❌'} GITHUB_TOKEN · ${c.githubAuthenticated ? '✅' : '❌'} GitHub 인증 · ${c.repositoryAccessible ? '✅' : '❌'} savingio 접근 · ${c.mainBranchAccessible ? '✅' : '❌'} main 브랜치 접근${result.message ? ` — ${result.message}` : ''}`;
      panel.style.background = response.ok ? '#ecfdf3' : '#fff7ed';
      panel.style.borderColor = response.ok ? '#bbf7d0' : '#fed7aa';
    } catch (error) {
      text.textContent = `❌ 연결 확인 실패 — ${error.message}`;
      panel.style.background = '#fff7ed';
      panel.style.borderColor = '#fed7aa';
    } finally {
      button.disabled = false;
      button.textContent = '다시 확인';
    }
  }

  let timer = null;
  const observer = new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(() => { restoreServerStatuses(); mountPublishHealth(); }, 250);
  });
  observer.observe(rows, { childList: true });
  mountPublishHealth();
})();
