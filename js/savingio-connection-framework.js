(function (global) {
  'use strict';

  const VERSION = '1.0.0';
  const registry = () => global.SavingioPlatformRegistry;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const currentSlug = () => registry()?.slugFromUrl(location.pathname) || '';

  function linkList(items, emptyText) {
    if (!items.length) return `<p class="savingio-connect-empty">${esc(emptyText)}</p>`;
    return `<ul>${items.map(item => `<li><a href="${esc(item.url)}">${esc(item.title)}</a></li>`).join('')}</ul>`;
  }

  function renderArticleConnections(articleId = currentSlug(), root = document) {
    const api = registry();
    if (!api) return { mounted: false, reason: 'registry-not-ready' };
    const connections = api.resolveConnections(articleId);
    if (!connections.article) return { mounted: false, reason: 'article-not-registered' };

    const calculatorTarget = root.querySelector('[data-savingio-slot="calculators"]');
    if (calculatorTarget) {
      calculatorTarget.innerHTML = linkList(connections.calculators, '이 글에 맞는 계산기를 준비 중입니다.');
      calculatorTarget.dataset.savingioMounted = 'true';
    }

    const labTarget = root.querySelector('[data-savingio-slot="lab"]');
    if (labTarget) {
      labTarget.innerHTML = linkList(connections.labs, '이 글과 연결된 테스트·게임을 준비 중입니다.');
      labTarget.dataset.savingioMounted = 'true';
    }

    const relatedTarget = root.querySelector('[data-savingio-slot="related-articles"]');
    if (relatedTarget) {
      relatedTarget.innerHTML = linkList(connections.relatedArticles, '연결할 다음 글을 준비 중입니다.');
      relatedTarget.dataset.savingioMounted = 'true';
    }

    const officialTarget = root.querySelector('[data-savingio-slot="official-links"]');
    if (officialTarget) {
      officialTarget.innerHTML = linkList(connections.officialLinks.map(item => typeof item === 'string' ? { title: item, url: '#' } : item), '확인할 공식기관 링크가 없습니다.');
      officialTarget.dataset.savingioMounted = 'true';
    }

    root.documentElement?.setAttribute('data-savingio-connections', 'ready');
    root.dispatchEvent?.(new CustomEvent('savingio:connections-mounted', { detail: connections }));
    return { mounted: true, connections };
  }

  function autoMount() {
    const result = renderArticleConnections();
    if (!result.mounted && result.reason === 'registry-not-ready') {
      global.addEventListener('savingio:registry-ready', () => renderArticleConnections(), { once: true });
    }
  }

  global.SavingioConnectionFramework = Object.freeze({
    version: VERSION,
    currentSlug,
    renderArticleConnections,
    autoMount
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', autoMount, { once: true });
  else autoMount();
})(window);
