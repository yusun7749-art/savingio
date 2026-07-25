(() => {
  'use strict';

  const PLUGIN_ID = 'savingio.image-store';
  const MANIFEST = {
    specVersion:'1.0.0', id:PLUGIN_ID, name:'Savingio 이미지 스토어', version:'1.0.0',
    description:'관리자 HQ에서 이미지 자산·카테고리·태그·즐겨찾기·최근 사용 기록을 관리하는 Plugin', author:'Savingio',
    target:['admin'], entry:'/admin/plugins/image-store-plugin.js',
    permissions:['menu:register','workboard:register','storage:read','storage:write'],
    dataNamespace:'savingio.image-store', enabledByDefault:true,
    menu:{ id:'image-store-plugin-menu', label:'이미지 스토어', icon:'🖼️', order:50, parent:'plugins', route:'image-store-plugin-board' },
    workboard:{ id:'image-store-plugin-board', title:'이미지 스토어 Plugin', department:'product', order:50, renderer:'SavingioImageStorePlugin.render' }
  };

  const DEFAULT_ASSETS = [
    { id:'savingio-og-default', title:'Savingio 기본 OG 이미지', category:'brand', url:'/assets/og/savingio-default.webp', thumbnail:'/assets/og/savingio-default.webp', mimeType:'image/webp', width:1200, height:630, size:0, tags:['savingio','og','brand'], source:'builtin', aiGenerated:false, watermark:false, favorite:true, usedAt:null, createdAt:'2026-07-25T00:00:00.000Z' },
    { id:'article-placeholder', title:'생활정보 글 기본 이미지', category:'article', url:'/assets/images/article-placeholder.webp', thumbnail:'/assets/images/article-placeholder.webp', mimeType:'image/webp', width:1200, height:675, size:0, tags:['article','placeholder'], source:'builtin', aiGenerated:false, watermark:false, favorite:false, usedAt:null, createdAt:'2026-07-25T00:00:00.000Z' }
  ];

  const clone = value => JSON.parse(JSON.stringify(value));
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const context = () => window.SavingioPluginSecurity?.createContext(PLUGIN_ID);
  const assets = () => context()?.storage.get('assets', DEFAULT_ASSETS) || clone(DEFAULT_ASSETS);
  const save = items => { context()?.storage.set('assets', clone(items)); return clone(items); };

  function normalize(input={}) {
    const now = new Date().toISOString();
    return {
      id:String(input.id || '').trim(), title:String(input.title || '').trim(), category:String(input.category || 'uncategorized').trim(),
      url:String(input.url || '').trim(), thumbnail:String(input.thumbnail || input.url || '').trim(), mimeType:String(input.mimeType || '').trim(),
      width:Number(input.width || 0), height:Number(input.height || 0), size:Number(input.size || 0),
      tags:[...new Set((Array.isArray(input.tags) ? input.tags : []).map(tag=>String(tag).trim()).filter(Boolean))],
      source:String(input.source || 'manual').trim(), aiGenerated:Boolean(input.aiGenerated), watermark:Boolean(input.watermark),
      favorite:Boolean(input.favorite), usedAt:input.usedAt || null, createdAt:input.createdAt || now
    };
  }

  function validate(input) {
    const asset = normalize(input);
    const errors = [];
    if (!asset.id) errors.push('IMAGE_ID_REQUIRED');
    if (!asset.title) errors.push('IMAGE_TITLE_REQUIRED');
    if (!asset.url) errors.push('IMAGE_URL_REQUIRED');
    if (!asset.mimeType.startsWith('image/')) errors.push('IMAGE_MIME_INVALID');
    if (asset.width < 0 || asset.height < 0 || asset.size < 0) errors.push('IMAGE_META_INVALID');
    return { valid:errors.length===0, errors:[...new Set(errors)], asset };
  }

  function upsert(input) {
    const report = validate(input);
    if (!report.valid) throw Object.assign(new Error(`이미지 정의가 올바르지 않습니다: ${report.errors.join(', ')}`), { code:'IMAGE_ASSET_INVALID', details:report });
    const items = assets().filter(item=>item.id!==report.asset.id);
    items.push(report.asset);
    save(items);
    return clone(report.asset);
  }

  function remove(id) { const items=assets().filter(item=>item.id!==String(id||'')); save(items); return items; }
  function reset() { save(DEFAULT_ASSETS); return clone(DEFAULT_ASSETS); }
  function get(id) { return clone(assets().find(item=>item.id===String(id||'')) || null); }
  function search(query='', filters={}) {
    const needle = String(query || '').trim().toLowerCase();
    return clone(assets().filter(item => {
      const haystack = [item.title,item.category,item.mimeType,item.source,...item.tags].join(' ').toLowerCase();
      if (needle && !haystack.includes(needle)) return false;
      if (filters.category && item.category !== filters.category) return false;
      if (filters.favorite === true && !item.favorite) return false;
      if (filters.aiGenerated === true && !item.aiGenerated) return false;
      if (filters.watermark === true && !item.watermark) return false;
      return true;
    }));
  }
  function toggleFavorite(id) {
    let changed = null;
    const items = assets().map(item => item.id===id ? (changed={...item,favorite:!item.favorite}) : item);
    save(items);
    return clone(changed);
  }
  function markUsed(id) {
    let changed = null;
    const items = assets().map(item => item.id===id ? (changed={...item,usedAt:new Date().toISOString()}) : item);
    save(items);
    return clone(changed);
  }
  function recent(limit=12) { return clone(assets().filter(item=>item.usedAt).sort((a,b)=>new Date(b.usedAt)-new Date(a.usedAt)).slice(0, Math.max(1, Number(limit)||12))); }
  function categories() { return [...new Set(assets().map(item=>item.category).filter(Boolean))].sort(); }
  function tags() { return [...new Set(assets().flatMap(item=>item.tags || []))].sort(); }
  function audit() {
    const reports = assets().map(validate);
    const ids = reports.map(report=>report.asset.id);
    const errors = reports.flatMap(report=>report.errors);
    ids.filter((id,index,all)=>id && all.indexOf(id)!==index).forEach(id=>errors.push(`IMAGE_ID_DUPLICATE:${id}`));
    return { valid:errors.length===0, errors:[...new Set(errors)], assets:reports.length, categories:categories().length, tags:tags().length };
  }

  function render(root) {
    const items = assets();
    const report = audit();
    root.innerHTML = `<section class="workboard-view"><header class="workboard-head"><div><p class="eyebrow">SAVINGIO PLUGIN</p><h3>이미지 스토어</h3><p>이미지 자산·카테고리·태그·즐겨찾기·최근 사용 기록을 관리합니다.</p></div><div class="workboard-current"><small>정의 검사</small><strong>${report.valid?'정상':'오류'}</strong><span>${items.length}개 이미지 · ${report.categories}개 카테고리</span></div></header><div class="workboard-layout"><main class="workboard-phases"><details open><summary><strong>등록 이미지</strong><span>${items.length}</span></summary><ul>${items.map(item=>`<li class="workboard-task done"><span class="workboard-mark">✓</span><span><strong>${esc(item.title)}</strong>${esc(item.url)}</span><em>${esc(item.category)} · ${item.favorite?'★':'☆'}</em></li>`).join('')}</ul></details></main><aside class="workboard-side"><section><h4>Plugin 기능</h4><p>등록·수정·삭제·검색·태그·즐겨찾기·최근 사용 기록을 제공합니다.</p></section><section><h4>데이터 격리</h4><p>${esc(MANIFEST.dataNamespace)}</p></section><section><h4>검사 상태</h4><p>${report.valid?'PASS':'FAIL'} · 오류 ${report.errors.length}건</p></section></aside></div></section>`;
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

  window.SavingioImageStorePlugin = Object.freeze({ manifest:MANIFEST, list:assets, get, upsert, remove, reset, search, toggleFavorite, markUsed, recent, categories, tags, audit, render, install });
  if (!install()) {
    window.addEventListener('savingio:plugin-manager-ready', install, { once:true });
    setTimeout(install, 400);
  }
})();