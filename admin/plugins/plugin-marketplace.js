(() => {
  'use strict';

  const CATALOG = [
    { id:'savingio.calculator', name:'계산기 Plugin', category:'도구', version:'1.0.0', global:'SavingioCalculatorPlugin', entry:'/admin/plugins/calculator-plugin.js', description:'생활비·급여·대출 등 계산기를 관리합니다.' },
    { id:'savingio.psychology-test', name:'심리테스트 Plugin', category:'콘텐츠', version:'1.0.0', global:'SavingioPsychologyTestPlugin', entry:'/admin/plugins/psychology-test-plugin.js', description:'Savingio 생활 성향 테스트를 관리합니다.' },
    { id:'savingio.game', name:'게임 Plugin', category:'콘텐츠', version:'1.0.0', global:'SavingioGamePlugin', entry:'/admin/plugins/game-plugin.js', description:'간단한 참여형 게임과 성과를 관리합니다.' },
    { id:'savingio.image-store', name:'이미지 스토어 Plugin', category:'자산', version:'1.0.0', global:'SavingioImageStorePlugin', entry:'/admin/plugins/image-store-plugin.js', description:'이미지 자산과 사용 상태를 관리합니다.' },
    { id:'savingio.coupon-affiliate', name:'쿠폰·제휴 Plugin', category:'수익', version:'1.0.0', global:'SavingioCouponAffiliatePlugin', entry:'/admin/plugins/coupon-affiliate-plugin.js', description:'쿠폰·제휴 캠페인과 전환 성과를 관리합니다.' },
    { id:'savingio.digital-product', name:'디지털 상품 Plugin', category:'수익', version:'1.0.0', global:'SavingioDigitalProductPlugin', entry:'/admin/plugins/digital-product-plugin.js', description:'전자책·템플릿·체크리스트 상품을 관리합니다.' }
  ];

  const clone = value => JSON.parse(JSON.stringify(value));
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

  function statusOf(item) {
    const api = window[item.global];
    const installed = Boolean(api && window.SavingioPluginManager?.get?.(item.id));
    return {
      installed,
      ready:Boolean(api),
      enabled:installed ? window.SavingioPluginManager.get(item.id)?.enabled !== false : false,
      installedVersion:installed ? String(window.SavingioPluginManager.get(item.id)?.version || '') : ''
    };
  }

  function list(filters={}) {
    const query=String(filters.query||'').trim().toLowerCase();
    return clone(CATALOG.filter(item=>{
      const status=statusOf(item);
      const haystack=[item.id,item.name,item.category,item.description].join(' ').toLowerCase();
      if (query && !haystack.includes(query)) return false;
      if (filters.category && item.category!==filters.category) return false;
      if (filters.installed === true && !status.installed) return false;
      if (filters.installed === false && status.installed) return false;
      return true;
    }).map(item=>({...item,status:statusOf(item)})));
  }

  function install(id) {
    const item=CATALOG.find(plugin=>plugin.id===id);
    if (!item) throw Object.assign(new Error(`Plugin을 찾을 수 없습니다: ${id}`),{code:'PLUGIN_NOT_FOUND'});
    const api=window[item.global];
    if (!api?.install) throw Object.assign(new Error(`Plugin이 아직 로딩되지 않았습니다: ${id}`),{code:'PLUGIN_NOT_READY'});
    api.install();
    window.SavingioPluginUI?.sync?.();
    return statusOf(item);
  }

  function remove(id) {
    if (!window.SavingioPluginManager?.remove) throw Object.assign(new Error('Plugin Manager remove 기능을 사용할 수 없습니다.'),{code:'PLUGIN_REMOVE_UNAVAILABLE'});
    const result=window.SavingioPluginManager.remove(id);
    window.SavingioPluginUI?.sync?.();
    return result;
  }

  function summary() {
    const items=list();
    return {
      total:items.length,
      installed:items.filter(item=>item.status.installed).length,
      ready:items.filter(item=>item.status.ready).length,
      enabled:items.filter(item=>item.status.enabled).length,
      categories:[...new Set(items.map(item=>item.category))]
    };
  }

  function render(root, filters={}) {
    const items=list(filters);
    const stat=summary();
    root.innerHTML=`<section class="workboard-view"><header class="workboard-head"><div><p class="eyebrow">SAVINGIO PLUGIN MARKETPLACE</p><h3>Plugin Marketplace</h3><p>설치 가능한 Plugin을 한 화면에서 확인하고 상태를 관리합니다.</p></div><div class="workboard-current"><small>카탈로그 상태</small><strong>${stat.installed}/${stat.total} 설치</strong><span>준비 ${stat.ready} · 활성 ${stat.enabled}</span></div></header><div class="workboard-layout"><main class="workboard-phases"><details open><summary><strong>Plugin 카탈로그</strong><span>${items.length}</span></summary><ul>${items.map(item=>`<li class="workboard-task ${item.status.installed?'done':'todo'}"><span class="workboard-mark">${item.status.installed?'✓':'○'}</span><span><strong>${esc(item.name)}</strong>${esc(item.category)} · v${esc(item.version)}<small>${esc(item.description)}</small></span><em>${item.status.installed?(item.status.enabled?'설치·활성':'설치·중지'):(item.status.ready?'설치 가능':'로딩 대기')}</em></li>`).join('')}</ul></details></main><aside class="workboard-side"><section><h4>카탈로그</h4><p>전체 ${stat.total} · 설치 ${stat.installed} · 활성 ${stat.enabled}</p></section><section><h4>분류</h4><p>${stat.categories.map(esc).join(' · ')}</p></section><section><h4>관리 기능</h4><p>검색·분류·설치 상태 확인·설치·제거 API</p></section></aside></div></section>`;
    return items;
  }

  window.SavingioPluginMarketplace=Object.freeze({ catalog:clone(CATALOG), list, install, remove, summary, render });
  window.dispatchEvent(new CustomEvent('savingio:plugin-marketplace-ready',{detail:summary()}));
})();