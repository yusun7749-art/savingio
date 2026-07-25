(() => {
  'use strict';

  const ROOT_ID = 'savingioPluginInstallUI';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const clone = value => JSON.parse(JSON.stringify(value));

  function manager() {
    if (!window.SavingioPluginManager) throw Object.assign(new Error('Plugin Manager가 준비되지 않았습니다.'), { code:'PLUGIN_MANAGER_NOT_READY' });
    return window.SavingioPluginManager;
  }

  function marketplace() {
    if (!window.SavingioPluginMarketplace) throw Object.assign(new Error('Plugin Marketplace가 준비되지 않았습니다.'), { code:'PLUGIN_MARKETPLACE_NOT_READY' });
    return window.SavingioPluginMarketplace;
  }

  function manifestFor(item) {
    const api = window[item.global];
    if (!api?.manifest) throw Object.assign(new Error(`Plugin Manifest를 찾을 수 없습니다: ${item.id}`), { code:'PLUGIN_MANIFEST_NOT_READY' });
    return clone(api.manifest);
  }

  function compareVersions(a, b) {
    if (window.SavingioPluginManifest?.compareVersions) return window.SavingioPluginManifest.compareVersions(a, b);
    const parse = value => String(value || '0.0.0').split(/[.-]/).slice(0,3).map(part => Number(part) || 0);
    const left=parse(a), right=parse(b);
    for (let index=0; index<3; index+=1) if (left[index] !== right[index]) return left[index] > right[index] ? 1 : -1;
    return 0;
  }

  function state(item) {
    const installed = manager().get(item.id);
    const manifest = window[item.global]?.manifest || null;
    const availableVersion = String(manifest?.version || item.version || '');
    const installedVersion = String(installed?.version || '');
    return {
      installed:Boolean(installed),
      enabled:Boolean(installed?.enabled),
      installedVersion,
      availableVersion,
      updateAvailable:Boolean(installed && availableVersion && compareVersions(availableVersion, installedVersion) > 0),
      ready:Boolean(manifest)
    };
  }

  function list(filters={}) {
    const query=String(filters.query || '').trim().toLowerCase();
    const category=String(filters.category || '').trim();
    return marketplace().catalog.filter(item => {
      const itemState=state(item);
      const haystack=[item.id,item.name,item.category,item.description].join(' ').toLowerCase();
      if (query && !haystack.includes(query)) return false;
      if (category && item.category !== category) return false;
      if (filters.status === 'installed' && !itemState.installed) return false;
      if (filters.status === 'updates' && !itemState.updateAvailable) return false;
      if (filters.status === 'available' && itemState.installed) return false;
      return true;
    }).map(item => ({...clone(item), state:state(item)}));
  }

  function install(id) {
    const item=marketplace().catalog.find(plugin => plugin.id === id);
    if (!item) throw Object.assign(new Error(`Plugin을 찾을 수 없습니다: ${id}`), { code:'PLUGIN_NOT_FOUND' });
    const result=manager().install(manifestFor(item), { source:'marketplace-ui' });
    window.SavingioPluginUI?.sync?.();
    return result;
  }

  function update(id) {
    const item=marketplace().catalog.find(plugin => plugin.id === id);
    if (!item) throw Object.assign(new Error(`Plugin을 찾을 수 없습니다: ${id}`), { code:'PLUGIN_NOT_FOUND' });
    const result=manager().update(manifestFor(item), { source:'marketplace-ui' });
    window.SavingioPluginUI?.sync?.();
    return result;
  }

  function setEnabled(id, enabled) {
    const result = enabled ? manager().enable(id) : manager().disable(id);
    window.SavingioPluginUI?.sync?.();
    return result;
  }

  function uninstall(id) {
    const result=manager().uninstall(id);
    window.SavingioPluginUI?.sync?.();
    return result;
  }

  function actionButton(item) {
    const current=item.state;
    if (!current.installed) return `<button type="button" data-plugin-action="install" data-plugin-id="${esc(item.id)}" ${current.ready?'':'disabled'}>설치</button>`;
    if (current.updateAvailable) return `<button type="button" data-plugin-action="update" data-plugin-id="${esc(item.id)}">업데이트</button>`;
    return `<button type="button" data-plugin-action="toggle" data-plugin-id="${esc(item.id)}">${current.enabled?'중지':'활성'}</button><button type="button" data-plugin-action="uninstall" data-plugin-id="${esc(item.id)}">제거</button>`;
  }

  function render(root, filters={}) {
    const items=list(filters);
    const installed=items.filter(item=>item.state.installed).length;
    const updates=items.filter(item=>item.state.updateAvailable).length;
    root.id = root.id || ROOT_ID;
    root.innerHTML=`<section class="workboard-view"><header class="workboard-head"><div><p class="eyebrow">SAVINGIO PLUGIN CONTROL</p><h3>Plugin 설치·업데이트</h3><p>설치, 업데이트, 활성·중지, 제거를 관리자 화면에서 직접 실행합니다.</p></div><div class="workboard-current"><small>현재 상태</small><strong>${installed}/${items.length} 설치</strong><span>업데이트 ${updates}개</span></div></header><div class="workboard-layout"><main class="workboard-phases"><details open><summary><strong>Plugin 관리</strong><span>${items.length}</span></summary><ul>${items.map(item=>`<li class="workboard-task ${item.state.installed?'done':'todo'}"><span class="workboard-mark">${item.state.installed?'✓':'○'}</span><span><strong>${esc(item.name)}</strong>${esc(item.category)} · 설치 ${esc(item.state.installedVersion || '-')} / 제공 ${esc(item.state.availableVersion || '-')}<small>${esc(item.description)}</small></span><em>${actionButton(item)}</em></li>`).join('')}</ul></details></main><aside class="workboard-side"><section><h4>설치 상태</h4><p>설치 ${installed} · 업데이트 ${updates} · 전체 ${items.length}</p></section><section><h4>안전 규칙</h4><p>Manifest 검증·의존성 확인·다운그레이드 차단을 Plugin Manager가 처리합니다.</p></section><section><h4>실행 결과</h4><p data-plugin-ui-message>작업 대기 중</p></section></aside></div></section>`;
    bind(root, filters);
    return items;
  }

  function bind(root, filters={}) {
    if (root.dataset.pluginInstallUiBound === 'true') return;
    root.dataset.pluginInstallUiBound='true';
    root.addEventListener('click', event => {
      const button=event.target.closest('[data-plugin-action]');
      if (!button || button.disabled) return;
      const id=button.dataset.pluginId;
      const action=button.dataset.pluginAction;
      const message=root.querySelector('[data-plugin-ui-message]');
      try {
        if (action === 'install') install(id);
        else if (action === 'update') update(id);
        else if (action === 'toggle') {
          const current=manager().get(id);
          setEnabled(id, !current?.enabled);
        } else if (action === 'uninstall') uninstall(id);
        if (message) message.textContent=`${id} ${action} 완료`;
        render(root, filters);
        window.dispatchEvent(new CustomEvent('savingio:plugin-install-ui-changed', { detail:{ id, action } }));
      } catch (error) {
        if (message) message.textContent=`실패: ${error?.message || '알 수 없는 오류'}`;
        window.dispatchEvent(new CustomEvent('savingio:plugin-install-ui-error', { detail:{ id, action, code:error?.code || 'UNKNOWN', message:error?.message || '' } }));
      }
    });
  }

  function audit() {
    const items=list();
    const errors=[];
    items.forEach(item => {
      if (!item.id || !item.global) errors.push('CATALOG_ITEM_INVALID');
      if (item.state.installed && !manager().get(item.id)) errors.push(`INSTALL_STATE_MISMATCH:${item.id}`);
      if (item.state.updateAvailable && compareVersions(item.state.availableVersion, item.state.installedVersion) <= 0) errors.push(`UPDATE_STATE_INVALID:${item.id}`);
    });
    return { valid:errors.length===0, errors:[...new Set(errors)], total:items.length, installed:items.filter(item=>item.state.installed).length, updates:items.filter(item=>item.state.updateAvailable).length };
  }

  window.SavingioPluginInstallUI=Object.freeze({ list, state, install, update, enable:id=>setEnabled(id,true), disable:id=>setEnabled(id,false), uninstall, render, audit });
  window.dispatchEvent(new CustomEvent('savingio:plugin-install-ui-ready', { detail:audit() }));
})();