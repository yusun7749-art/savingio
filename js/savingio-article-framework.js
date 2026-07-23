(function (global) {
  'use strict';

  const VERSION = '1.0.0';
  const SCRIPT_ROOT = '/js/';
  const DEPENDENCIES = [
    'savingio-platform-registry.js',
    'savingio-platform-data.js',
    'savingio-connection-framework.js'
  ];

  const text = value => String(value == null ? '' : value).trim();
  const tokens = value => text(value)
    .split(/[·,|/›>\-]+|\s{2,}/)
    .map(item => item.trim())
    .filter(item => item.length >= 2);

  function loadScript(file) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src*="${file}"]`);
      if (existing) {
        if (existing.dataset.savingioLoaded === 'true') return resolve();
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = `${SCRIPT_ROOT}${file}?v=${VERSION}`;
      script.defer = true;
      script.addEventListener('load', () => {
        script.dataset.savingioLoaded = 'true';
        resolve();
      }, { once: true });
      script.addEventListener('error', reject, { once: true });
      document.head.appendChild(script);
    });
  }

  function findRailSection(words) {
    const sections = [...document.querySelectorAll('.right-rail .rail-section')];
    return sections.find(section => {
      const value = text(section.textContent);
      return words.some(word => value.includes(word));
    }) || null;
  }

  function ensureSlot(section, name) {
    if (!section) return null;
    let slot = section.querySelector(`[data-savingio-slot="${name}"]`);
    if (!slot) {
      slot = document.createElement('div');
      slot.className = 'savingio-auto-slot';
      slot.dataset.savingioSlot = name;
      const removable = [...section.children].filter(node => !node.matches('span.rail-kicker,h2'));
      removable.forEach(node => node.remove());
      section.appendChild(slot);
    }
    return slot;
  }

  function ensureArticleSlots() {
    ensureSlot(findRailSection(['계산기', '계산해 보기', '점검도구']), 'calculators');
    ensureSlot(findRailSection(['테스트', '게임', 'Lab', '연구실']), 'lab');

    const relatedSections = [...document.querySelectorAll('.right-rail .rail-section')]
      .filter(section => /관련 글|같은 카테고리|함께 볼/.test(text(section.textContent)));
    if (relatedSections[0]) ensureSlot(relatedSections[0], 'related-articles');

    const official = findRailSection(['공식기관', '공식 링크', '확인기관']);
    if (official) ensureSlot(official, 'official-links');
  }

  function readArticleRecord() {
    const canonical = document.querySelector('link[rel="canonical"]')?.href || location.href;
    const title = text(document.querySelector('h1')?.textContent || document.title.replace(/\s*\|\s*Savingio.*$/, ''));
    const description = text(document.querySelector('meta[name="description"]')?.content || document.querySelector('.lead')?.textContent);
    const category = text(document.querySelector('.badge')?.textContent.split('·')[0] || document.querySelector('.breadcrumb a:last-child')?.textContent || '생활정보');
    const pageText = [title, description, text(document.querySelector('.badge')?.textContent)].join(' ');
    const intents = [...new Set(tokens(pageText))].slice(0, 16);

    return {
      id: global.SavingioPlatformRegistry.slugFromUrl(canonical),
      title,
      description,
      url: new URL(canonical, location.origin).pathname,
      category,
      intents,
      keywords: intents,
      calculators: text(document.body.dataset.calculators).split(',').map(item => item.trim()).filter(Boolean),
      labs: text(document.body.dataset.labs).split(',').map(item => item.trim()).filter(Boolean),
      relatedArticles: [...document.querySelectorAll('.related-list a[href*="/articles/"]')]
        .map(link => global.SavingioPlatformRegistry.slugFromUrl(link.getAttribute('href')))
        .filter(Boolean),
      officialLinks: [...document.querySelectorAll('a[data-official-link]')]
        .map(link => ({ title: text(link.textContent), url: link.href }))
    };
  }

  function registerCurrentArticle() {
    const registry = global.SavingioPlatformRegistry;
    if (!registry || !document.querySelector('body.savingio-article-dna, .article-main')) return null;
    const record = readArticleRecord();
    registry.registerArticle(record, { replace: true });
    document.documentElement.dataset.savingioArticleRegistered = record.id;
    return record;
  }

  async function boot() {
    if (!document.querySelector('body.savingio-article-dna, .article-main')) return;
    try {
      for (const dependency of DEPENDENCIES) await loadScript(dependency);
      ensureArticleSlots();
      const article = registerCurrentArticle();
      const result = global.SavingioConnectionFramework?.renderArticleConnections(article?.id);
      document.documentElement.dataset.savingioArticleFramework = result?.mounted ? 'ready' : 'registered';
      global.dispatchEvent?.(new CustomEvent('savingio:article-framework-ready', { detail: { version: VERSION, article, result } }));
    } catch (error) {
      document.documentElement.dataset.savingioArticleFramework = 'error';
      console.error('[Savingio Article Framework]', error);
    }
  }

  global.SavingioArticleFramework = Object.freeze({
    version: VERSION,
    boot,
    ensureArticleSlots,
    registerCurrentArticle,
    readArticleRecord
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})(window);