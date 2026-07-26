(() => {
  'use strict';

  let activeActionId = '';
  let busy = false;
  const rows = document.getElementById('contentApprovalRows');
  const dialog = document.getElementById('rewriteReviewDialog');

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  }

  function setMessage(text) {
    const target = document.getElementById('rewriteReviewMessage');
    if (target) target.textContent = text;
  }

  function captureActionId() {
    const meta = document.getElementById('rewriteReviewMeta')?.textContent || '';
    const match = meta.match(/(?:작업|ID)\s*([0-9]+-[a-f0-9-]{8,})/i);
    if (match) activeActionId = match[1];
    return activeActionId;
  }

  async function post(url, body) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || result.message || `HTTP ${response.status}`);
    return result;
  }

  function ensureFinalPublishButton() {
    const footer = dialog?.querySelector('.rewrite-review-actions');
    if (!footer || document.getElementById('finalApprovePublishBtn')) return;
    const button = document.createElement('button');
    button.id = 'finalApprovePublishBtn';
    button.type = 'button';
    button.className = 'btn primary';
    button.textContent = '최종 승인 · 자동배포';
    button.hidden = true;
    button.addEventListener('click', finalApproveAndPublish);
    footer.appendChild(button);
  }

  async function refreshFinalButton() {
    ensureFinalPublishButton();
    const button = document.getElementById('finalApprovePublishBtn');
    const actionId = captureActionId();
    if (!button || !actionId) return;
    try {
      const response = await fetch(`/api/admin/content-draft?actionId=${encodeURIComponent(actionId)}`, { cache: 'no-store' });
      const result = await response.json();
      button.hidden = result.record?.state !== 'draft_review_ready';
      if (!button.hidden) button.textContent = '최종 승인 · 자동배포';
    } catch {
      button.hidden = true;
    }
  }

  async function finalApproveAndPublish() {
    if (busy) return;
    const actionId = captureActionId();
    if (!actionId) return setMessage('작업 번호를 확인하지 못했습니다.');
    if (!confirm('헌법 검사를 통과한 초안을 최종 승인하고 GitHub main 반영과 Cloudflare 자동배포를 시작할까요?')) return;

    const button = document.getElementById('finalApprovePublishBtn');
    busy = true;
    button.disabled = true;
    button.textContent = '승인·배포 중…';
    setMessage('최종 승인 검증 후 GitHub main에 반영하고 있습니다.');
    try {
      const approved = await post('/api/admin/content-draft', { command: 'approve_final', actionId });
      window.dispatchEvent(new CustomEvent('savingio:content-status-changed', {
        detail: { path: approved.record?.article?.path, status: approved.status, record: approved.record }
      }));
      const published = await post('/api/admin/content-publish', { command: 'publish', actionId });
      window.dispatchEvent(new CustomEvent('savingio:content-status-changed', {
        detail: { path: published.record?.article?.path, status: published.record?.nextStatus || 'github_committed', record: published.record }
      }));
      setMessage(`${published.message || 'GitHub main 반영 완료'} Cloudflare 자동배포가 시작되었습니다.`);
      button.textContent = 'GitHub 반영 완료';
      button.hidden = true;
    } catch (error) {
      setMessage(`자동배포 중단: ${error.message}`);
      button.disabled = false;
      button.textContent = '최종 승인 · 자동배포';
    } finally {
      busy = false;
    }
  }

  function findNearestRow(sourceRow) {
    const sourceTitle = sourceRow.querySelector('.content-title-cell a')?.textContent?.trim() || '';
    const sourceTokens = new Set(sourceTitle.toLowerCase().replace(/[^0-9a-z가-힣\s]/g, ' ').split(/\s+/).filter(v => v.length > 1));
    let best = null;
    let score = 0;
    [...rows.querySelectorAll('tr[data-path]')].forEach(row => {
      if (row === sourceRow) return;
      const title = row.querySelector('.content-title-cell a')?.textContent?.trim() || '';
      const tokens = new Set(title.toLowerCase().replace(/[^0-9a-z가-힣\s]/g, ' ').split(/\s+/).filter(v => v.length > 1));
      const intersection = [...sourceTokens].filter(token => tokens.has(token)).length;
      const union = new Set([...sourceTokens, ...tokens]).size || 1;
      const current = intersection / union;
      if (current > score) { score = current; best = row; }
    });
    return best;
  }

  async function requestMerge(button) {
    const sourceRow = button.closest('tr[data-path]');
    const targetRow = findNearestRow(sourceRow);
    if (!sourceRow || !targetRow) return alert('통합할 대표 글을 찾지 못했습니다.');
    const article = {
      path: sourceRow.dataset.path,
      title: sourceRow.querySelector('.content-title-cell a')?.textContent?.trim() || sourceRow.dataset.path,
      category: sourceRow.querySelector('td:nth-child(3)')?.textContent?.trim() || '',
      score: Number(sourceRow.querySelector('td:first-child strong')?.textContent || 0),
      missing: []
    };
    const representative = {
      path: targetRow.dataset.path,
      title: targetRow.querySelector('.content-title-cell a')?.textContent?.trim() || targetRow.dataset.path,
      score: Number(targetRow.querySelector('td:first-child strong')?.textContent || 0)
    };
    if (!confirm(`${article.title}\n→ 대표 글: ${representative.title}\n원본 두 글을 백업하고 통합 검토 대기열에 등록할까요?`)) return;
    button.disabled = true;
    button.textContent = '등록 중…';
    try {
      const result = await post('/api/admin/content-action', { action: 'merge', article, representative, requestedAt: new Date().toISOString() });
      const badge = sourceRow.querySelector('.content-status');
      if (badge) badge.textContent = '통합 검토';
      alert(result.message || '통합 검토 대기열에 등록했습니다.');
    } catch (error) {
      alert(error.message);
    } finally {
      button.disabled = false;
      button.textContent = '통합';
    }
  }

  function mountMergeButtons() {
    if (!rows) return;
    [...rows.querySelectorAll('tr[data-path]')].forEach(row => {
      const risk = Number((row.querySelector('.duplicate-risk')?.textContent || '0').replace('%', ''));
      const actions = row.querySelector('.content-actions');
      if (!actions || risk < 35 || actions.querySelector('[data-urgent-action="merge"]')) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.urgentAction = 'merge';
      button.textContent = '통합';
      button.addEventListener('click', event => {
        event.preventDefault();
        event.stopImmediatePropagation();
        requestMerge(button);
      }, true);
      actions.insertBefore(button, actions.firstChild);
    });
  }

  window.addEventListener('savingio:rewrite-review', event => {
    activeActionId = event.detail?.actionId || activeActionId;
    setTimeout(refreshFinalButton, 300);
  });
  window.addEventListener('savingio:content-status-changed', () => setTimeout(refreshFinalButton, 250));
  dialog?.addEventListener('click', () => setTimeout(refreshFinalButton, 250));

  const observer = new MutationObserver(() => {
    mountMergeButtons();
    if (dialog?.open) refreshFinalButton();
  });
  if (rows) observer.observe(rows, { childList: true, subtree: true });
  if (dialog) observer.observe(dialog, { childList: true, subtree: true, attributes: true });
  ensureFinalPublishButton();
  mountMergeButtons();
})();
