(() => {
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
    script.onerror = () => {
      if (key !== 'publish-health') return;
      const host = document.getElementById('contentApprovalCenter');
      if (!host || document.getElementById('publishHealthLoadError')) return;
      const error = document.createElement('div');
      error.id = 'publishHealthLoadError';
      error.style.cssText = 'margin:12px 0;padding:12px 14px;border:1px solid #fecaca;border-radius:12px;background:#fef2f2;color:#991b1b';
      error.textContent = '배포 진단 모듈을 불러오지 못했습니다. 새 배포 후 자동으로 다시 시도합니다.';
      host.querySelector('.content-center-head')?.insertAdjacentElement('afterend', error);
    };
    document.body.appendChild(script);
  }

  loadStyle('/admin/content-center.css');
  loadStyle('/admin/duplicate-center.css');
  loadScript('/admin/duplicate-center.js', 'duplicate-center');
  loadScript('/admin/final-approval-runtime.js', 'final-approval');
  loadScript('/admin/publish-runtime.js', 'publish-runtime');
  loadScript('/admin/publish-health-runtime.js?v=20260724-2', 'publish-health');

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
  observer.observe(auditButton, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['disabled'] });
})();