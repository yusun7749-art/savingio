(() => {
  'use strict';

  function loadStyle(href) {
    if (document.querySelector(`link[href="${href}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }

  function loadScript(src, key = src) {
    if (document.querySelector(`script[data-savingio-runtime="${key}"]`)) return;
    const script = document.createElement('script');
    script.src = src;
    script.defer = true;
    script.dataset.savingioRuntime = key;
    document.body.appendChild(script);
  }

  loadStyle('/admin/content-center.css');
  loadStyle('/admin/duplicate-center.css');
  loadScript('/admin/duplicate-center.js', 'duplicate-center');
  loadScript('/admin/final-approval-runtime.js', 'final-approval');
  loadScript('/admin/publish-runtime.js', 'publish-runtime');

  function setPanelState(ok) {
    const panel = document.getElementById('publishHealthPanel');
    if (!panel) return;
    panel.style.background = ok ? '#ecfdf3' : '#fff7ed';
    panel.style.borderColor = ok ? '#bbf7d0' : '#fed7aa';
  }

  function formatChecks(result) {
    const c = result.checks || {};
    const items = [
      `${c.secretAvailable ? '✅' : '❌'} GITHUB_TOKEN`,
      `${c.githubAuthenticated ? '✅' : '❌'} GitHub 인증`,
      `${c.repositoryAccessible ? '✅' : '❌'} savingio 접근`,
      `${c.mainBranchAccessible ? '✅' : '❌'} main 브랜치 접근`
    ];
    if ('writePermission' in c) items.push(`${c.writePermission ? '✅' : '❌'} 실제 쓰기 권한`);
    return items.join(' · ');
  }

  async function runReadCheck() {
    const readButton = document.getElementById('publishHealthReadBtn');
    const writeButton = document.getElementById('publishHealthWriteBtn');
    const text = document.getElementById('publishHealthText');
    if (!readButton || !writeButton || !text) return;

    readButton.disabled = true;
    writeButton.disabled = true;
    readButton.textContent = '확인 중…';
    text.textContent = 'Cloudflare Secret과 GitHub 연결을 확인하고 있습니다.';

    try {
      const response = await fetch(`/api/admin/publish-health?t=${Date.now()}`, {
        cache: 'no-store',
        credentials: 'same-origin'
      });
      const result = await response.json().catch(() => ({}));
      text.textContent = `${formatChecks(result)}${result.message ? ` — ${result.message}` : ''}`;
      setPanelState(response.ok && result.ok);
    } catch (error) {
      text.textContent = `❌ 읽기 연결 확인 실패 — ${error.message}`;
      setPanelState(false);
    } finally {
      readButton.disabled = false;
      writeButton.disabled = false;
      readButton.textContent = '읽기 연결 확인';
    }
  }

  async function runWriteCheck() {
    const readButton = document.getElementById('publishHealthReadBtn');
    const writeButton = document.getElementById('publishHealthWriteBtn');
    const text = document.getElementById('publishHealthText');
    if (!readButton || !writeButton || !text) return;

    if (!confirm('GitHub main 브랜치에 진단 파일을 생성한 뒤 즉시 삭제하여 실제 쓰기 권한을 검사합니다. 진행할까요?')) return;

    readButton.disabled = true;
    writeButton.disabled = true;
    writeButton.textContent = '쓰기 검사 중…';
    text.textContent = 'GitHub main 브랜치 실제 쓰기와 테스트 파일 정리를 확인하고 있습니다.';

    try {
      const response = await fetch(`/api/admin/publish-health?t=${Date.now()}`, {
        method: 'POST',
        cache: 'no-store',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'write_test' })
      });
      const result = await response.json().catch(() => ({}));
      const cleanupText = result.cleanup?.attempted
        ? ` · ${result.cleanup.success ? '✅ 테스트 파일 정리' : '❌ 테스트 파일 정리 실패'}`
        : '';
      const commitText = result.writeCommitSha ? ` · 커밋 ${String(result.writeCommitSha).slice(0, 7)}` : '';
      text.textContent = `${formatChecks(result)}${cleanupText}${commitText}${result.message ? ` — ${result.message}` : ''}`;
      setPanelState(response.ok && result.ok && result.cleanup?.success !== false);
    } catch (error) {
      text.textContent = `❌ 실제 쓰기 테스트 실패 — ${error.message}`;
      setPanelState(false);
    } finally {
      readButton.disabled = false;
      writeButton.disabled = false;
      writeButton.textContent = '실제 쓰기 테스트';
    }
  }

  function mountPublishHealth() {
    if (document.getElementById('publishHealthPanel')) return true;
    const host = document.getElementById('contentApprovalCenter');
    const head = host?.querySelector('.content-center-head');
    if (!host || !head) return false;

    const panel = document.createElement('section');
    panel.id = 'publishHealthPanel';
    panel.setAttribute('aria-label', 'GitHub 및 Cloudflare 배포 연결 진단');
    panel.style.cssText = 'margin:12px 0;padding:14px;border:1px solid #dbe4ee;border-radius:12px;background:#f8fafc;display:flex;gap:14px;align-items:center;justify-content:space-between;flex-wrap:wrap';
    panel.innerHTML = `
      <div style="min-width:260px;flex:1">
        <strong>GitHub · Cloudflare 배포 연결 진단</strong>
        <div id="publishHealthText" style="margin-top:5px;font-size:13px;line-height:1.6;color:#475569">자동 확인을 준비하고 있습니다.</div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button id="publishHealthReadBtn" class="btn ghost" type="button">읽기 연결 확인</button>
        <button id="publishHealthWriteBtn" class="btn primary" type="button">실제 쓰기 테스트</button>
      </div>`;

    head.insertAdjacentElement('afterend', panel);
    document.getElementById('publishHealthReadBtn')?.addEventListener('click', runReadCheck);
    document.getElementById('publishHealthWriteBtn')?.addEventListener('click', runWriteCheck);
    runReadCheck();
    return true;
  }

  if (!mountPublishHealth()) {
    const mountObserver = new MutationObserver(() => {
      if (mountPublishHealth()) mountObserver.disconnect();
    });
    mountObserver.observe(document.documentElement, { childList: true, subtree: true });
  }

  function restoreDoctorSummary() {
    const summaryHost = document.getElementById('contentHealthSummary');
    const lastAudit = document.getElementById('contentLastAudit');
    if (!summaryHost) return;
    try {
      const saved = JSON.parse(localStorage.getItem('savingio-doctor-last-summary') || 'null');
      if (!saved || !saved.grades) return;
      summaryHost.innerHTML = `
        <div><span>전체 글</span><strong>${Number(saved.total || 0)}</strong></div>
        <div><span>평균 품질</span><strong>${Number(saved.average || 0)}점</strong></div>
        <div><span>A</span><strong>${Number(saved.grades.A || 0)}</strong></div>
        <div><span>B</span><strong>${Number(saved.grades.B || 0)}</strong></div>
        <div><span>C</span><strong>${Number(saved.grades.C || 0)}</strong></div>
        <div><span>D</span><strong>${Number(saved.grades.D || 0)}</strong></div>`;
      if (lastAudit && saved.auditedAt) {
        lastAudit.textContent = `마지막 검사 ${new Date(saved.auditedAt).toLocaleString('ko-KR')}`;
      }
    } catch {}
  }

  function autoRunDoctor() {
    const auditButton = document.getElementById('runContentAuditBtn');
    if (!auditButton || auditButton.disabled) return;
    const key = `savingio-doctor-autostart:${new Date().toISOString().slice(0, 10)}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
    window.setTimeout(() => {
      if (!auditButton.disabled) auditButton.click();
    }, 1200);
  }

  restoreDoctorSummary();

  const auditButton = document.getElementById('runContentAuditBtn');
  if (!auditButton) return;
  let wasLoading = false;
  const observer = new MutationObserver(() => {
    const loading = auditButton.disabled || /검사 중/.test(auditButton.textContent);
    if (loading) wasLoading = true;
    if (wasLoading && !loading && auditButton.textContent.trim() === '전체 Doctor 검사') {
      wasLoading = false;
      document.querySelector('[data-content-filter].active')?.click();
      document.dispatchEvent(new CustomEvent('savingio:content-audit-complete'));
    }
  });
  observer.observe(auditButton, {
    childList: true,
    characterData: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['disabled']
  });

  autoRunDoctor();
})();