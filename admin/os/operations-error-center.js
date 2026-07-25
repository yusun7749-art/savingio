(() => {
  'use strict';

  const STORAGE_KEY = 'savingio-operations-error-center-v1';
  const $ = (selector, root=document) => root.querySelector(selector);
  const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const clone = value => JSON.parse(JSON.stringify(value));
  let statusFilter = 'open';
  let severityFilter = 'all';
  let sourceFilter = 'all';
  let query = '';

  function readState() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(value) ? value : [];
    } catch { return []; }
  }

  function writeState(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent('savingio:operations-errors-changed', { detail:{ items:clone(items) } }));
    return items;
  }

  function safeList(api) {
    try { const value = api?.list?.(); return Array.isArray(value) ? value : []; }
    catch { return []; }
  }

  function severityRank(level) {
    return ({critical:4,high:3,medium:2,low:1})[level] || 0;
  }

  function severityLabel(level) {
    return ({critical:'긴급',high:'높음',medium:'보통',low:'낮음'})[level] || '확인';
  }

  function severityFor(source, state, message='') {
    const text = `${state} ${message}`.toLowerCase();
    if (source === 'url' && (text.includes('blocked') || text.includes('unhealthy'))) return 'critical';
    if (source === 'cloudflare' && (text.includes('failed') || text.includes('error'))) return 'critical';
    if (source === 'github' && (text.includes('failure') || text.includes('error'))) return 'high';
    if (source === 'automation' || source === 'workflow' || source === 'project') return 'high';
    if (source === 'qa') return text.includes('fail') || text.includes('error') ? 'high' : 'medium';
    return 'medium';
  }

  function fingerprint(item) {
    return [item.source,item.projectId || '',item.targetId || '',item.code || '',item.title || '',item.message || ''].join('|').toLowerCase();
  }

  function normalize(item) {
    const now = new Date().toISOString();
    return {
      id:item.id || `ERR-${Math.random().toString(36).slice(2,10).toUpperCase()}`,
      fingerprint:item.fingerprint || fingerprint(item),
      source:item.source || 'system',
      sourceLabel:item.sourceLabel || item.source || 'System',
      projectId:String(item.projectId || ''),
      targetId:String(item.targetId || ''),
      title:String(item.title || '오류 알림'),
      message:String(item.message || ''),
      code:String(item.code || ''),
      severity:item.severity || severityFor(item.source,item.state,item.message),
      status:['open','acknowledged','resolved'].includes(item.status) ? item.status : 'open',
      occurrences:Number(item.occurrences || 1),
      firstSeenAt:item.firstSeenAt || now,
      lastSeenAt:item.lastSeenAt || now,
      acknowledgedAt:item.acknowledgedAt || null,
      resolvedAt:item.resolvedAt || null,
      url:String(item.url || '')
    };
  }

  function collectRaw() {
    const rows = [];
    const projects = safeList(window.SavingioProject);
    const workflows = safeList(window.SavingioWorkflow);
    const jobs = safeList(window.SavingioAutomation);
    const github = safeList(window.SavingioGitHubStatus);
    const cloudflare = safeList(window.SavingioCloudflareDeploy);
    const urls = safeList(window.SavingioUrlHealth);
    const qa = window.SavingioOperationsHQ?.qa?.() || null;

    projects.filter(item => item.status === 'error').forEach(item => rows.push({source:'project',sourceLabel:'Project',projectId:item.id,targetId:item.id,title:item.title || item.id,message:item.error || '프로젝트 오류 상태',state:item.status}));
    workflows.filter(item => item.status === 'error' || item.stages?.some(stage => stage.status === 'error')).forEach(item => rows.push({source:'workflow',sourceLabel:'Workflow',projectId:item.projectId,targetId:item.id,title:item.title || item.id,message:'워크플로 단계 오류',state:item.status}));
    jobs.filter(item => item.status === 'error').forEach(item => rows.push({source:'automation',sourceLabel:'Automation',projectId:item.projectId,targetId:item.id,title:item.title || item.id,message:item.error || '자동화 작업 오류',state:item.status}));
    github.filter(item => item.state === 'failure').forEach(item => rows.push({source:'github',sourceLabel:'GitHub',projectId:item.projectId,targetId:item.jobId,title:item.commitSha ? `Commit ${item.commitSha.slice(0,8)}` : item.repository,message:item.message || 'GitHub 검사 실패',state:item.state,url:item.commitUrl}));
    cloudflare.filter(item => item.state === 'failed').forEach(item => rows.push({source:'cloudflare',sourceLabel:'Cloudflare',projectId:item.projectId,targetId:item.id,title:item.projectName || 'Cloudflare Pages',message:item.error || '배포 실패',state:item.state,url:item.deploymentUrl || item.productionUrl}));
    urls.filter(item => ['unhealthy','blocked'].includes(item.state)).forEach(item => rows.push({source:'url',sourceLabel:'URL Health',projectId:item.projectId,targetId:item.id,title:item.url || item.id,message:item.error || `HTTP ${item.httpStatus || '-'}`,state:item.state,url:item.finalUrl || item.url}));
    (qa?.items || []).filter(item => ['FAIL','WARN'].includes(item.status)).forEach(item => rows.push({source:'qa',sourceLabel:'QA',targetId:item.id,title:item.title,message:`${item.status} · 오류 ${item.errors || 0} · 주의 ${item.warnings || 0}`,state:item.status,code:item.id,severity:item.status === 'FAIL' ? 'high' : 'medium'}));
    return rows.map(normalize);
  }

  function sync() {
    const stored = readState().map(normalize);
    const current = collectRaw();
    const map = new Map(stored.map(item => [item.fingerprint,item]));
    const activeFingerprints = new Set();
    current.forEach(item => {
      activeFingerprints.add(item.fingerprint);
      const old = map.get(item.fingerprint);
      if (old) map.set(item.fingerprint, normalize({...old,...item,id:old.id,status:old.status === 'resolved' ? 'open' : old.status,occurrences:old.occurrences + 1,firstSeenAt:old.firstSeenAt,lastSeenAt:new Date().toISOString(),resolvedAt:null}));
      else map.set(item.fingerprint,item);
    });
    map.forEach((item,key) => {
      if (!activeFingerprints.has(key) && item.status !== 'resolved') map.set(key,normalize({...item,status:'resolved',resolvedAt:new Date().toISOString()}));
    });
    return writeState([...map.values()].sort((a,b) => severityRank(b.severity)-severityRank(a.severity) || new Date(b.lastSeenAt)-new Date(a.lastSeenAt)).slice(0,300));
  }

  function counts(items) {
    return {
      open:items.filter(item => item.status === 'open').length,
      acknowledged:items.filter(item => item.status === 'acknowledged').length,
      resolved:items.filter(item => item.status === 'resolved').length,
      critical:items.filter(item => item.status !== 'resolved' && item.severity === 'critical').length
    };
  }

  function filtered(items) {
    const term=query.trim().toLowerCase();
    return items.filter(item => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (severityFilter !== 'all' && item.severity !== severityFilter) return false;
      if (sourceFilter !== 'all' && item.source !== sourceFilter) return false;
      if (term && ![item.title,item.message,item.projectId,item.sourceLabel,item.code].some(value => String(value||'').toLowerCase().includes(term))) return false;
      return true;
    });
  }

  function renderPanel() {
    const host = $('.operations-hq');
    if (!host) return;
    let panel = $('#operationsErrorCenter');
    if (!panel) {
      panel=document.createElement('article');
      panel.id='operationsErrorCenter';
      panel.className='ops-panel ops-wide ops-error-center';
      const qaPanel=$('.ops-qa-panel',host);
      if (qaPanel) qaPanel.insertAdjacentElement('afterend',panel); else host.appendChild(panel);
    }
    const items=sync();
    const stat=counts(items);
    const rows=filtered(items);
    const sources=[...new Set(items.map(item=>item.source))];
    panel.innerHTML=`<header><div><h4>오류 알림 센터</h4><small>중복 오류를 자동 병합하고 확인·해결 상태를 관리합니다.</small></div><button class="btn ghost small" data-error-action="sync">오류 다시 수집</button></header>
      <div class="ops-error-summary"><article class="critical"><small>긴급</small><strong>${stat.critical}</strong></article><article><small>미확인</small><strong>${stat.open}</strong></article><article><small>확인함</small><strong>${stat.acknowledged}</strong></article><article><small>해결됨</small><strong>${stat.resolved}</strong></article></div>
      <div class="ops-error-toolbar"><input type="search" data-error-search value="${esc(query)}" placeholder="프로젝트·오류·코드 검색"><div>${['open','acknowledged','resolved','all'].map(value=>`<button class="chip ${statusFilter===value?'active':''}" data-error-status="${value}">${value==='open'?'미확인':value==='acknowledged'?'확인함':value==='resolved'?'해결됨':'전체'}</button>`).join('')}</div><div>${['all','critical','high','medium','low'].map(value=>`<button class="chip ${severityFilter===value?'active':''}" data-error-severity="${value}">${value==='all'?'전체 등급':severityLabel(value)}</button>`).join('')}</div><select data-error-source><option value="all">전체 출처</option>${sources.map(value=>`<option value="${esc(value)}" ${sourceFilter===value?'selected':''}>${esc(value)}</option>`).join('')}</select></div>
      <div class="ops-error-list">${rows.length ? rows.map(item=>`<article class="ops-error-row ${item.severity} ${item.status}" data-error-id="${esc(item.id)}"><span class="ops-error-level">${severityLabel(item.severity)}</span><div><strong>${esc(item.title)}</strong><small>${esc(item.sourceLabel)}${item.projectId?` · ${esc(item.projectId)}`:''}${item.code?` · ${esc(item.code)}`:''}</small><p>${esc(item.message)}</p><time>최초 ${new Date(item.firstSeenAt).toLocaleString('ko-KR')} · 최근 ${new Date(item.lastSeenAt).toLocaleString('ko-KR')} · ${item.occurrences}회</time></div><em>${item.status==='open'?'미확인':item.status==='acknowledged'?'확인함':'해결됨'}</em><div class="ops-error-actions">${item.url?`<a href="${esc(item.url)}" target="_blank" rel="noopener">열기</a>`:''}${item.status==='open'?`<button class="btn ghost small" data-error-action="ack" data-error-id="${esc(item.id)}">확인</button>`:''}${item.status!=='resolved'?`<button class="btn primary small" data-error-action="resolve" data-error-id="${esc(item.id)}">해결</button>`:''}</div></article>`).join('') : '<p class="ops-empty">조건에 맞는 오류 알림이 없습니다.</p>'}</div>`;
    bind(panel);
  }

  function updateStatus(id,status) {
    const items=readState().map(normalize);
    const index=items.findIndex(item=>item.id===id);
    if(index<0)return;
    const now=new Date().toISOString();
    items[index]=normalize({...items[index],status,acknowledgedAt:status==='acknowledged'?now:items[index].acknowledgedAt,resolvedAt:status==='resolved'?now:null});
    writeState(items);
    renderPanel();
  }

  function bind(panel) {
    $('[data-error-action="sync"]',panel)?.addEventListener('click',renderPanel);
    $$('[data-error-status]',panel).forEach(button=>button.addEventListener('click',()=>{statusFilter=button.dataset.errorStatus;renderPanel();}));
    $$('[data-error-severity]',panel).forEach(button=>button.addEventListener('click',()=>{severityFilter=button.dataset.errorSeverity;renderPanel();}));
    $('[data-error-source]',panel)?.addEventListener('change',event=>{sourceFilter=event.target.value;renderPanel();});
    $('[data-error-search]',panel)?.addEventListener('input',event=>{query=event.target.value;renderPanel();requestAnimationFrame(()=>{const input=$('[data-error-search]');input?.focus();input?.setSelectionRange(query.length,query.length);});});
    $$('[data-error-action="ack"]',panel).forEach(button=>button.addEventListener('click',()=>updateStatus(button.dataset.errorId,'acknowledged')));
    $$('[data-error-action="resolve"]',panel).forEach(button=>button.addEventListener('click',()=>updateStatus(button.dataset.errorId,'resolved')));
  }

  function boot() {
    if (!document.querySelector('link[data-operations-error-center-css]')) {
      const link=document.createElement('link');link.rel='stylesheet';link.href='/admin/os/operations-error-center.css';link.dataset.operationsErrorCenterCss='true';document.head.appendChild(link);
    }
    window.addEventListener('savingio:operations-hq-rendered',()=>requestAnimationFrame(renderPanel));
    ['savingio:projects-changed','savingio:workflows-changed','savingio:automation-changed','savingio:github-status-changed','savingio:cloudflare-deployments-changed','savingio:url-health-changed','savingio:operations-hq-qa-completed'].forEach(name=>window.addEventListener(name,()=>{if($('.operations-hq'))requestAnimationFrame(renderPanel);}));
    window.SavingioOperationsErrorCenter=Object.freeze({sync,list:()=>clone(readState().map(normalize)),render:renderPanel,acknowledge:id=>updateStatus(id,'acknowledged'),resolve:id=>updateStatus(id,'resolved')});
    if($('.operations-hq'))renderPanel();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();