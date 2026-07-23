(() => {
  const dialog = document.getElementById('rewriteReviewDialog');
  if (!dialog) return;

  const $ = selector => dialog.querySelector(selector);
  let activeId = '';
  let activeRecord = null;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));

  function formatNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number.toLocaleString('ko-KR') : '-';
  }

  function resetDialog() {
    activeRecord = null;
    $('#rewriteReviewLoading').hidden = false;
    $('#rewriteReviewBody').hidden = true;
    $('#rewriteReviewMessage').textContent = '';
    ['#rewriteApproveBtn','#rewriteRejectBtn','#rewriteRegenerateBtn'].forEach(selector => {
      const button = $(selector);
      button.disabled = false;
    });
  }

  function renderRecord(record) {
    activeRecord = record;
    const plan = record.rewritePlan || {};
    const current = plan.current || {};
    const target = plan.target || {};
    const preserve = plan.preserve || {};

    $('#rewriteReviewTitle').textContent = record.article?.title || '수정 설계 확인';
    $('#rewriteReviewMeta').textContent = `작업 ${record.id} · 백업 ${record.backupId || '없음'} · 상태 ${record.state || '-'}`;
    $('#rewriteCurrent').innerHTML = `
      <div><dt>현재 점수</dt><dd>${formatNumber(current.score)}점</dd></div>
      <div><dt>현재 본문</dt><dd>${formatNumber(current.textLength)}자</dd></div>
      <div><dt>미달 항목</dt><dd>${formatNumber(current.missing?.length || 0)}개</dd></div>
      <div><dt>원본 백업</dt><dd>${record.safety?.backupCreated ? '완료' : '확인 필요'}</dd></div>`;
    $('#rewriteTarget').innerHTML = `
      <div><dt>예상 목표</dt><dd>${formatNumber(target.expectedScore)}점</dd></div>
      <div><dt>최소 본문</dt><dd>${formatNumber(target.minimumTextLength)}자</dd></div>
      <div><dt>오른쪽 카드</dt><dd>${formatNumber(target.rightRailCards)}개</dd></div>
      <div><dt>최종 반영</dt><dd>관리자 승인 후</dd></div>`;
    $('#rewritePreserve').innerHTML = [
      ['URL', preserve.path], ['slug', preserve.slug], ['H1', preserve.h1],
      ['Canonical', preserve.canonical || '기존값 유지'], ['카테고리', preserve.category || '기존값 유지']
    ].map(([name, value]) => `<div><strong>${esc(name)}</strong><span>${esc(value || '-')}</span></div>`).join('');
    $('#rewriteFlow').innerHTML = (target.requiredFlow || []).map(item => `<li>${esc(item)}</li>`).join('');
    $('#rewriteMissing').innerHTML = (current.missing?.length ? current.missing : ['검사 결과상 별도 미달 항목 없음'])
      .map(item => `<span>${esc(item)}</span>`).join('');
    $('#rewriteReviewLoading').hidden = true;
    $('#rewriteReviewBody').hidden = false;
  }

  async function openReview(actionId) {
    activeId = actionId;
    resetDialog();
    dialog.showModal();
    try {
      const response = await fetch(`/api/admin/content-review?id=${encodeURIComponent(actionId)}`, { cache: 'no-store' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.record) throw new Error(result.error || '수정 설계를 불러오지 못했습니다.');
      renderRecord(result.record);
    } catch (error) {
      $('#rewriteReviewLoading').textContent = error.message;
      $('#rewriteApproveBtn').disabled = true;
      $('#rewriteRegenerateBtn').disabled = true;
    }
  }

  async function decide(decision, button) {
    if (!activeId || !activeRecord) return;
    const confirmText = {
      approve_plan: '이 수정 설계를 승인하고 실제 AI 본문 생성 대기로 이동할까요?',
      reject_plan: '이 수정 설계를 반려하고 글을 보류할까요?',
      regenerate_plan: '현재 설계를 폐기하고 다시 설계하도록 요청할까요?'
    }[decision];
    if (!confirm(confirmText)) return;

    const original = button.textContent;
    button.disabled = true;
    button.textContent = '처리 중…';
    try {
      const response = await fetch('/api/admin/content-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: activeId, decision })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || '검토 결과 저장에 실패했습니다.');
      $('#rewriteReviewMessage').textContent = result.message;
      window.dispatchEvent(new CustomEvent('savingio:content-status-changed', {
        detail: { path: activeRecord.article.path, status: result.status }
      }));
      setTimeout(() => dialog.close(), 900);
    } catch (error) {
      $('#rewriteReviewMessage').textContent = error.message;
      button.disabled = false;
      button.textContent = original;
    }
  }

  window.addEventListener('savingio:rewrite-review', event => {
    if (event.detail?.actionId) openReview(event.detail.actionId);
  });

  $('#rewriteReviewClose').addEventListener('click', () => dialog.close());
  $('#rewriteApproveBtn').addEventListener('click', event => decide('approve_plan', event.currentTarget));
  $('#rewriteRejectBtn').addEventListener('click', event => decide('reject_plan', event.currentTarget));
  $('#rewriteRegenerateBtn').addEventListener('click', event => decide('regenerate_plan', event.currentTarget));
})();