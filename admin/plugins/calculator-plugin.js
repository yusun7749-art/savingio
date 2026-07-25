(() => {
  'use strict';

  const PLUGIN_ID = 'savingio.calculator';
  const MANIFEST = {
    specVersion:'1.0.0', id:PLUGIN_ID, name:'Savingio 계산기', version:'1.0.0',
    description:'관리자 HQ에서 계산기 정의를 등록·시험·관리하는 Plugin', author:'Savingio',
    target:['admin'], entry:'/admin/plugins/calculator-plugin.js',
    permissions:['menu:register','workboard:register','storage:read','storage:write'],
    dataNamespace:'savingio.calculator', enabledByDefault:true,
    menu:{ id:'calculator-plugin-menu', label:'계산기 관리', icon:'🧮', order:20, parent:'plugins', route:'calculator-plugin-board' },
    workboard:{ id:'calculator-plugin-board', title:'계산기 Plugin', department:'product', order:20, renderer:'SavingioCalculatorPlugin.render' }
  };

  const builtins = [
    { id:'percent', name:'퍼센트 계산기', fields:['value','rate'], formula:'value * rate / 100' },
    { id:'discount', name:'할인 금액 계산기', fields:['price','rate'], formula:'price - (price * rate / 100)' },
    { id:'monthly', name:'연간→월간 환산', fields:['annual'], formula:'annual / 12' }
  ];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function context() { return window.SavingioPluginSecurity?.createContext(PLUGIN_ID); }
  function definitions() { return context()?.storage.get('definitions', builtins) || builtins; }
  function save(items) { context()?.storage.set('definitions', items); return items; }
  function calculate(id, values={}) {
    const item = definitions().find(entry => entry.id === id);
    if (!item) throw Object.assign(new Error(`계산기를 찾을 수 없습니다: ${id}`), { code:'CALCULATOR_NOT_FOUND' });
    const args = item.fields.map(key => Number(values[key]));
    if (args.some(Number.isNaN)) throw Object.assign(new Error('숫자 입력값이 필요합니다.'), { code:'CALCULATOR_INPUT_INVALID' });
    const fn = Function(...item.fields, `'use strict'; return (${item.formula});`);
    const result = Number(fn(...args));
    if (!Number.isFinite(result)) throw Object.assign(new Error('계산 결과가 유효하지 않습니다.'), { code:'CALCULATOR_RESULT_INVALID' });
    return result;
  }
  function add(definition) {
    const item = { id:String(definition.id||'').trim(), name:String(definition.name||'').trim(), fields:[...(definition.fields||[])], formula:String(definition.formula||'').trim() };
    if (!item.id || !item.name || !item.fields.length || !item.formula) throw new Error('계산기 정의가 완전하지 않습니다.');
    const items = definitions().filter(entry => entry.id !== item.id); items.push(item); save(items); return item;
  }
  function remove(id) { const items=definitions().filter(entry=>entry.id!==id); save(items); return items; }
  function reset() { save(builtins); return builtins; }

  function render(root) {
    const items = definitions();
    root.innerHTML = `<section class="workboard-view"><header class="workboard-head"><div><p class="eyebrow">SAVINGIO PLUGIN</p><h3>계산기 관리</h3><p>계산기 정의와 공식, 입력 필드를 한곳에서 관리합니다.</p></div><div class="workboard-current"><small>설치 상태</small><strong>활성</strong><span>${items.length}개 계산기</span></div></header><div class="workboard-layout"><main class="workboard-phases"><details open><summary><strong>등록 계산기</strong><span>${items.length}</span></summary><ul>${items.map(item=>`<li class="workboard-task done"><span class="workboard-mark">✓</span><span><strong>${esc(item.name)}</strong>${esc(item.formula)}</span><em>${esc(item.id)}</em></li>`).join('')}</ul></details></main><aside class="workboard-side"><section><h4>Plugin 기능</h4><p>등록·삭제·공식 실행·기본값 복구를 API로 제공합니다.</p></section><section><h4>데이터 격리</h4><p>${esc(MANIFEST.dataNamespace)}</p></section></aside></div></section>`;
    return root;
  }

  function install() {
    if (!window.SavingioPluginManifest || !window.SavingioPluginManager) return false;
    const manifest = window.SavingioPluginManifest.create(MANIFEST);
    const current = window.SavingioPluginManager.get(PLUGIN_ID);
    if (!current) window.SavingioPluginManager.install(manifest, { source:'builtin' });
    else if (current.version !== manifest.version) window.SavingioPluginManager.update(manifest, { source:'builtin' });
    window.SavingioPluginUI?.sync?.();
    return true;
  }

  window.SavingioCalculatorPlugin = Object.freeze({ manifest:MANIFEST, list:definitions, add, remove, reset, calculate, render, install });
  if (!install()) {
    window.addEventListener('savingio:plugin-manager-ready', install, { once:true });
    setTimeout(install, 250);
  }
})();