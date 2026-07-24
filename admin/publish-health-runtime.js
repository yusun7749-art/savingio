(() => {
  'use strict';

  function addPanel() {
    if (document.getElementById('publishHealthPanel')) return;
    const host = document.getElementById('contentApprovalCenter');
    if (!host) return;

    const panel = document.createElement('div');
    panel.id = 'publishHealthPanel';
    panel.style.cssText = 'margin:12px 0;padding:12px 14px;border:1px solid #dbe4ee;border-radius:12px;background:#f8fafc;display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap';
    panel.innerHTML = '<div><strong>배포 연결 상태</strong><div id="publishHealthText" style="margin-top:4px;font-size:13px;color:#475569">자동 확인 대기 중</div></div><button id="publishHealthBtn" class="btn ghost" type="button">연결 상태 확인</button>';
    const head = host.querySelector('.content-center-head');
    if (head) head.insertAdjacentElement('afterend', panel);
    else host.prepend(panel);

    document.getElementById('publishHealthBtn')?.addEventListener('click', runCheck);
    runCheck();
  }

  async function runCheck() {
    const button = document.getElementById('publishHealthBtn');
    const text = document.getElementById('publishHealthText');
    if (!button || !text) return;
    button.disabled = true;
    button.textContent = '확인 중…';
    text.textContent = 'Cloudflare Secret과 GitHub 연결을 확인하고 있습니다.';

    try {
      const response = await fetch('/api/admin/publish-health', { cache: 'no-store' });
      const result = await response.json().catch(() => ({}));
      const c = result.checks || {};
      const lines = [
        `${c.secretAvailable ? '✅' : '❌'} GITHUB_TOKEN`,
        `${c.githubAuthenticated ? '✅' : '❌'} GitHub 인증`,
        `${c.repositoryAccessible ? '✅' : '❌'} savingio 접근`,
        `${c.mainBranchAccessible ? '✅' : '❌'} main 브랜치 접근`
      ];
      text.textContent = `${lines.join(' · ')}${result.message ? ` — ${result.message}` : ''}`;
      panelState(response.ok);
    } catch (error) {
      text.textContent = `❌ 연결 확인 실패 — ${error.message}`;
      panelState(false);
    } finally {
      button.disabled = false;
      button.textContent = '다시 확인';
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
