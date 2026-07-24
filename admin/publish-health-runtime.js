(() => {
  'use strict';

  function addPanel() {
    if (document.getElementById('publishHealthPanel')) return;
    const host = document.getElementById('contentApprovalCenter');
    if (!host) return;

    const panel = document.createElement('div');
    panel.id = 'publishHealthPanel';
    panel.style.cssText = 'margin:12px 0;padding:12px 14px;border:1px solid #dbe4ee;border-radius:12px;background:#f8fafc;display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap';
    panel.innerHTML = `
      <div style="min-width:260px;flex:1">
        <strong>배포 연결 상태</strong>
        <div id="publishHealthText" style="margin-top:4px;font-size:13px;color:#475569">자동 확인 대기 중</div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button id="publishHealthBtn" class="btn ghost" type="button">읽기 연결 확인</button>
        <button id="publishWriteTestBtn" class="btn primary" type="button">실제 쓰기 테스트</button>
      </div>`;
    const head = host.querySelector('.content-center-head');
    if (head) head.insertAdjacentElement('afterend', panel);
    else host.prepend(panel);

    document.getElementById('publishHealthBtn')?.addEventListener('click', runCheck);
    document.getElementById('publishWriteTestBtn')?.addEventListener('click', runWriteTest);
    runCheck();
  }

  function setBusy(busy, label) {
    const readButton = document.getElementById('publishHealthBtn');
    const writeButton = document.getElementById('publishWriteTestBtn');
    if (readButton) readButton.disabled = busy;
    if (writeButton) writeButton.disabled = busy;
    if (busy && label) {
      if (label === 'read' && readButton) readButton.textContent = '확인 중…';
      if (label === 'write' && writeButton) writeButton.textContent = '실제 테스트 중…';
    } else {
      if (readButton) readButton.textContent = '읽기 연결 확인';
      if (writeButton) writeButton.textContent = '실제 쓰기 테스트';
    }
  }

  function render(result, responseOk) {
    const text = document.getElementById('publishHealthText');
    if (!text) return;
    const c = result.checks || {};
    const lines = [
      `${c.secretAvailable ? '✅' : '❌'} GITHUB_TOKEN`,
      `${c.githubAuthenticated ? '✅' : '❌'} GitHub 인증`,
      `${c.repositoryAccessible ? '✅' : '❌'} savingio 접근`,
      `${c.mainBranchAccessible ? '✅' : '❌'} main 브랜치 접근`
    ];
    if ('writePermission' in c) lines.push(`${c.writePermission ? '✅' : '❌'} main 실제 쓰기`);
    if (result.cleanup?.attempted) lines.push(`${result.cleanup.success ? '✅' : '❌'} 테스트 파일 정리`);
    if (result.writeCommitSha) lines.push(`커밋 ${result.writeCommitSha.slice(0, 10)}`);
    text.textContent = `${lines.join(' · ')}${result.message ? ` — ${result.message}` : result.error ? ` — ${result.error}` : ''}`;
    panelState(responseOk && result.ok);
  }

  async function runCheck() {
    const text = document.getElementById('publishHealthText');
    if (!text) return;
    setBusy(true, 'read');
    text.textContent = 'Cloudflare Secret과 GitHub 읽기 연결을 확인하고 있습니다.';
    try {
      const response = await fetch('/api/admin/publish-health', { cache: 'no-store' });
      const result = await response.json().catch(() => ({}));
      render(result, response.ok);
    } catch (error) {
      text.textContent = `❌ 연결 확인 실패 — ${error.message}`;
      panelState(false);
    } finally {
      setBusy(false);
    }
  }

  async function runWriteTest() {
    const text = document.getElementById('publishHealthText');
    if (!text) return;
    if (!confirm('GitHub main 브랜치에 진단 파일을 실제로 생성한 뒤 즉시 삭제합니다. 이 과정에서 테스트 커밋과 Cloudflare 배포가 발생합니다. 진행할까요?')) return;
    setBusy(true, 'write');
    text.textContent = 'GitHub main 실제 쓰기와 테스트 파일 정리를 실행하고 있습니다.';
    try {
      const response = await fetch('/api/admin/publish-health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'write_test' })
      });
      const result = await response.json().catch(() => ({}));
      render(result, response.ok);
    } catch (error) {
      text.textContent = `❌ 실제 쓰기 테스트 실패 — ${error.message}`;
      panelState(false);
    } finally {
      setBusy(false);
    }
  }

  function panelState(ok) {
    const panel = document.getElementById('publishHealthPanel');
    if (!panel) return;
    panel.style.background = ok ? '#ecfdf3' : '#fff7ed';
    panel.style.borderColor = ok ? '#bbf7d0' : '#fed7aa';
  }

  const observer = new MutationObserver(addPanel);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', addPanel);
  addPanel();
})();
