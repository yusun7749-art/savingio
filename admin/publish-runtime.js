(() => {
  'use strict';

  let busy = false;

  function dialog() { return document.getElementById('rewriteReviewDialog'); }
  function meta() { return dialog()?.querySelector('#rewriteReviewMeta')?.textContent || ''; }
  function actionId() { return meta().match(/작업\s+([^\s·]+)/)?.[1] || ''; }
  function state() { return meta().match(/상태\s+([^\s·]+)/)?.[1] || ''; }
  function messageBox() { return dialog()?.querySelector('#rewriteDraftMessage'); }

  function emit(record, status) {
    window.dispatchEvent(new CustomEvent('savingio:content-status-changed', {
      detail: { path: record?.article?.path, status, record }
    }));
  }

  async function run(command, button) {
    const id = actionId();
    if (!id || busy) return;
    const required = command === 'publish' ? 'approved_for_publish' : ['github_committed', 'deployed_verification_failed'];
    const current = state();
    const allowed = Array.isArray(required) ? required.includes(current) : current === required;
    if (!allowed) {
      if (messageBox()) messageBox().textContent = command === 'publish' ? '최종 승인 후에만 GitHub 반영할 수 있습니다.' : 'GitHub 반영 완료 후 실제 URL을 검증할 수 있습니다.';
      return;
    }
    const confirmText = command === 'publish'
      ? '승인된 HTML을 GitHub main의 운영 파일에 반영할까요? 현재 GitHub blob SHA가 일치할 때만 커밋됩니다.'
      : 'Cloudflare 자동배포 결과를 실제 Savingio URL에서 확인할까요?';
    if (!confirm(confirmText)) return;

    busy = true;
    const original = button.textContent;
    button.disabled = true;
    button.textContent = command === 'publish' ? 'GitHub 반영 중…' : '실제 URL 확인 중…';
    if (messageBox()) messageBox().textContent = button.textContent;

    try {
      const response = await fetch('/api/admin/content-publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, actionId: id })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok && response.status !== 202) throw new Error(result.error || '작업에 실패했습니다.');
      if (result.record) {
        const metaEl = dialog().querySelector('#rewriteReviewMeta');
        if (metaEl) metaEl.textContent = `작업 ${result.record.id || id} · 백업 ${result.record.backupId || '없음'} · 상태 ${result.record.state}`;
        emit(result.record, result.status || result.record.nextStatus);
      }
      if (messageBox()) messageBox().textContent = result.message || '작업이 완료되었습니다.';
      refreshButtons();
    } catch (error) {
      if (messageBox()) messageBox().textContent = error.message;
      button.disabled = false;
      button.textContent = original;
    } finally {
      busy = false;
    }
  }

  function ensureButtons() {
    const workspace = dialog()?.querySelector('#rewriteDraftWorkspace article');
    const row = workspace?.querySelector('div > div:last-child');
    if (!row) return;

    if (!dialog().querySelector('#rewritePublishBtn')) {
      const publish = document.createElement('button');
      publish.id = 'rewritePublishBtn';
      publish.type = 'button';
      publish.className = 'btn primary';
      publish.textContent = 'GitHub 운영 반영';
      publish.addEventListener('click', () => run('publish', publish));
      row.appendChild(publish);
    }
    if (!dialog().querySelector('#rewriteVerifyBtn')) {
      const verify = document.createElement('button');
      verify.id = 'rewriteVerifyBtn';
      verify.type = 'button';
      verify.className = 'btn ghost';
      verify.textContent = '실제 URL 검증';
      verify.addEventListener('click', () => run('verify', verify));
      row.appendChild(verify);
    }
    refreshButtons();
  }

  function refreshButtons() {
    const current = state();
    const publish = dialog()?.querySelector('#rewritePublishBtn');
    const verify = dialog()?.querySelector('#rewriteVerifyBtn');
    if (publish) {
      publish.hidden = current !== 'approved_for_publish';
      publish.disabled = busy || current !== 'approved_for_publish';
    }
    if (verify) {
      verify.hidden = !['github_committed', 'deployed_verification_failed', 'deployed_verified'].includes(current);
      verify.disabled = busy || current === 'deployed_verified';
      verify.textContent = current === 'deployed_verified' ? '배포 검증 PASS' : '실제 URL 검증';
    }
  }

  const observer = new MutationObserver(ensureButtons);
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  document.addEventListener('DOMContentLoaded', ensureButtons);
  window.addEventListener('savingio:content-status-changed', refreshButtons);
  ensureButtons();
})();
