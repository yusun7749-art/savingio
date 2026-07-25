(() => {
  'use strict';

  const HISTORY_KEY = 'savingio-plugin-settings-history-v1';
  const clone = value => JSON.parse(JSON.stringify(value));
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const now = () => new Date().toISOString();

  function manager() {
    if (!window.SavingioPluginManager) throw Object.assign(new Error('Plugin Manager가 준비되지 않았습니다.'), { code:'PLUGIN_MANAGER_NOT_READY' });
    return window.SavingioPluginManager;
  }

  function readHistory() {
    try {
      const value = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function writeHistory(items) {
    const limited = items.slice(0, 200);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(limited));
    return clone(limited);
  }

  function schemaFor(plugin) {
    const manifest = plugin?.manifest || {};
    const declared = manifest.settingsSchema || manifest.settings || null;
    if (declared && typeof declared === 'object' && !Array.isArray(declared)) return clone(declared);
    return {
      enabled: { type:'boolean', label:'Plugin 사용', default:plugin?.enabled !== false },
      displayName: { type:'text', label:'표시 이름', default:plugin?.name || manifest.name || plugin?.id || '' },
      note: { type:'textarea', label:'관리 메모', default:'' }
    };
  }

  function normalizeField(name, definition={}) {
    return {
      name,
      type:['text','textarea','number','boolean','select'].includes(definition.type) ? definition.type : 'text',
      label:String(definition.label || name),
      required:Boolean(definition.required),
      min:definition.min,
      max:definition.max,
      options:Array.isArray(definition.options) ? clone(definition.options) : [],
      default:definition.default ?? ''
    };
  }

  function fieldsFor(plugin) {
    return Object.entries(schemaFor(plugin)).map(([name, definition]) => normalizeField(name, definition));
  }

  function get(id) {
    const plugin = manager().get(id);
    if (!plugin) throw Object.assign(new Error(`설치된 Plugin을 찾을 수 없습니다: ${id}`), { code:'PLUGIN_NOT_INSTALLED' });
    const fields = fieldsFor(plugin);
    const settings = { ...(plugin.settings || {}) };
    fields.forEach(field => {
      if (settings[field.name] === undefined) settings[field.name] = field.default;
    });
    return { plugin, fields, settings:clone(settings) };
  }

  function validate(id, input={}) {
    const { fields } = get(id);
    const values = {};
    const errors = [];
    fields.forEach(field => {
      let value = input[field.name];
      if (field.type === 'boolean') value = Boolean(value);
      else if (field.type === 'number') {
        value = Number(value);
        if (!Number.isFinite(value)) errors.push(`${field.name}:NUMBER_REQUIRED`);
        if (field.min !== undefined && value < Number(field.min)) errors.push(`${field.name}:MIN`);
        if (field.max !== undefined && value > Number(field.max)) errors.push(`${field.name}:MAX`);
      } else value = String(value ?? '').trim();
      if (field.required && (value === '' || value === null || value === undefined)) errors.push(`${field.name}:REQUIRED`);
      if (field.type === 'select' && field.options.length && !field.options.map(option => String(option.value ?? option)).includes(String(value))) errors.push(`${field.name}:OPTION_INVALID`);
      values[field.name] = value;
    });
    return { valid:errors.length === 0, errors:[...new Set(errors)], values };
  }

  function save(id, input={}, actor='admin') {
    const validation = validate(id, input);
    if (!validation.valid) throw Object.assign(new Error(`Plugin 설정 검증 실패: ${validation.errors.join(', ')}`), { code:'PLUGIN_SETTINGS_INVALID', details:validation });
    const plugin = manager().get(id);
    const previous = clone(plugin.settings || {});
    manager().install(plugin.manifest, { replace:true, enabled:plugin.enabled, installedAt:plugin.installedAt, source:'plugin-settings', settings:validation.values });
    const history = readHistory();
    history.unshift({ id:`PSET-${Date.now()}`, pluginId:id, actor:String(actor || 'admin'), previous, next:clone(validation.values), changedAt:now(), action:'save' });
    writeHistory(history);
    window.dispatchEvent(new CustomEvent('savingio:plugin-settings-saved', { detail:{ pluginId:id, settings:clone(validation.values) } }));
    return clone(validation.values);
  }

  function reset(id, actor='admin') {
    const { fields } = get(id);
    const defaults = Object.fromEntries(fields.map(field => [field.name, field.default]));
    const result = save(id, defaults, actor);
    const history = readHistory();
    if (history[0]?.pluginId === id) history[0].action = 'reset';
    writeHistory(history);
    return result;
  }

  function history(id) {
    return clone(readHistory().filter(item => !id || item.pluginId === id));
  }

  function fieldHtml(field, value) {
    if (field.type === 'boolean') return `<label><input type="checkbox" name="${esc(field.name)}" ${value?'checked':''}> ${esc(field.label)}</label>`;
    if (field.type === 'textarea') return `<label>${esc(field.label)}<textarea name="${esc(field.name)}" ${field.required?'required':''}>${esc(value)}</textarea></label>`;
    if (field.type === 'select') return `<label>${esc(field.label)}<select name="${esc(field.name)}">${field.options.map(option=>{const item=typeof option==='object'?option:{value:option,label:option};return `<option value="${esc(item.value)}" ${String(item.value)===String(value)?'selected':''}>${esc(item.label)}</option>`;}).join('')}</select></label>`;
    return `<label>${esc(field.label)}<input type="${field.type==='number'?'number':'text'}" name="${esc(field.name)}" value="${esc(value)}" ${field.required?'required':''} ${field.min!==undefined?`min="${esc(field.min)}"`:''} ${field.max!==undefined?`max="${esc(field.max)}"`:''}></label>`;
  }

  function render(root, selectedId='') {
    const plugins = manager().list();
    const selected = selectedId || plugins[0]?.id || '';
    const state = selected ? get(selected) : null;
    root.innerHTML = `<section class="workboard-view"><header class="workboard-head"><div><p class="eyebrow">SAVINGIO PLUGIN SETTINGS</p><h3>Plugin 설정</h3><p>Plugin별 설정을 독립적으로 저장하고 기본값 복원과 변경 이력을 관리합니다.</p></div><div class="workboard-current"><small>설치 Plugin</small><strong>${plugins.length}개</strong><span>${state?esc(state.plugin.name):'선택 없음'}</span></div></header><div class="workboard-layout"><main class="workboard-phases"><details open><summary><strong>설정 편집</strong><span>${plugins.length}</span></summary><form data-plugin-settings-form>${plugins.length?`<label>Plugin<select name="pluginId" data-plugin-settings-select>${plugins.map(plugin=>`<option value="${esc(plugin.id)}" ${plugin.id===selected?'selected':''}>${esc(plugin.name)}</option>`).join('')}</select></label>${state.fields.map(field=>fieldHtml(field,state.settings[field.name])).join('')}<div><button type="submit">저장</button><button type="button" data-plugin-settings-reset>기본값 복원</button></div>`:'<p>설치된 Plugin이 없습니다.</p>'}</form></details></main><aside class="workboard-side"><section><h4>저장 범위</h4><p>Plugin Registry의 settings 필드에 Plugin별로 분리 저장합니다.</p></section><section><h4>검증</h4><p>필수값·숫자 범위·선택지 값을 저장 전에 검사합니다.</p></section><section><h4>변경 이력</h4><p>${selected?history(selected).length:0}건</p><p data-plugin-settings-message>작업 대기 중</p></section></aside></div></section>`;
    bind(root, selected);
    return state;
  }

  function bind(root, selected) {
    const select = root.querySelector('[data-plugin-settings-select]');
    select?.addEventListener('change', () => render(root, select.value));
    root.querySelector('[data-plugin-settings-form]')?.addEventListener('submit', event => {
      event.preventDefault();
      const form = event.currentTarget;
      const id = String(new FormData(form).get('pluginId') || selected);
      const { fields } = get(id);
      const data = new FormData(form);
      const input = {};
      fields.forEach(field => input[field.name] = field.type === 'boolean' ? Boolean(form.elements[field.name]?.checked) : data.get(field.name));
      const message = root.querySelector('[data-plugin-settings-message]');
      try { save(id, input); if (message) message.textContent='설정을 저장했습니다.'; render(root,id); }
      catch (error) { if (message) message.textContent=`실패: ${error?.message || '알 수 없는 오류'}`; }
    });
    root.querySelector('[data-plugin-settings-reset]')?.addEventListener('click', () => {
      const id = select?.value || selected;
      try { reset(id); render(root,id); } catch (error) { const message=root.querySelector('[data-plugin-settings-message]'); if(message) message.textContent=`실패: ${error?.message || '알 수 없는 오류'}`; }
    });
  }

  function audit() {
    const errors = [];
    manager().list().forEach(plugin => {
      const names = fieldsFor(plugin).map(field => field.name);
      if (new Set(names).size !== names.length) errors.push(`SETTING_FIELD_DUPLICATE:${plugin.id}`);
      if (!plugin.manifest) errors.push(`MANIFEST_MISSING:${plugin.id}`);
    });
    return { valid:errors.length === 0, errors:[...new Set(errors)], plugins:manager().list().length, history:readHistory().length };
  }

  window.SavingioPluginSettings = Object.freeze({ get, validate, save, reset, history, render, audit });
  window.dispatchEvent(new CustomEvent('savingio:plugin-settings-ready', { detail:audit() }));
})();