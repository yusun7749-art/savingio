(function (global) {
  'use strict';

  const VERSION = '1.1.0';
  const STORE = {
    articles: new Map(),
    calculators: new Map(),
    labs: new Map(),
    relations: new Map()
  };

  const text = value => String(value == null ? '' : value).trim();
  const list = value => Array.isArray(value) ? value.filter(Boolean) : (value ? [value] : []);
  const normalizeToken = value => text(value).toLowerCase().replace(/[^0-9a-z가-힣]+/gi, '');
  const slugFromUrl = value => text(value)
    .replace(/^https?:\/\/[^/]+/i, '')
    .replace(/[?#].*$/, '')
    .replace(/\/$/, '')
    .split('/')
    .filter(Boolean)
    .pop()
    ?.replace(/\.html$/i, '') || '';

  function normalizeRecord(type, raw) {
    if (!raw || typeof raw !== 'object') throw new TypeError(`${type} record must be an object`);
    const id = text(raw.id || raw.slug || slugFromUrl(raw.url));
    if (!id) throw new Error(`${type} record requires id, slug, or url`);

    return Object.freeze({
      ...raw,
      id,
      slug: text(raw.slug || id),
      title: text(raw.title),
      description: text(raw.description || raw.desc),
      url: text(raw.url),
      category: text(raw.category),
      intents: Object.freeze(list(raw.intents).map(text)),
      keywords: Object.freeze(list(raw.keywords).map(text)),
      calculators: Object.freeze(list(raw.calculators).map(text)),
      labs: Object.freeze(list(raw.labs).map(text)),
      relatedArticles: Object.freeze(list(raw.relatedArticles || raw.related_articles).map(text)),
      officialLinks: Object.freeze(list(raw.officialLinks || raw.official_links))
    });
  }

  function register(type, raw, options = {}) {
    const store = STORE[type];
    if (!store) throw new Error(`Unknown registry type: ${type}`);
    const record = normalizeRecord(type, raw);
    if (store.has(record.id) && options.replace !== true) throw new Error(`${type} record already exists: ${record.id}`);
    store.set(record.id, record);
    return record;
  }

  function registerMany(type, records, options = {}) {
    return list(records).map(record => register(type, record, options));
  }

  function get(type, idOrUrl) {
    const store = STORE[type];
    if (!store) return null;
    const key = text(idOrUrl);
    return store.get(key) || store.get(slugFromUrl(key)) || null;
  }

  function all(type) {
    const store = STORE[type];
    return store ? Array.from(store.values()) : [];
  }

  function resolveArticle(idOrUrl) {
    return get('articles', idOrUrl);
  }

  function tokenSet(record) {
    return new Set([
      record.title,
      record.slug,
      record.category,
      ...record.intents,
      ...record.keywords
    ].map(normalizeToken).filter(Boolean));
  }

  function capabilityScore(article, capability) {
    const articleTokens = tokenSet(article);
    const capabilityTokens = tokenSet(capability);
    let score = 0;
    if (article.category && capability.category && article.category === capability.category) score += 30;
    for (const token of capabilityTokens) {
      if (!token) continue;
      if (articleTokens.has(token)) score += 24;
      else {
        for (const articleToken of articleTokens) {
          if (articleToken.length >= 2 && token.length >= 2 && (articleToken.includes(token) || token.includes(articleToken))) {
            score += 8;
            break;
          }
        }
      }
    }
    return score;
  }

  function recommend(type, article, limit) {
    return all(type)
      .map(record => ({ record, score: capabilityScore(article, record) }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score || a.record.title.localeCompare(b.record.title, 'ko'))
      .slice(0, limit)
      .map(item => item.record);
  }

  function resolveConnections(idOrUrl, options = {}) {
    const article = resolveArticle(idOrUrl);
    if (!article) return Object.freeze({ article: null, calculators: [], labs: [], relatedArticles: [], officialLinks: [] });

    const explicitCalculators = article.calculators.map(id => get('calculators', id)).filter(Boolean);
    const explicitLabs = article.labs.map(id => get('labs', id)).filter(Boolean);
    const explicitRelated = article.relatedArticles.map(id => get('articles', id)).filter(Boolean);

    return Object.freeze({
      article,
      calculators: explicitCalculators.length ? explicitCalculators : recommend('calculators', article, options.calculatorLimit || 3),
      labs: explicitLabs.length ? explicitLabs : recommend('labs', article, options.labLimit || 3),
      relatedArticles: explicitRelated.length ? explicitRelated : recommend('articles', article, options.relatedLimit || 4).filter(item => item.id !== article.id),
      officialLinks: article.officialLinks
    });
  }

  function validate() {
    const errors = [];
    for (const article of all('articles')) {
      for (const id of article.calculators) if (!get('calculators', id)) errors.push(`article:${article.id} missing calculator:${id}`);
      for (const id of article.labs) if (!get('labs', id)) errors.push(`article:${article.id} missing lab:${id}`);
      for (const id of article.relatedArticles) if (!get('articles', id)) errors.push(`article:${article.id} missing related article:${id}`);
    }
    return Object.freeze({ ok: errors.length === 0, errors: Object.freeze(errors) });
  }

  const api = Object.freeze({
    version: VERSION,
    registerArticle: (record, options) => register('articles', record, options),
    registerArticles: (records, options) => registerMany('articles', records, options),
    registerCalculator: (record, options) => register('calculators', record, options),
    registerCalculators: (records, options) => registerMany('calculators', records, options),
    registerLab: (record, options) => register('labs', record, options),
    registerLabs: (records, options) => registerMany('labs', records, options),
    getArticle: id => get('articles', id),
    getCalculator: id => get('calculators', id),
    getLab: id => get('labs', id),
    getAll: all,
    resolveArticle,
    resolveConnections,
    validate,
    slugFromUrl
  });

  global.SavingioPlatformRegistry = api;
  global.dispatchEvent?.(new CustomEvent('savingio:registry-ready', { detail: { version: VERSION } }));
})(window);