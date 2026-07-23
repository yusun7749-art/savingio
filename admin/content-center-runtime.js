(() => {
  if (!document.querySelector('link[href="/admin/content-center.css"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/admin/content-center.css';
    document.head.appendChild(link);
  }

  if (!document.querySelector('link[href="/admin/duplicate-center.css"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/admin/duplicate-center.css';
    document.head.appendChild(link);
  }

  if (!document.querySelector('script[src="/admin/duplicate-center.js"]')) {
    const script = document.createElement('script');
    script.src = '/admin/duplicate-center.js';
    script.defer = true;
    document.body.appendChild(script);
  }

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