(() => {
  function loadStyle(href) {
    if (document.querySelector(`link[href="${href}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }

  function loadScript(src) {
    if (document.querySelector(`script[src="${src}"]`)) return;
    const script = document.createElement('script');
    script.src = src;
    script.defer = true;
    document.body.appendChild(script);
  }

  loadStyle('/admin/content-center.css');
  loadStyle('/admin/duplicate-center.css');
  loadScript('/admin/duplicate-center.js');
  loadScript('/admin/final-approval-runtime.js');
  loadScript('/admin/publish-runtime.js');
  loadScript('/admin/publish-health-runtime.js');

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
