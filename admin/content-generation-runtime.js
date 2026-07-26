(() => {
  'use strict';

  const dialog = document.getElementById('rewriteReviewDialog');
  if (!dialog) return;

  let activeActionId = '';
  let busy = false;

  function ensureButton() {
    const actions = dialog.querySelector('.rewrite-review-actions');
    if (!actions || document.getElementById('rewriteAiGenerateBtn')) return;
    const button = document.createElement('button');
    button.id = 'rewriteAiGenerateBtn';
    button.type = 'button';
    button.className = 'btn primary';
    button.textContent = 'SEO 조사 · 헌법 글 자동생성';
    button.hidden = true;
    actions.insertBefore(button, actions.firstChild);
    button.addEventListener('click', generate);
  }

  function sync(record) {
    ensureButton();
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

  async function generate() {
    if (!activeActionId || busy) return;
    if (!confirm('현재 글의 검색 의도를 조사하고 Savingio 헌법에 맞는 완성 HTML 초안을 자동 생성할까요?')) return;

    const button = document.getElementById('rewriteAiGenerateBtn');
    const message = dialog.querySelector('#rewriteDraftMessage') || dialog.querySelector('#rewriteReviewMessage');
    busy = true;
    if (button) { button.disabled = true; button.textContent = 'SEO 조사·글 생성·검수 중…'; }
    if (message) message.textContent = '최신 검색 정보 조사 → 헌법 HTML 생성 → 자동 검수를 진행하고 있습니다.';

    try {
      const response = await fetch('/api/admin/content-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionId: activeActionId })
      });
      const result = await response.json().catch(() => ({}));
      if (![201, 422].includes(response.status) || !result.record) throw new Error(result.error || 'AI 초안 생성에 실패했습니다.');

      const editor = dialog.querySelector('#rewriteDraftEditor');
      if (editor && result.html) editor.value = result.html;
      if (message) message.textContent = result.message || 'AI 초안 생성과 검수가 완료되었습니다.';

      window.dispatchEvent(new CustomEvent('savingio:content-status-changed', {
        detail: { path: result.record.article?.path, status: result.status, record: result.record }
      }));
      window.dispatchEvent(new CustomEvent('savingio:rewrite-review', {
        detail: { actionId: activeActionId, result }
      }));
    } catch (error) {
      if (message) message.textContent = `자동 생성 실패: ${error.message}`;
      alert(error.message);
    } finally {
      busy = false;
      if (button) { button.disabled = false; button.textContent = 'SEO 조사 · 헌법 글 자동생성'; }
      try { sync(await loadRecord(activeActionId)); } catch {}
    }
  }

  window.addEventListener('savingio:rewrite-review', async event => {
    const actionId = event.detail?.actionId;
    if (!actionId) return;
    activeActionId = actionId;
    ensureButton();
    try { sync(event.detail?.result?.record || await loadRecord(actionId)); } catch {}
  });

  const observer = new MutationObserver(() => ensureButton());
  observer.observe(dialog, { childList: true, subtree: true });
  ensureButton();
})();
