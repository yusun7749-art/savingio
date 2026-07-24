(() => {
  'use strict';

  let busy = false;

  function getDialog() {
    return document.getElementById('rewriteReviewDialog');
  }

  function getActionId(dialog) {
    const meta = dialog?.querySelector('#rewriteReviewMeta')?.textContent || '';
    return meta.match(/작업\s+([^\s·]+)/)?.[1] || '';
  }

  function getState(dialog) {
    const meta = dialog?.querySelector('#rewriteReviewMeta')?.textContent || '';
    return meta.match(/상태\s+([^\s·]+)/)?.[1] || '';
  }

  function emitStatus(record, status) {
    window.dispatchEvent(new CustomEvent('savingio:content-status-changed', {
      detail: { path: record?.article?.path, status, record }
    }));
    document.dispatchEvent(new CustomEvent('savingio:content-action-recorded', {
      detail: { action: 'approve_final', article: record?.article?.path, status, record }
    }));
  }

  async function approveFinal(button) {
    const dialog = getDialog();
    const actionId = getActionId(dialog);
    const state = getState(dialog);
    const message = dialog?.querySelector('#rewriteDraftMessage');
    if (!actionId || busy) return;
    if (state !== 'draft_review_ready') {
      if (message) message.textContent = '헌법검사 PASS 상태에서만 최종 승인할 수 있습니다.';
      return;
    }
    if (!confirm('최종 승인하시겠습니까? 승인 직전 운영 원본 충돌과 헌법을 다시 검사한 뒤 운영 반영 대기열에 등록합니다.')) return;

    busy = true;
    const original = button.textContent;
    button.disabled = true;
    button.textContent = '최종 확인 중…';
    if (message) message.textContent = '운영 원본 충돌, 초안 해시, 헌법 검사를 다시 확인하고 있습니다.';

    try {
      const response = await fetch('/api/admin/content-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'approve_final', actionId })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.record) throw new Error(result.error || '최종 승인에 실패했습니다.');

      const meta = dialog.querySelector('#rewriteReviewMeta');
      if (meta) meta.textContent = `작업 ${result.record.id || actionId} · 백업 ${result.record.backupId || '없음'} · 상태 ${result.record.state}`;
      if (message) message.textContent = result.message || '최종 승인과 운영 반영 대기열 등록이 완료되었습니다.';
      const editor = dialog.querySelector('#rewriteDraftEditor');
      const save = dialog.querySelector('#rewriteDraftSaveBtn');
      if (editor) editor.readOnly = true;
      if (save) save.disabled = true;
      button.textContent = '최종 승인 완료';
      button.disabled = true;
      emitStatus(result.record, result.status);
    } catch (error) {
      if (message) message.textContent = error.message;
      button.disabled = false;
      button.textContent = original;
    } finally {
      busy = false;
    }
  }

  function mount() {
    const dialog = getDialog();
    const workspace = dialog?.querySelector('#rewriteDraftWorkspace article');
    const actionRow = workspace?.querySelector('div > div:last-child');
    if (!workspace || !actionRow || dialog.querySelector('#rewriteFinalApproveBtn')) return;

    const button = document.createElement('button');
    button.id = 'rewriteFinalApproveBtn';
    button.className = 'btn primary';
    button.type = 'button';
    button.textContent = '최종 승인 · 반영대기';
    button.addEventListener('click', () => approveFinal(button));
    actionRow.appendChild(button);
  }

  const observer = new MutationObserver(mount);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', mount);
  mount();
})();
