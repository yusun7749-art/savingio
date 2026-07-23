(function (global) {
  'use strict';

  const VERSION = '1.0.0';
  const definitions = new Map();
  const text = value => String(value == null ? '' : value).trim();
  const list = value => Array.isArray(value) ? value : [];
  const esc = value => text(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

  function normalize(raw) {
    if (!raw || typeof raw !== 'object') throw new TypeError('Lab definition must be an object');
    const id = text(raw.id);
    if (!id) throw new Error('Lab definition requires id');
    const type = text(raw.type || 'test');
    if (!['test', 'quiz', 'challenge', 'game'].includes(type)) throw new Error(`Unsupported Lab type: ${type}`);
    return Object.freeze({
      ...raw,
      id,
      type,
      title: text(raw.title || id),
      description: text(raw.description),
      category: text(raw.category || '생활 연구실'),
      questions: Object.freeze(list(raw.questions).map(question => Object.freeze({
        ...question,
        id: text(question.id),
        text: text(question.text),
        answers: Object.freeze(list(question.answers).map(answer => Object.freeze({
          ...answer,
          label: text(answer.label),
          score: Number(answer.score || 0),
          value: text(answer.value)
        })))
      }))),
      results: Object.freeze(list(raw.results).map(result => Object.freeze({
        ...result,
        min: Number(result.min || 0),
        max: result.max == null ? Infinity : Number(result.max),
        title: text(result.title),
        description: text(result.description),
        ctaTitle: text(result.ctaTitle),
        ctaUrl: text(result.ctaUrl)
      })))
    });
  }

  function register(raw, options = {}) {
    const definition = normalize(raw);
    if (definitions.has(definition.id) && options.replace !== true) throw new Error(`Lab already exists: ${definition.id}`);
    definitions.set(definition.id, definition);
    global.SavingioPlatformRegistry?.registerLab({
      id: definition.id,
      title: definition.title,
      description: definition.description,
      url: `/lab/${definition.id}.html`,
      category: definition.category,
      intents: definition.intents || [],
      keywords: definition.keywords || []
    }, { replace: true });
    return definition;
  }

  function score(definition, answers) {
    return definition.questions.reduce((total, question) => {
      const answer = question.answers.find(item => item.value === answers[question.id]);
      return total + Number(answer?.score || 0);
    }, 0);
  }

  function resultFor(definition, total) {
    return definition.results.find(result => total >= result.min && total <= result.max) || definition.results.at(-1) || null;
  }

  function render(target, idOrDefinition) {
    const root = typeof target === 'string' ? document.querySelector(target) : target;
    if (!root) return null;
    const definition = typeof idOrDefinition === 'string' ? definitions.get(idOrDefinition) : register(idOrDefinition, { replace: true });
    if (!definition) throw new Error(`Unknown Lab: ${idOrDefinition}`);

    root.dataset.savingioLab = definition.id;
    root.innerHTML = `<section class="savingio-lab-card"><header><span>${esc(definition.category)}</span><h1>${esc(definition.title)}</h1><p>${esc(definition.description)}</p></header><form></form><section class="savingio-lab-result" hidden aria-live="polite"></section></section>`;
    const form = root.querySelector('form');
    definition.questions.forEach((question, index) => {
      const fieldset = document.createElement('fieldset');
      fieldset.innerHTML = `<legend><span>${index + 1}</span>${esc(question.text)}</legend>${question.answers.map(answer => `<label><input type="radio" name="${esc(question.id)}" value="${esc(answer.value)}" required><span>${esc(answer.label)}</span></label>`).join('')}`;
      form.appendChild(fieldset);
    });
    const button = document.createElement('button');
    button.type = 'submit';
    button.textContent = definition.buttonLabel || '결과 확인하기';
    form.appendChild(button);

    form.addEventListener('submit', event => {
      event.preventDefault();
      const answers = Object.fromEntries(new FormData(form).entries());
      const total = score(definition, answers);
      const result = resultFor(definition, total);
      const resultRoot = root.querySelector('.savingio-lab-result');
      resultRoot.hidden = false;
      resultRoot.innerHTML = result ? `<h2>${esc(result.title)}</h2><p>${esc(result.description)}</p>${result.ctaUrl ? `<a href="${esc(result.ctaUrl)}">${esc(result.ctaTitle || '관련 내용 확인하기')}</a>` : ''}` : '<p>결과를 준비 중입니다.</p>';
      resultRoot.scrollIntoView({ behavior: 'smooth', block: 'start' });
      root.dispatchEvent(new CustomEvent('savingio:lab-result', { bubbles: true, detail: { definition, answers, total, result } }));
    });
    return root;
  }

  global.SavingioLabFramework = Object.freeze({
    version: VERSION,
    register,
    registerMany: (items, options) => list(items).map(item => register(item, options)),
    get: id => definitions.get(id) || null,
    getAll: () => Array.from(definitions.values()),
    score,
    resultFor,
    render
  });
  global.dispatchEvent?.(new CustomEvent('savingio:lab-framework-ready', { detail: { version: VERSION } }));
})(window);
