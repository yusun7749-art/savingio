(function (global) {
  'use strict';

  const VERSION = '1.0.0';
  const STORE = {
    articles: new Map(),
    calculators: new Map(),
    labs: new Map(),
    relations: new Map()
  };

  const text = value => String(value == null ? '' : value).trim();
  const list = value => Array.isArray(value) ? value.filter(Boolean) : (value ? [value] : []);
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
    if (store.has(record.id) && options.replace !== true) {
      throw new Error(`${type} record already exists: ${record.id}`);
    }
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

  function resolveConnections(idOrUrl) {
    const article = resolveArticle(idOrUrl);
    if (!article) {
      return Object.freeze({ article: null, calculators: [], labs: [], relatedArticles: [], officialLinks: [] });
    }
    return Object.freeze({
      article,
      calculators: article.calculators.map(id => get('calculators', id)).filter(Boolean),
      labs: article.labs.map(id => get('labs', id)).filter(Boolean),
      relatedArticles: article.relatedArticles.map(id => get('articles', id)).filter(Boolean),
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
