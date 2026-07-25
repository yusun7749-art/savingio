(() => {
  'use strict';

  const PLUGIN_ID = 'savingio.digital-product';
  const MANIFEST = {
    specVersion:'1.0.0', id:PLUGIN_ID, name:'Savingio 디지털 상품', version:'1.0.0',
    description:'전자책·템플릿·체크리스트 등 디지털 상품과 판매 상태·다운로드·매출을 관리하는 Plugin', author:'Savingio',
    target:['admin'], entry:'/admin/plugins/digital-product-plugin.js',
    permissions:['menu:register','workboard:register','storage:read','storage:write'],
    dataNamespace:'savingio.digital-product', enabledByDefault:true,
    menu:{ id:'digital-product-plugin-menu', label:'디지털 상품 관리', icon:'📚', order:70, parent:'plugins', route:'digital-product-plugin-board' },
    workboard:{ id:'digital-product-plugin-board', title:'디지털 상품 Plugin', department:'revenue', order:70, renderer:'SavingioDigitalProductPlugin.render' }
  };

  const DEFAULT_PRODUCTS = [
    { id:'savingio-guide-sample', title:'Savingio 생활비 절약 가이드', type:'ebook', category:'saving', description:'생활비 절약 실천 가이드 샘플', price:0, currency:'KRW', fileUrl:'#', coverUrl:'', status:'draft', version:'1.0.0', tags:['saving','guide'], downloads:0, orders:0, revenue:0, createdAt:'2026-07-25T00:00:00.000Z', updatedAt:'2026-07-25T00:00:00.000Z' }
  ];

  const clone = value => JSON.parse(JSON.stringify(value));
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const context = () => window.SavingioPluginSecurity?.createContext(PLUGIN_ID);
  const products = () => context()?.storage.get('products', DEFAULT_PRODUCTS) || clone(DEFAULT_PRODUCTS);
  const save = items => { context()?.storage.set('products', clone(items)); return clone(items); };

  function normalize(input={}) {
    const now = new Date().toISOString();
    return {
      id:String(input.id || '').trim(), title:String(input.title || '').trim(), type:String(input.type || 'ebook').trim(),
      category:String(input.category || 'uncategorized').trim(), description:String(input.description || '').trim(),
      price:Number(input.price || 0), currency:String(input.currency || 'KRW').trim(), fileUrl:String(input.fileUrl || '').trim(),
      coverUrl:String(input.coverUrl || '').trim(), status:String(input.status || 'draft').trim(), version:String(input.version || '1.0.0').trim(),
      tags:[...new Set((Array.isArray(input.tags) ? input.tags : []).map(tag=>String(tag).trim()).filter(Boolean))],
      downloads:Number(input.downloads || 0), orders:Number(input.orders || 0), revenue:Number(input.revenue || 0),
      createdAt:input.createdAt || now, updatedAt:now
    };
  }

  function validate(input) {
    const product = normalize(input);
    const errors = [];
    if (!product.id) errors.push('PRODUCT_ID_REQUIRED');
    if (!product.title) errors.push('PRODUCT_TITLE_REQUIRED');
    if (!['ebook','template','checklist','worksheet','bundle'].includes(product.type)) errors.push('PRODUCT_TYPE_INVALID');
    if (!['draft','active','paused','archived'].includes(product.status)) errors.push('PRODUCT_STATUS_INVALID');
    if (!product.fileUrl) errors.push('PRODUCT_FILE_REQUIRED');
    if (product.price < 0 || !Number.isFinite(product.price)) errors.push('PRODUCT_PRICE_INVALID');
    if ([product.downloads,product.orders,product.revenue].some(value=>value < 0 || !Number.isFinite(value))) errors.push('PRODUCT_METRIC_INVALID');
    return { valid:errors.length===0, errors:[...new Set(errors)], product };
  }

  function upsert(input) {
    const report = validate(input);
    if (!report.valid) throw Object.assign(new Error(`디지털 상품 정의가 올바르지 않습니다: ${report.errors.join(', ')}`), { code:'DIGITAL_PRODUCT_INVALID', details:report });
    const items = products().filter(item=>item.id!==report.product.id);
    items.push(report.product);
    save(items);
    return clone(report.product);
  }

  function remove(id) { const items=products().filter(item=>item.id!==String(id||'')); save(items); return items; }
  function reset() { save(DEFAULT_PRODUCTS); return clone(DEFAULT_PRODUCTS); }
  function get(id) { return clone(products().find(item=>item.id===String(id||'')) || null); }
  function search(query='', filters={}) {
    const needle=String(query||'').trim().toLowerCase();
    return clone(products().filter(item=>{
      const haystack=[item.title,item.type,item.category,item.description,...item.tags].join(' ').toLowerCase();
      if (needle && !haystack.includes(needle)) return false;
      if (filters.type && item.type!==filters.type) return false;
      if (filters.status && item.status!==filters.status) return false;
      if (filters.category && item.category!==filters.category) return false;
      return true;
    }).sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt)));
  }
  function record(id, metrics={}) {
    let changed=null;
    const items=products().map(item=>{
      if (item.id!==id) return item;
      changed={...item,downloads:item.downloads+Number(metrics.downloads||0),orders:item.orders+Number(metrics.orders||0),revenue:item.revenue+Number(metrics.revenue||0),updatedAt:new Date().toISOString()};
      return changed;
    });
    if (!changed) throw Object.assign(new Error(`디지털 상품을 찾을 수 없습니다: ${id}`), { code:'DIGITAL_PRODUCT_NOT_FOUND' });
    save(items);
    return clone(changed);
  }
  function summary() {
    const items=products();
    return { products:items.length, active:items.filter(item=>item.status==='active').length, downloads:items.reduce((sum,item)=>sum+item.downloads,0), orders:items.reduce((sum,item)=>sum+item.orders,0), revenue:items.reduce((sum,item)=>sum+item.revenue,0) };
  }
  function audit() {
    const reports=products().map(validate);
    const ids=reports.map(report=>report.product.id);
    const errors=reports.flatMap(report=>report.errors);
    ids.filter((id,index,all)=>id && all.indexOf(id)!==index).forEach(id=>errors.push(`PRODUCT_ID_DUPLICATE:${id}`));
    return { valid:errors.length===0, errors:[...new Set(errors)], ...summary() };
  }

  function render(root) {
    const items=products();
    const report=audit();
    root.innerHTML=`<section class="workboard-view"><header class="workboard-head"><div><p class="eyebrow">SAVINGIO PLUGIN</p><h3>디지털 상품 관리</h3><p>전자책·템플릿·체크리스트와 다운로드·주문·매출을 관리합니다.</p></div><div class="workboard-current"><small>정의 검사</small><strong>${report.valid?'정상':'오류'}</strong><span>${report.products}개 상품 · 판매 ${report.active}개</span></div></header><div class="workboard-layout"><main class="workboard-phases"><details open><summary><strong>등록 상품</strong><span>${items.length}</span></summary><ul>${items.map(item=>`<li class="workboard-task ${item.status==='active'?'done':'todo'}"><span class="workboard-mark">${item.status==='active'?'✓':'○'}</span><span><strong>${esc(item.title)}</strong>${esc(item.type)} · ${item.price.toLocaleString()} ${esc(item.currency)}</span><em>${esc(item.status)} · 다운로드 ${item.downloads}</em></li>`).join('')}</ul></details></main><aside class="workboard-side"><section><h4>성과 합계</h4><p>주문 ${report.orders} · 다운로드 ${report.downloads} · 매출 ${report.revenue.toLocaleString()}원</p></section><section><h4>데이터 격리</h4><p>${esc(MANIFEST.dataNamespace)}</p></section><section><h4>검사 상태</h4><p>${report.valid?'PASS':'FAIL'} · 오류 ${report.errors.length}건</p></section></aside></div></section>`;
    return root;
  }

  function install() {
    if (!window.SavingioPluginManifest || !window.SavingioPluginManager) return false;
    const manifest=window.SavingioPluginManifest.create(MANIFEST);
    const current=window.SavingioPluginManager.get(PLUGIN_ID);
    if (!current) window.SavingioPluginManager.install(manifest,{source:'builtin'});
    else if (current.version!==manifest.version) window.SavingioPluginManager.update(manifest,{source:'builtin'});
    window.SavingioPluginUI?.sync?.();
    return true;
  }

  window.SavingioDigitalProductPlugin=Object.freeze({ manifest:MANIFEST, list:products, get, upsert, remove, reset, search, record, summary, audit, render, install });
  if (!install()) { window.addEventListener('savingio:plugin-manager-ready',install,{once:true}); setTimeout(install,500); }
})();