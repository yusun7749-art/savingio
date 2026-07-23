(() => {
  const rows = document.getElementById('contentApprovalRows');
  if (!rows) return;

  const LABELS = {
    published: '공개', hold: '보류', approved: '승인', hidden: '숨김', error: '오류',
    rewrite_pending: '수정 대기', hide_pending: '숨김 대기', delete_pending: '삭제 대기'
  };

  const CLASS_NAMES = ['published','hold','approved','hidden','error','rewrite_pending','hide_pending','delete_pending'];

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
    if (!['rewrite','hold','approve','hide','delete'].includes(action) || !path) return false;

    const row = button.closest('tr');
    const title = row?.querySelector('.content-title-cell a')?.textContent?.trim() || path;
    const score = Number(row?.querySelector('td:first-child strong')?.textContent || 0);
    const missingText = row?.querySelector('.audit-detail-btn')?.textContent || '';

    const confirms = {
      rewrite: `${title}\n헌법 자동수정 요청을 등록할까요?\n기존 글은 즉시 덮어쓰지 않고 수정 대기 상태로 보관됩니다.`,
      hide: `${title}\n숨김 요청을 등록할까요?\n최종 승인 전에는 실제 페이지가 숨겨지지 않습니다.`,
      delete: `${title}\n삭제 요청을 등록할까요?\n백업과 최종 승인 전에는 실제 파일이 삭제되지 않습니다.`
    };
    if (confirms[action] && !confirm(confirms[action])) return true;

    setBusy(button, true);
    try {
      const response = await fetch('/api/admin/content-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          article: { path, title, score, missing: missingText ? [missingText] : [] },
          requestedAt: new Date().toISOString()
        })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || '작업 등록에 실패했습니다.');
      setRowStatus(path, result.status);
      alert(result.message || '승인센터 대기열에 등록했습니다.');
    } catch (error) {
      alert(error.message);
    } finally {
      setBusy(button, false);
    }
    return true;
  }

  rows.addEventListener('click', event => {
    const button = event.target.closest('button[data-action]');
    if (!button || button.dataset.action === 'detail') return;
    if (!['rewrite','hold','approve','hide','delete'].includes(button.dataset.action)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    queueAction(button);
  }, true);

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

  let timer = null;
  const observer = new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(restoreServerStatuses, 250);
  });
  observer.observe(rows, { childList: true });
})();
