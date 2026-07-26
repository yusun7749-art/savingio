(() => {
  'use strict';

  const dialog = document.getElementById('rewriteReviewDialog');
  const rows = document.getElementById('contentApprovalRows');
  if (!dialog || !rows) return;

  let activeActionId = '';
  let busy = false;

  async function request(url, body) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok && response.status !== 422) throw new Error(result.error || result.message || `HTTP ${response.status}`);
    return { response, result };
  }

  function ensureDialogButton() {
    const actions = dialog.querySelector('.rewrite-review-actions');
    if (!actions || document.getElementById('rewriteAiGenerateBtn')) return;
    const button = document.createElement('button');
    button.id = 'rewriteAiGenerateBtn';
    button.type = 'button';
    button.className = 'btn primary';
    button.textContent = 'SEO 조사 · 헌법 글 자동생성';
    button.hidden = true;
    actions.insertBefore(button, actions.firstChild);
    button.addEventListener('click', () => generateApprovedAction(activeActionId, button));
  }

  function syncDialog(record) {
    ensureDialogButton();
    const button = document.getElementById('rewriteAiGenerateBtn');
    if (!button || !record) return;
    activeActionId = record.id || activeActionId;
    button.hidden = !['generation_approved', 'draft_validation_failed', 'draft_review_ready'].includes(record.state);
    button.disabled = busy;
  }

  async function loadRecord(actionId) {
    const response = await fetch(`/api/admin/content-action?actionId=${encodeURIComponent(actionId)}`, { cache: 'no-store' });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.record) throw new Error(result.error || '작업 정보를 불러오지 못했습니다.');
    return result.record;
  }

  async function generateApprovedAction(actionId, button) {
    if (!actionId || busy) return;
    const message = dialog.querySelector('#rewriteDraftMessage') || dialog.querySelector('#rewriteReviewMessage');
    busy = true;
    const original = button?.textContent || '';
    if (button) { button.disabled = true; button.textContent = 'SEO 조사·글 생성·검수 중…'; }
    if (message) message.textContent = '최신 검색 정보 조사 → 헌법 HTML 생성 → 자동 검수를 진행하고 있습니다.';
    try {
      const { response, result } = await request('/api/admin/content-generate', { actionId });
      if (![201, 422].includes(response.status) || !result.record) throw new Error(result.error || 'AI 초안 생성에 실패했습니다.');
      const editor = dialog.querySelector('#rewriteDraftEditor');
      if (editor && result.html) editor.value = result.html;
      if (message) message.textContent = result.message || 'AI 초안 생성과 검수가 완료되었습니다.';
      window.dispatchEvent(new CustomEvent('savingio:content-status-changed', { detail: { path: result.record.article?.path, status: result.status, record: result.record } }));
      window.dispatchEvent(new CustomEvent('savingio:rewrite-review', { detail: { actionId, result } }));
    } catch (error) {
      if (message) message.textContent = `자동 생성 실패: ${error.message}`;
      alert(error.message);
    } finally {
      busy = false;
      if (button) { button.disabled = false; button.textContent = original || 'SEO 조사 · 헌법 글 자동생성'; }
      try { syncDialog(await loadRecord(actionId)); } catch {}
    }
  }

  async function oneClickRewrite(button) {
    if (busy) return;
    const row = button.closest('tr[data-path]');
    if (!row) return;
    const article = {
      path: row.dataset.path,
      title: row.querySelector('.content-title-cell a')?.textContent?.trim() || row.dataset.path,
      category: row.querySelector('td:nth-child(3)')?.textContent?.trim() || '',
      score: Number(row.querySelector('td:first-child strong')?.textContent || 0),
      missing: []
    };
    if (!confirm(`${article.title}\n원본 백업 → 수정 설계 승인 → SEO 조사 → 헌법 글 생성 → 자동 검수까지 바로 진행할까요?`)) return;

    busy = true;
    const original = button.textContent;
    button.disabled = true;
    button.textContent = '백업·설계 중…';
    try {
      const prepared = await request('/api/admin/content-action', { action: 'rewrite', article, requestedAt: new Date().toISOString() });
      const actionId = prepared.result.actionId;
      if (!actionId || prepared.result.record?.state !== 'review_ready') throw new Error(prepared.result.error || '재작성 준비에 실패했습니다.');

      button.textContent = '설계 승인 중…';
      const approved = await request('/api/admin/content-action', { command: 'approve_rewrite', actionId });
      if (approved.result.record?.state !== 'generation_approved') throw new Error(approved.result.error || '수정 설계 승인에 실패했습니다.');

      activeActionId = actionId;
      window.dispatchEvent(new CustomEvent('savingio:rewrite-review', { detail: { actionId, result: approved.result } }));
      button.textContent = 'SEO 글 생성 중…';
      await generateApprovedAction(actionId, button);
    } catch (error) {
      alert(`자동재작성 중단: ${error.message}`);
    } finally {
      busy = false;
      button.disabled = false;
      button.textContent = original;
    }
  }

  function mountTableButtons() {
    [...rows.querySelectorAll('tr[data-path]')].forEach(row => {
      const actions = row.querySelector('.content-actions');
      if (!actions || actions.querySelector('[data-auto-rewrite]')) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.autoRewrite = 'true';
      button.className = 'btn primary';
      button.textContent = 'SEO 자동재작성';
      button.addEventListener('click', event => {
        event.preventDefault();
        event.stopImmediatePropagation();
        oneClickRewrite(button);
      }, true);
      actions.insertBefore(button, actions.firstChild);
    });
  }

  window.addEventListener('savingio:rewrite-review', async event => {
    const actionId = event.detail?.actionId;
    if (!actionId) return;
    activeActionId = actionId;
    ensureDialogButton();
    try { syncDialog(event.detail?.result?.record || await loadRecord(actionId)); } catch {}
  });

  const observer = new MutationObserver(() => {
    ensureDialogButton();
    mountTableButtons();
  });
  observer.observe(rows, { childList: true, subtree: true });
  observer.observe(dialog, { childList: true, subtree: true });
  ensureDialogButton();
  mountTableButtons();
})();