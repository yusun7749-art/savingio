(() => {
  'use strict';

  const PLUGIN_ID = 'savingio.coupon-affiliate';
  const MANIFEST = {
    specVersion:'1.0.0', id:PLUGIN_ID, name:'Savingio 쿠폰·제휴', version:'1.0.0',
    description:'쿠폰·제휴 링크·캠페인·노출 상태·성과 기록을 관리하는 Plugin', author:'Savingio',
    target:['admin'], entry:'/admin/plugins/coupon-affiliate-plugin.js',
    permissions:['menu:register','workboard:register','storage:read','storage:write'],
    dataNamespace:'savingio.coupon-affiliate', enabledByDefault:true,
    menu:{ id:'coupon-affiliate-plugin-menu', label:'쿠폰·제휴 관리', icon:'🎟️', order:60, parent:'plugins', route:'coupon-affiliate-plugin-board' },
    workboard:{ id:'coupon-affiliate-plugin-board', title:'쿠폰·제휴 Plugin', department:'revenue', order:60, renderer:'SavingioCouponAffiliatePlugin.render' }
  };

  const DEFAULT_CAMPAIGNS = [
    { id:'savingio-coupon-sample', title:'Savingio 쿠폰 샘플', partner:'Savingio', type:'coupon', code:'SAVINGIO', url:'#', category:'sample', disclosure:'제휴 또는 쿠폰 링크가 포함될 수 있습니다.', startsAt:null, endsAt:null, status:'draft', priority:10, tags:['sample'], clicks:0, conversions:0, revenue:0, createdAt:'2026-07-25T00:00:00.000Z', updatedAt:'2026-07-25T00:00:00.000Z' }
  ];

  const clone = value => JSON.parse(JSON.stringify(value));
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const context = () => window.SavingioPluginSecurity?.createContext(PLUGIN_ID);
  const campaigns = () => context()?.storage.get('campaigns', DEFAULT_CAMPAIGNS) || clone(DEFAULT_CAMPAIGNS);
  const save = items => { context()?.storage.set('campaigns', clone(items)); return clone(items); };

  function normalize(input={}) {
    const now = new Date().toISOString();
    return {
      id:String(input.id || '').trim(), title:String(input.title || '').trim(), partner:String(input.partner || '').trim(),
      type:String(input.type || 'affiliate').trim(), code:String(input.code || '').trim(), url:String(input.url || '').trim(),
      category:String(input.category || 'uncategorized').trim(), disclosure:String(input.disclosure || '').trim(),
      startsAt:input.startsAt || null, endsAt:input.endsAt || null, status:String(input.status || 'draft').trim(),
      priority:Number(input.priority || 0), tags:[...new Set((Array.isArray(input.tags) ? input.tags : []).map(tag=>String(tag).trim()).filter(Boolean))],
      clicks:Number(input.clicks || 0), conversions:Number(input.conversions || 0), revenue:Number(input.revenue || 0),
      createdAt:input.createdAt || now, updatedAt:now
    };
  }

  function validate(input) {
    const campaign = normalize(input);
    const errors = [];
    if (!campaign.id) errors.push('CAMPAIGN_ID_REQUIRED');
    if (!campaign.title) errors.push('CAMPAIGN_TITLE_REQUIRED');
    if (!campaign.partner) errors.push('CAMPAIGN_PARTNER_REQUIRED');
    if (!['coupon','affiliate','promotion'].includes(campaign.type)) errors.push('CAMPAIGN_TYPE_INVALID');
    if (!['draft','active','paused','expired','archived'].includes(campaign.status)) errors.push('CAMPAIGN_STATUS_INVALID');
    if (!campaign.url) errors.push('CAMPAIGN_URL_REQUIRED');
    if (campaign.startsAt && campaign.endsAt && new Date(campaign.startsAt) > new Date(campaign.endsAt)) errors.push('CAMPAIGN_DATE_INVALID');
    if ([campaign.clicks,campaign.conversions,campaign.revenue].some(value=>value < 0 || !Number.isFinite(value))) errors.push('CAMPAIGN_METRIC_INVALID');
    return { valid:errors.length===0, errors:[...new Set(errors)], campaign };
  }

  function upsert(input) {
    const report = validate(input);
    if (!report.valid) throw Object.assign(new Error(`캠페인 정의가 올바르지 않습니다: ${report.errors.join(', ')}`), { code:'CAMPAIGN_INVALID', details:report });
    const items = campaigns().filter(item=>item.id!==report.campaign.id);
    items.push(report.campaign);
    save(items);
    return clone(report.campaign);
  }

  function remove(id) { const items=campaigns().filter(item=>item.id!==String(id||'')); save(items); return items; }
  function reset() { save(DEFAULT_CAMPAIGNS); return clone(DEFAULT_CAMPAIGNS); }
  function get(id) { return clone(campaigns().find(item=>item.id===String(id||'')) || null); }
  function isLive(item, now=new Date()) {
    if (item.status !== 'active') return false;
    if (item.startsAt && new Date(item.startsAt) > now) return false;
    if (item.endsAt && new Date(item.endsAt) < now) return false;
    return true;
  }
  function search(query='', filters={}) {
    const needle = String(query || '').trim().toLowerCase();
    return clone(campaigns().filter(item => {
      const haystack=[item.title,item.partner,item.type,item.code,item.category,...item.tags].join(' ').toLowerCase();
      if (needle && !haystack.includes(needle)) return false;
      if (filters.partner && item.partner !== filters.partner) return false;
      if (filters.type && item.type !== filters.type) return false;
      if (filters.status && item.status !== filters.status) return false;
      if (filters.live === true && !isLive(item)) return false;
      return true;
    }).sort((a,b)=>b.priority-a.priority || new Date(b.updatedAt)-new Date(a.updatedAt)));
  }
  function record(id, metrics={}) {
    let changed = null;
    const items = campaigns().map(item => {
      if (item.id !== id) return item;
      changed = {...item, clicks:item.clicks+Number(metrics.clicks||0), conversions:item.conversions+Number(metrics.conversions||0), revenue:item.revenue+Number(metrics.revenue||0), updatedAt:new Date().toISOString()};
      return changed;
    });
    if (!changed) throw Object.assign(new Error(`캠페인을 찾을 수 없습니다: ${id}`), { code:'CAMPAIGN_NOT_FOUND' });
    save(items);
    return clone(changed);
  }
  function summary() {
    const items=campaigns();
    return { campaigns:items.length, active:items.filter(item=>isLive(item)).length, clicks:items.reduce((sum,item)=>sum+item.clicks,0), conversions:items.reduce((sum,item)=>sum+item.conversions,0), revenue:items.reduce((sum,item)=>sum+item.revenue,0) };
  }
  function audit() {
    const reports=campaigns().map(validate);
    const ids=reports.map(report=>report.campaign.id);
    const errors=reports.flatMap(report=>report.errors);
    ids.filter((id,index,all)=>id && all.indexOf(id)!==index).forEach(id=>errors.push(`CAMPAIGN_ID_DUPLICATE:${id}`));
    return { valid:errors.length===0, errors:[...new Set(errors)], ...summary() };
  }

  function render(root) {
    const items=campaigns();
    const report=audit();
    root.innerHTML=`<section class="workboard-view"><header class="workboard-head"><div><p class="eyebrow">SAVINGIO PLUGIN</p><h3>쿠폰·제휴 관리</h3><p>쿠폰·제휴 캠페인과 노출 상태, 클릭·전환·수익 기록을 관리합니다.</p></div><div class="workboard-current"><small>정의 검사</small><strong>${report.valid?'정상':'오류'}</strong><span>${report.campaigns}개 캠페인 · 활성 ${report.active}개</span></div></header><div class="workboard-layout"><main class="workboard-phases"><details open><summary><strong>등록 캠페인</strong><span>${items.length}</span></summary><ul>${items.map(item=>`<li class="workboard-task ${isLive(item)?'done':'todo'}"><span class="workboard-mark">${isLive(item)?'✓':'○'}</span><span><strong>${esc(item.title)}</strong>${esc(item.partner)} · ${esc(item.code || item.type)}</span><em>${esc(item.status)} · 클릭 ${item.clicks}</em></li>`).join('')}</ul></details></main><aside class="workboard-side"><section><h4>성과 합계</h4><p>클릭 ${report.clicks} · 전환 ${report.conversions} · 수익 ${report.revenue.toLocaleString()}원</p></section><section><h4>데이터 격리</h4><p>${esc(MANIFEST.dataNamespace)}</p></section><section><h4>검사 상태</h4><p>${report.valid?'PASS':'FAIL'} · 오류 ${report.errors.length}건</p></section></aside></div></section>`;
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

  window.SavingioCouponAffiliatePlugin=Object.freeze({ manifest:MANIFEST, list:campaigns, get, upsert, remove, reset, search, isLive, record, summary, audit, render, install });
  if (!install()) { window.addEventListener('savingio:plugin-manager-ready',install,{once:true}); setTimeout(install,450); }
})();