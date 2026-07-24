(() => {
  'use strict';

  const dialog = document.getElementById('rewriteReviewDialog');
  if (!dialog) return;

  const $ = selector => dialog.querySelector(selector);
  let activeId = '';
  let activeRecord = null;
  let busy = false;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));

  function formatNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number.toLocaleString('ko-KR') : '-';
  }

  function setButtonsDisabled(disabled) {
    ['#rewriteApproveBtn', '#rewriteRejectBtn', '#rewriteRegenerateBtn'].forEach(selector => {
      const button = $(selector);
      if (button) button.disabled = disabled;
    });
  }

  function resetDialog() {
    activeRecord = null;
    busy = false;
    $('#rewriteReviewLoading').hidden = false;
    $('#rewriteReviewLoading').textContent = '기존 글 백업과 수정 설계를 불러오고 있습니다.';
    $('#rewriteReviewBody').hidden = true;
    $('#rewriteReviewMessage').textContent = '';
    setButtonsDisabled(false);
  }

  function renderRecord(record) {
    activeRecord = record;
    activeId = record.id || activeId;
    const plan = record.rewritePlan || {};
    const current = plan.current || {};
    const target = plan.target || {};
    const preserve = plan.preserve || {};
    const generation = record.generationRequest || {};

    $('#rewriteReviewTitle').textContent = record.article?.title || '수정 설계 확인';
    $('#rewriteReviewMeta').textContent = `작업 ${record.id || '-'} · 백업 ${record.backupId || '없음'} · 상태 ${record.state || '-'}`;
    $('#rewriteCurrent').innerHTML = `
      <div><dt>현재 점수</dt><dd>${formatNumber(current.score)}점</dd></div>
      <div><dt>현재 본문</dt><dd>${formatNumber(current.textLength)}자</dd></div>
      <div><dt>미달 항목</dt><dd>${formatNumber(current.missing?.length || 0)}개</dd></div>
      <div><dt>원본 백업</dt><dd>${record.safety?.backupCreated ? '완료' : '확인 필요'}</dd></div>`;
    $('#rewriteTarget').innerHTML = `
      <div><dt>예상 목표</dt><dd>${formatNumber(target.expectedScore || 95)}점</dd></div>
      <div><dt>최소 본문</dt><dd>${formatNumber(target.minimumTextLength || 5000)}자</dd></div>
      <div><dt>오른쪽 카드</dt><dd>${formatNumber(target.rightRailCards || 5)}개</dd></div>
      <div><dt>운영 반영</dt><dd>${generation.output?.productionWriteAllowed ? '허용' : '최종 승인 전 차단'}</dd></div>`;
    $('#rewritePreserve').innerHTML = [
      ['URL', preserve.path || record.article?.path],
      ['slug', preserve.slug],
      ['H1', preserve.h1 || record.article?.title],
      ['Canonical', preserve.canonical || '기존값 유지'],
      ['카테고리', preserve.category || '기존값 유지'],
      ['원본 해시', record.sourceHash || '-']
    ].map(([name, value]) => `<div><strong>${esc(name)}</strong><span>${esc(value || '-')}</span></div>`).join('');
    $('#rewriteFlow').innerHTML = (target.requiredFlow || []).map(item => `<li>${esc(item)}</li>`).join('');
    $('#rewriteMissing').innerHTML = (current.missing?.length ? current.missing : ['검사 결과상 별도 미달 항목 없음'])
      .map(item => `<span>${esc(item)}</span>`).join('');

    const messages = {
      review_ready: '원본 백업과 수정 설계가 준비되었습니다. 승인하면 HTML 초안 생성 대기 상태로 이동합니다.',
      generation_approved: '수정 설계가 승인되었습니다. HTML 초안 생성 요청이 준비되었고 운영 글 덮어쓰기는 차단되어 있습니다.',
      rejected: '수정 설계가 반려되어 보류 상태입니다.'
    };
    $('#rewriteReviewMessage').textContent = messages[record.state] || '현재 작업 상태를 확인했습니다.';
    $('#rewriteReviewLoading').hidden = true;
    $('#rewriteReviewBody').hidden = false;

    const locked = !['review_ready', 'generation_approved'].includes(record.state);
    $('#rewriteApproveBtn').disabled = locked || record.state === 'generation_approved';
    $('#rewriteRejectBtn').disabled = record.state === 'rejected';
    $('#rewriteRegenerateBtn').disabled = record.state === 'rejected';
  }

  async function fetchRecord(actionId) {
    const response = await fetch(`/api/admin/content-action?actionId=${encodeURIComponent(actionId)}`, { cache: 'no-store' });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.record) throw new Error(result.error || '수정 설계를 불러오지 못했습니다.');
    return result.record;
  }

  async function openReview(actionId) {
    activeId = actionId;
    resetDialog();
    if (!dialog.open) dialog.showModal();
    try {
      renderRecord(await fetchRecord(actionId));
    } catch (error) {
      $('#rewriteReviewLoading').textContent = error.message;
      setButtonsDisabled(true);
    }
  }

  async function sendCommand(command, button) {
    if (!activeId || !activeRecord || busy) return;
    const confirmText = {
      approve_rewrite: '이 수정 설계를 승인하고 HTML 초안 생성 대기로 이동할까요?',
      reject_rewrite: '이 수정 설계를 반려하고 글을 보류할까요?',
      regenerate_rewrite: '같은 작업 번호를 유지한 채 수정 설계를 다시 만들까요?'
    }[command];
    if (!confirm(confirmText)) return;

    const original = button.textContent;
    busy = true;
    setButtonsDisabled(true);
    button.textContent = '처리 중…';
    try {
      const response = await fetch('/api/admin/content-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, actionId: activeId })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.record) throw new Error(result.error || '검토 결과 저장에 실패했습니다.');
      renderRecord(result.record);
      window.dispatchEvent(new CustomEvent('savingio:content-status-changed', {
        detail: { path: result.record.article?.path, status: result.status, record: result.record }
      }));
      document.dispatchEvent(new CustomEvent('savingio:content-action-recorded', {
        detail: { action: command, article: result.record.article?.path, status: result.status, record: result.record }
      }));
    } catch (error) {
      $('#rewriteReviewMessage').textContent = error.message;
      setButtonsDisabled(false);
    } finally {
      busy = false;
      button.textContent = original;
    }
  }

  window.addEventListener('savingio:rewrite-review', event => {
    if (event.detail?.actionId) openReview(event.detail.actionId);
  });

  dialog.addEventListener('click', event => {
    const button = event.target.closest('#rewriteReviewClose, #rewriteApproveBtn, #rewriteRejectBtn, #rewriteRegenerateBtn');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();

    if (button.id === 'rewriteReviewClose') {
      dialog.close();
      return;
    }
    if (button.id === 'rewriteApproveBtn') sendCommand('approve_rewrite', button);
    if (button.id === 'rewriteRejectBtn') sendCommand('reject_rewrite', button);
    if (button.id === 'rewriteRegenerateBtn') sendCommand('regenerate_rewrite', button);
  }, true);
})();
