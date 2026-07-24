(() => {
  'use strict';

  const dialog = document.getElementById('rewriteReviewDialog');
  if (!dialog) return;

  const $ = selector => dialog.querySelector(selector);
  let activeId = '';
  let activeRecord = null;
  let activeDraft = null;
  let busy = false;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));

  function formatNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number.toLocaleString('ko-KR') : '-';
  }

  function ensureDraftWorkspace() {
    if ($('#rewriteDraftWorkspace')) return;
    const body = $('#rewriteReviewBody');
    const section = document.createElement('section');
    section.id = 'rewriteDraftWorkspace';
    section.hidden = true;
    section.innerHTML = `
      <article class="review-card" style="margin-top:16px">
        <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap">
          <div><h3 style="margin:0 0 6px">HTML 초안 작업판</h3><p class="meta" id="rewriteDraftMeta">초안을 불러오는 중입니다.</p></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn ghost" id="rewriteDraftPreviewBtn" type="button">미리보기</button>
            <button class="btn primary" id="rewriteDraftSaveBtn" type="button">저장 · 헌법검사</button>
          </div>
        </div>
        <textarea id="rewriteDraftEditor" spellcheck="false" placeholder="완성된 HTML 초안을 여기에 붙여 넣으세요." style="width:100%;min-height:360px;margin-top:12px;padding:14px;border:1px solid #d8dee9;border-radius:12px;font:13px/1.55 ui-monospace,SFMono-Regular,Consolas,monospace;resize:vertical;box-sizing:border-box"></textarea>
        <div id="rewriteDraftValidation" style="margin-top:12px"></div>
        <p id="rewriteDraftMessage" class="review-message"></p>
      </article>`;
    body.appendChild(section);

    $('#rewriteDraftSaveBtn').addEventListener('click', saveDraft);
    $('#rewriteDraftPreviewBtn').addEventListener('click', previewDraft);
  }

  function setButtonsDisabled(disabled) {
    ['#rewriteApproveBtn', '#rewriteRejectBtn', '#rewriteRegenerateBtn', '#rewriteDraftSaveBtn', '#rewriteDraftPreviewBtn'].forEach(selector => {
      const button = $(selector);
      if (button) button.disabled = disabled;
    });
  }

  function resetDialog() {
    activeRecord = null;
    activeDraft = null;
    busy = false;
    ensureDraftWorkspace();
    $('#rewriteReviewLoading').hidden = false;
    $('#rewriteReviewLoading').textContent = '기존 글 백업과 수정 설계를 불러오고 있습니다.';
    $('#rewriteReviewBody').hidden = true;
    $('#rewriteReviewMessage').textContent = '';
    $('#rewriteDraftWorkspace').hidden = true;
    $('#rewriteDraftEditor').value = '';
    $('#rewriteDraftValidation').innerHTML = '';
    $('#rewriteDraftMessage').textContent = '';
    setButtonsDisabled(false);
  }

  function validationLabel(key) {
    return ({
      sourceHashMatchesBackup: '원본 백업 해시 일치',
      urlUnchanged: 'URL 보존',
      h1Unchanged: 'H1 보존',
      canonicalUnchanged: 'Canonical 보존',
      publisherLockPass: '애드센스 Publisher LOCK',
      minimumTextLengthPass: '최소 본문 분량',
      requiredFlowPass: '헌법 필수 흐름',
      rightRailExactlyFive: '오른쪽 카드 5개',
      htmlDocumentPass: 'HTML 문서 구조'
    })[key] || key;
  }

  function renderValidation(validation) {
    const box = $('#rewriteDraftValidation');
    if (!validation) {
      box.innerHTML = '<p class="meta">아직 헌법 검사를 실행하지 않았습니다.</p>';
      return;
    }
    const checks = Object.entries(validation.checks || {});
    const metrics = validation.metrics || {};
    box.innerHTML = `
      <div class="review-safety-banner" style="background:${validation.pass ? '#ecfdf3' : '#fff7ed'};color:${validation.pass ? '#166534' : '#9a3412'}">
        ${validation.pass ? 'PASS · 최종 승인 가능한 초안입니다.' : 'FIX · 미달 항목을 수정한 뒤 다시 검사하세요.'}
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:8px;margin-top:10px">
        ${checks.map(([key, pass]) => `<div style="padding:10px;border:1px solid #e5e7eb;border-radius:10px"><strong>${pass ? '✅' : '❌'} ${esc(validationLabel(key))}</strong></div>`).join('')}
      </div>
      <p class="meta" style="margin-top:10px">본문 ${formatNumber(metrics.textLength)}자 · 오른쪽 카드 ${formatNumber(metrics.rightRailCards)}개 · H1 ${esc(metrics.h1 || '-')}</p>`;
  }

  function showDraftWorkspace(record, draft) {
    const allowed = ['generation_approved', 'draft_validation_failed', 'draft_review_ready', 'final_approval_pending'].includes(record.state);
    $('#rewriteDraftWorkspace').hidden = !allowed;
    if (!allowed) return;

    activeDraft = draft || null;
    $('#rewriteDraftEditor').value = draft?.html || '';
    $('#rewriteDraftMeta').textContent = draft
      ? `저장됨 ${draft.submittedAt || '-'} · HTML 해시 ${draft.htmlHash?.slice(0, 12) || '-'} · 운영 반영 차단`
      : '저장된 초안이 없습니다. HTML을 입력한 뒤 저장 · 헌법검사를 실행하세요.';
    renderValidation(draft?.validation);
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
      generation_approved: '수정 설계가 승인되었습니다. 아래 HTML 초안 작업판에서 초안을 저장하고 헌법검사할 수 있습니다.',
      draft_validation_failed: 'HTML 초안이 저장되었지만 헌법검사에 실패했습니다. 아래 미달 항목을 수정하세요.',
      draft_review_ready: 'HTML 초안 저장과 헌법검사가 완료되었습니다. 운영 글에는 아직 반영되지 않았습니다.',
      rejected: '수정 설계가 반려되어 보류 상태입니다.'
    };
    $('#rewriteReviewMessage').textContent = messages[record.state] || '현재 작업 상태를 확인했습니다.';
    $('#rewriteReviewLoading').hidden = true;
    $('#rewriteReviewBody').hidden = false;

    const planLocked = !['review_ready', 'generation_approved'].includes(record.state);
    $('#rewriteApproveBtn').disabled = planLocked || record.state === 'generation_approved';
    $('#rewriteApproveBtn').hidden = !['review_ready', 'generation_approved'].includes(record.state);
    $('#rewriteRejectBtn').disabled = record.state === 'rejected';
    $('#rewriteRegenerateBtn').disabled = record.state === 'rejected';
  }

  async function fetchRecord(actionId) {
    const response = await fetch(`/api/admin/content-action?actionId=${encodeURIComponent(actionId)}`, { cache: 'no-store' });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.record) throw new Error(result.error || '수정 설계를 불러오지 못했습니다.');
    return result.record;
  }

  async function fetchDraft(actionId) {
    const response = await fetch(`/api/admin/content-draft?actionId=${encodeURIComponent(actionId)}`, { cache: 'no-store' });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'HTML 초안을 불러오지 못했습니다.');
    return result;
  }

  async function openReview(actionId) {
    activeId = actionId;
    resetDialog();
    if (!dialog.open) dialog.showModal();
    try {
      const record = await fetchRecord(actionId);
      renderRecord(record);
      if (['generation_approved', 'draft_validation_failed', 'draft_review_ready', 'final_approval_pending'].includes(record.state)) {
        const draftResult = await fetchDraft(actionId);
        activeRecord = draftResult.record || record;
        showDraftWorkspace(activeRecord, draftResult.draft);
      }
    } catch (error) {
      $('#rewriteReviewLoading').hidden = false;
      $('#rewriteReviewLoading').textContent = error.message;
      setButtonsDisabled(true);
    }
  }

  async function saveDraft() {
    if (!activeId || !activeRecord || busy) return;
    const html = $('#rewriteDraftEditor').value;
    if (html.trim().length < 1000) {
      $('#rewriteDraftMessage').textContent = 'HTML 초안이 너무 짧습니다. 완성된 문서를 입력하세요.';
      return;
    }

    busy = true;
    setButtonsDisabled(true);
    $('#rewriteDraftMessage').textContent = '초안 저장과 헌법검사를 실행하고 있습니다.';
    try {
      const response = await fetch('/api/admin/content-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'submit_draft', actionId: activeId, html })
      });
      const result = await response.json().catch(() => ({}));
      if (![201, 422].includes(response.status) || !result.record) throw new Error(result.error || 'HTML 초안 저장에 실패했습니다.');
      activeRecord = result.record;
      activeDraft = { ...(activeDraft || {}), ...(result.draft || {}), html, validation: result.draft?.validation };
      renderRecord(result.record);
      showDraftWorkspace(result.record, activeDraft);
      $('#rewriteDraftMessage').textContent = result.message || '검사가 완료되었습니다.';
      window.dispatchEvent(new CustomEvent('savingio:content-status-changed', {
        detail: { path: result.record.article?.path, status: result.status, record: result.record }
      }));
    } catch (error) {
      $('#rewriteDraftMessage').textContent = error.message;
    } finally {
      busy = false;
      setButtonsDisabled(false);
    }
  }

  function previewDraft() {
    const html = $('#rewriteDraftEditor').value;
    if (!html.trim()) {
      $('#rewriteDraftMessage').textContent = '미리볼 HTML 초안이 없습니다.';
      return;
    }
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const preview = window.open(url, '_blank', 'noopener');
    if (!preview) $('#rewriteDraftMessage').textContent = '팝업이 차단되었습니다. 브라우저에서 팝업을 허용하세요.';
    setTimeout(() => URL.revokeObjectURL(url), 60000);
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
      if (result.record.state === 'generation_approved') showDraftWorkspace(result.record, null);
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