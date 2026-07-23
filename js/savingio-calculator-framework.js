(function (global) {
  'use strict';

  const VERSION = '1.0.0';
  const handlers = new Map();
  const definitions = new Map();
  const number = value => Number(String(value ?? '').replace(/,/g, '')) || 0;
  const money = value => new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(number(value));

  function registerHandler(name, handler) {
    if (!name || typeof handler !== 'function') throw new TypeError('Formula handler requires name and function');
    handlers.set(String(name), handler);
  }

  registerHandler('sum', ({ values, fields }) => fields.reduce((total, key) => total + number(values[key]), 0));
  registerHandler('difference', ({ values, fields }) => number(values[fields[0]]) - number(values[fields[1]]));
  registerHandler('multiply', ({ values, fields }) => fields.reduce((total, key) => total * number(values[key]), 1));
  registerHandler('percentage', ({ values, base, rate }) => number(values[base]) * number(values[rate]) / 100);
  registerHandler('annualize', ({ values, field, periods = 12 }) => number(values[field]) * number(periods));
  registerHandler('savings', ({ values, before, after }) => Math.max(0, number(values[before]) - number(values[after]));

  function normalizeDefinition(raw) {
    if (!raw || typeof raw !== 'object') throw new TypeError('Calculator definition must be an object');
    const id = String(raw.id || '').trim();
    if (!id) throw new Error('Calculator definition requires id');
    const inputs = Array.isArray(raw.inputs) ? raw.inputs : [];
    if (!inputs.length) throw new Error(`Calculator ${id} requires inputs`);
    if (!raw.formula || !raw.formula.type) throw new Error(`Calculator ${id} requires formula.type`);
    return Object.freeze({
      ...raw,
      id,
      title: String(raw.title || id),
      description: String(raw.description || ''),
      inputs: Object.freeze(inputs.map(input => Object.freeze({
        type: 'number',
        min: 0,
        step: 1,
        ...input,
        id: String(input.id || '').trim(),
        label: String(input.label || input.id || '').trim()
      }))),
      formula: Object.freeze({ ...raw.formula }),
      result: Object.freeze({
        label: '계산 결과',
        unit: '원',
        format: 'money',
        ...raw.result
      })
    });
  }

  function register(definition, options = {}) {
    const normalized = normalizeDefinition(definition);
    if (definitions.has(normalized.id) && options.replace !== true) throw new Error(`Calculator already exists: ${normalized.id}`);
    definitions.set(normalized.id, normalized);
    return normalized;
  }

  function calculate(idOrDefinition, values) {
    const definition = typeof idOrDefinition === 'string' ? definitions.get(idOrDefinition) : normalizeDefinition(idOrDefinition);
    if (!definition) throw new Error(`Unknown calculator: ${idOrDefinition}`);
    const handler = handlers.get(definition.formula.type);
    if (!handler) throw new Error(`Unknown formula handler: ${definition.formula.type}`);
    const value = handler({ values: values || {}, ...definition.formula });
    return Object.freeze({ value: number(value), definition, values: Object.freeze({ ...(values || {}) }) });
  }

  function formatResult(calculation) {
    const { value, definition } = calculation;
    if (definition.result.format === 'percent') return `${value.toFixed(definition.result.decimals ?? 1)}%`;
    if (definition.result.format === 'number') return `${new Intl.NumberFormat('ko-KR').format(value)}${definition.result.unit || ''}`;
    return `${money(value)}${definition.result.unit || '원'}`;
  }

  function render(target, idOrDefinition) {
    const root = typeof target === 'string' ? document.querySelector(target) : target;
    if (!root) return null;
    const definition = typeof idOrDefinition === 'string' ? definitions.get(idOrDefinition) : register(idOrDefinition, { replace: true });
    if (!definition) throw new Error(`Unknown calculator: ${idOrDefinition}`);

    root.dataset.savingioCalculator = definition.id;
    root.innerHTML = `
      <section class="savingio-calculator" aria-labelledby="calc-title-${definition.id}">
        <header><h2 id="calc-title-${definition.id}">${definition.title}</h2>${definition.description ? `<p>${definition.description}</p>` : ''}</header>
        <form novalidate></form>
        <div class="savingio-calculator-result" aria-live="polite" hidden>
          <strong>${definition.result.label}</strong><output></output><p class="savingio-calculator-explanation"></p>
        </div>
      </section>`;

    const form = root.querySelector('form');
    for (const input of definition.inputs) {
      const label = document.createElement('label');
      label.innerHTML = `<span>${input.label}</span><input name="${input.id}" type="${input.type}" min="${input.min}" step="${input.step}" ${input.max != null ? `max="${input.max}"` : ''} ${input.placeholder ? `placeholder="${input.placeholder}"` : ''} required>`;
      form.appendChild(label);
    }
    const button = document.createElement('button');
    button.type = 'submit';
    button.textContent = definition.buttonLabel || '계산하기';
    form.appendChild(button);

    form.addEventListener('submit', event => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(form).entries());
      const calculation = calculate(definition, values);
      const resultBox = root.querySelector('.savingio-calculator-result');
      resultBox.hidden = false;
      resultBox.querySelector('output').textContent = formatResult(calculation);
      resultBox.querySelector('.savingio-calculator-explanation').textContent = typeof definition.explain === 'function' ? definition.explain(calculation) : String(definition.explanation || '');
      root.dispatchEvent(new CustomEvent('savingio:calculator-result', { bubbles: true, detail: calculation }));
    });
    return root;
  }

  global.SavingioCalculatorFramework = Object.freeze({
    version: VERSION,
    register,
    registerMany: (items, options) => (items || []).map(item => register(item, options)),
    registerHandler,
    get: id => definitions.get(id) || null,
    getAll: () => Array.from(definitions.values()),
    calculate,
    formatResult,
    render
  });
  global.dispatchEvent?.(new CustomEvent('savingio:calculator-framework-ready', { detail: { version: VERSION } }));
})(window);
