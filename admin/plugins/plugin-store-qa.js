(() => {
  'use strict';

  const PLUGINS = [
    { id:'savingio.calculator', global:'SavingioCalculatorPlugin', entry:'/admin/plugins/calculator-plugin.js' },
    { id:'savingio.psychology-test', global:'SavingioPsychologyTestPlugin', entry:'/admin/plugins/psychology-test-plugin.js' },
    { id:'savingio.game', global:'SavingioGamePlugin', entry:'/admin/plugins/game-plugin.js' },
    { id:'savingio.image-store', global:'SavingioImageStorePlugin', entry:'/admin/plugins/image-store-plugin.js' },
    { id:'savingio.coupon-affiliate', global:'SavingioCouponAffiliatePlugin', entry:'/admin/plugins/coupon-affiliate-plugin.js' },
    { id:'savingio.digital-product', global:'SavingioDigitalProductPlugin', entry:'/admin/plugins/digital-product-plugin.js' }
  ];

  const clone = value => JSON.parse(JSON.stringify(value));
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const semver = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

  function inspectPlugin(definition) {
    const api = window[definition.global];
    const errors = [];
    const warnings = [];
    if (!api) {
      errors.push('GLOBAL_NOT_READY');
      return { ...definition, ready:false, errors, warnings, manifest:null, audit:null };
    }

    const manifest = api.manifest || null;
    if (!manifest) errors.push('MANIFEST_MISSING');
    else {
      if (manifest.id !== definition.id) errors.push('MANIFEST_ID_MISMATCH');
      if (manifest.entry !== definition.entry) errors.push('ENTRY_MISMATCH');
      if (!semver.test(String(manifest.version || ''))) errors.push('VERSION_INVALID');
      if (!manifest.dataNamespace) errors.push('NAMESPACE_MISSING');
      if (!manifest.menu?.id || !manifest.menu?.route) errors.push('MENU_INVALID');
      if (!manifest.workboard?.id || !manifest.workboard?.renderer) errors.push('WORKBOARD_INVALID');
      if (!Array.isArray(manifest.permissions) || !manifest.permissions.length) errors.push('PERMISSIONS_MISSING');
      if (typeof api.install !== 'function') errors.push('INSTALL_MISSING');
      if (typeof api.render !== 'function') errors.push('RENDER_MISSING');
    }

    let audit = null;
    if (typeof api.audit === 'function') {
      try {
        audit = api.audit();
        if (audit && audit.valid === false) errors.push(...(audit.errors || ['PLUGIN_AUDIT_FAILED']));
      } catch (error) {
        errors.push(`AUDIT_EXCEPTION:${error?.message || 'unknown'}`);
      }
    } else warnings.push('AUDIT_NOT_EXPOSED');

    return { ...definition, ready:true, errors:[...new Set(errors)], warnings:[...new Set(warnings)], manifest:clone(manifest), audit:clone(audit) };
  }

  function duplicateValues(values) {
    return [...new Set(values.filter(Boolean).filter((value, index, all) => all.indexOf(value) !== index))];
  }

  function run() {
    const plugins = PLUGINS.map(inspectPlugin);
    const manifests = plugins.map(item => item.manifest).filter(Boolean);
    const errors = [];
    const duplicateIds = duplicateValues(manifests.map(item => item.id));
    const duplicateNamespaces = duplicateValues(manifests.map(item => item.dataNamespace));
    const duplicateMenus = duplicateValues(manifests.map(item => item.menu?.id));
    const duplicateRoutes = duplicateValues(manifests.map(item => item.menu?.route));
    const duplicateWorkboards = duplicateValues(manifests.map(item => item.workboard?.id));

    duplicateIds.forEach(value => errors.push(`PLUGIN_ID_DUPLICATE:${value}`));
    duplicateNamespaces.forEach(value => errors.push(`NAMESPACE_DUPLICATE:${value}`));
    duplicateMenus.forEach(value => errors.push(`MENU_ID_DUPLICATE:${value}`));
    duplicateRoutes.forEach(value => errors.push(`MENU_ROUTE_DUPLICATE:${value}`));
    duplicateWorkboards.forEach(value => errors.push(`WORKBOARD_ID_DUPLICATE:${value}`));
    plugins.forEach(plugin => plugin.errors.forEach(error => errors.push(`${plugin.id}:${error}`)));

    return {
      valid:errors.length === 0,
      checkedAt:new Date().toISOString(),
      expected:PLUGINS.length,
      ready:plugins.filter(item => item.ready).length,
      passed:plugins.filter(item => item.ready && item.errors.length === 0).length,
      failed:plugins.filter(item => item.errors.length > 0).length,
      warnings:plugins.reduce((sum,item) => sum + item.warnings.length, 0),
      errors:[...new Set(errors)],
      plugins
    };
  }

  function render(root) {
    const report = run();
    root.innerHTML = `<section class="workboard-view"><header class="workboard-head"><div><p class="eyebrow">SAVINGIO PLUGIN STORE QA</p><h3>Plugin Store 통합 검사</h3><p>Manifest·로더·권한·메뉴·작업판·저장공간·버전·Plugin 자체 감사를 한 번에 검사합니다.</p></div><div class="workboard-current"><small>통합 검사</small><strong>${report.valid?'PASS':'FAIL'}</strong><span>준비 ${report.ready}/${report.expected} · 통과 ${report.passed}</span></div></header><div class="workboard-layout"><main class="workboard-phases"><details open><summary><strong>Plugin 검사 결과</strong><span>${report.passed}/${report.expected}</span></summary><ul>${report.plugins.map(item=>`<li class="workboard-task ${item.ready&&item.errors.length===0?'done':'active'}"><span class="workboard-mark">${item.ready&&item.errors.length===0?'✓':'●'}</span><span><strong>${esc(item.manifest?.name || item.id)}</strong>${esc(item.entry)}</span><em>${item.ready?(item.errors.length?`오류 ${item.errors.length}`:'PASS'):'로딩 대기'}</em></li>`).join('')}</ul></details></main><aside class="workboard-side"><section><h4>검사 항목</h4><p>Manifest ID·Entry·SemVer·권한·메뉴·작업판·Namespace·자체 Audit</p></section><section><h4>충돌 검사</h4><p>ID·메뉴·Route·작업판·Storage Namespace 중복 검사</p></section><section><h4>최종 상태</h4><p>${report.valid?'PASS':'FAIL'} · 오류 ${report.errors.length}건 · 경고 ${report.warnings}건</p></section></aside></div></section>`;
    return report;
  }

  function install() {
    window.dispatchEvent(new CustomEvent('savingio:plugin-store-qa-ready', { detail:run() }));
    return true;
  }

  window.SavingioPluginStoreQA = Object.freeze({ definitions:clone(PLUGINS), inspectPlugin, run, render, install });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once:true });
  else install();
})();