(() => {
  'use strict';

  const $ = (selector, root=document) => root.querySelector(selector);
  const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const clone = value => JSON.parse(JSON.stringify(value));
  let range = '7d';
  let stateFilter = 'all';
  let projectFilter = 'all';
  let query = '';

  function safeList(api) {
    try { const value=api?.list?.(); return Array.isArray(value) ? value : []; }
    catch { return []; }
  }

  function timeOf(value) { const time=Date.parse(value || ''); return Number.isFinite(time) ? time : 0; }
  function fmt(value) { return value ? new Date(value).toLocaleString('ko-KR') : '-'; }
  function duration(start, end) {
    const ms=timeOf(end)-timeOf(start);
    if (!(ms > 0)) return '-';
    const seconds=Math.round(ms/1000);
    if (seconds < 60) return `${seconds}초`;
    const minutes=Math.floor(seconds/60);
    return seconds < 3600 ? `${minutes}분 ${seconds%60}초` : `${Math.floor(minutes/60)}시간 ${minutes%60}분`;
  }

  function normalizeRows() {
    const projects=safeList(window.SavingioProject);
    const jobs=safeList(window.SavingioAutomation);
    const github=safeList(window.SavingioGitHubStatus);
    const deployments=safeList(window.SavingioCloudflareDeploy);
    const checks=safeList(window.SavingioUrlHealth);
    const projectMap=new Map(projects.map(item=>[item.id,item]));
    const githubMap=new Map(github.map(item=>[item.jobId,item]));
    const deploymentByJob=new Map(deployments.map(item=>[item.jobId,item]));
    const checkByJob=new Map(checks.map(item=>[item.jobId,item]));

    const ids=new Set([...jobs.map(item=>item.id),...github.map(item=>item.jobId),...deployments.map(item=>item.jobId),...checks.map(item=>item.jobId)].filter(Boolean));
    return [...ids].map(id => {
      const job=jobs.find(item=>item.id===id) || {};
      const gh=githubMap.get(id) || {};
      const deploy=deploymentByJob.get(id) || {};
      const health=checkByJob.get(id) || {};
      const project=projectMap.get(job.projectId || deploy.projectId || health.projectId) || {};
      const projectId=job.projectId || deploy.projectId || health.projectId || '';
      const createdAt=job.createdAt || gh.checkedAt || deploy.createdAt || health.createdAt || new Date().toISOString();
      const completedAt=health.checkedAt || deploy.completedAt || gh.checkedAt || job.completedAt || null;
      let state='running';
      if (gh.state==='failure' || deploy.state==='failed' || ['unhealthy','blocked'].includes(health.state) || job.status==='error') state='failed';
      else if (health.state==='healthy') state='success';
      else if (deploy.state==='deployed') state='verifying';
      else if (gh.state==='success') state='deploying';
      else if (job.status==='queued') state='queued';
      return {
        id,
        projectId,
        projectTitle:project.title || job.payload?.projectTitle || projectId || '프로젝트 미지정',
        repository:job.repository || gh.repository || deploy.repository || '',
        branch:job.branch || gh.branch || deploy.branch || 'main',
        commitSha:gh.commitSha || deploy.commitSha || job.commitSha || '',
        commitUrl:gh.commitUrl || job.commitUrl || '',
        deploymentId:deploy.id || '',
        deploymentUrl:deploy.deploymentUrl || '',
        productionUrl:deploy.productionUrl || job.productionUrl || health.url || '',
        healthId:health.id || '',
        httpStatus:health.httpStatus || 0,
        responseTimeMs:health.responseTimeMs || 0,
        githubState:gh.state || job.githubState || 'unknown',
        deployState:deploy.state || job.cloudflareState || 'unknown',
        healthState:health.state || job.urlHealthState || 'unknown',
        state,
        createdAt,
        completedAt,
        elapsed:duration(createdAt,completedAt),
        error:health.error || deploy.error || gh.message || job.error || '',
        attempts:Math.max(Number(job.attempts||0),Number(deploy.attempts||0))
      };
    }).sort((a,b)=>timeOf(b.createdAt)-timeOf(a.createdAt));
  }

  function withinRange(item) {
    if (range === 'all') return true;
    const days=range==='24h' ? 1 : range==='30d' ? 30 : 7;
    return timeOf(item.createdAt) >= Date.now()-days*86400000;
  }

  function filtered(rows) {
    const term=query.trim().toLowerCase();
    return rows.filter(item => {
      if (!withinRange(item)) return false;
      if (stateFilter !== 'all' && item.state !== stateFilter) return false;
      if (projectFilter !== 'all' && item.projectId !== projectFilter) return false;
      if (term && ![item.projectTitle,item.projectId,item.commitSha,item.repository,item.productionUrl,item.error].some(value=>String(value||'').toLowerCase().includes(term))) return false;
      return true;
    });
  }

  function stateLabel(state) {
    return ({queued:'대기',running:'진행 중',deploying:'배포 중',verifying:'URL 확인 중',success:'성공',failed:'실패'})[state] || '확인';
  }

  function stageClass(actual, successValue, failureValue) {
    if (actual === failureValue || actual === 'failure' || actual === 'failed' || actual === 'unhealthy' || actual === 'blocked') return 'fail';
    if (actual === successValue) return 'done';
    if (['pending','running','queued','deploying','checking'].includes(actual)) return 'active';
    return 'wait';
  }

  function retry(item) {
    if (!item) return;
    let targetType='github'; let targetId=item.commitSha;
    if (['failed'].includes(item.deployState)) { targetType='cloudflare'; targetId=item.deploymentId; }
    if (['unhealthy','blocked'].includes(item.healthState)) { targetType='url'; targetId=item.healthId; }
    const record=window.SavingioRetry?.recordFailure?.({jobId:item.id,projectId:item.projectId,targetType,targetId,reason:'Operations HQ 수동 재시도',error:item.error,maxAttempts:3});
    if (record) window.SavingioRetry?.execute?.(record.id);
    window.dispatchEvent(new CustomEvent('savingio:deployment-history-retry',{detail:{item:clone(item),record:clone(record)}}));
    renderPanel();
  }

  function renderPanel() {
    const host=$('.operations-hq');
    if (!host) return;
    let panel=$('#deploymentHistoryPanel');
    if (!panel) {
      panel=document.createElement('article');
      panel.id='deploymentHistoryPanel';
      panel.className='ops-panel ops-wide deployment-history-panel';
      const approval=$('#approvalCenter');
      if (approval) approval.insertAdjacentElement('afterend',panel); else host.appendChild(panel);
    }
    const rows=normalizeRows();
    const visible=filtered(rows);
    const projects=[...new Map(rows.filter(item=>item.projectId).map(item=>[item.projectId,item.projectTitle])).entries()];
    const stat={total:visible.length,success:visible.filter(item=>item.state==='success').length,failed:visible.filter(item=>item.state==='failed').length,running:visible.filter(item=>!['success','failed'].includes(item.state)).length};
    panel.innerHTML=`<header><div><h4>최근 배포 이력</h4><small>GitHub 반영부터 Cloudflare 배포와 실제 URL 확인까지 한 흐름으로 추적합니다.</small></div><button class="btn ghost small" data-deploy-action="refresh">새로고침</button></header>
      <div class="deployment-history-summary"><article><small>전체</small><strong>${stat.total}</strong></article><article class="success"><small>성공</small><strong>${stat.success}</strong></article><article class="failed"><small>실패</small><strong>${stat.failed}</strong></article><article><small>진행 중</small><strong>${stat.running}</strong></article></div>
      <div class="deployment-history-toolbar"><input type="search" data-deploy-search value="${esc(query)}" placeholder="프로젝트·커밋·URL 검색"><div>${['24h','7d','30d','all'].map(value=>`<button class="chip ${range===value?'active':''}" data-deploy-range="${value}">${value==='24h'?'24시간':value==='7d'?'7일':value==='30d'?'30일':'전체'}</button>`).join('')}</div><div>${['all','success','failed','running'].map(value=>`<button class="chip ${stateFilter===value?'active':''}" data-deploy-state="${value}">${value==='all'?'전체 상태':stateLabel(value)}</button>`).join('')}</div><select data-deploy-project><option value="all">전체 프로젝트</option>${projects.map(([id,title])=>`<option value="${esc(id)}" ${projectFilter===id?'selected':''}>${esc(title)}</option>`).join('')}</select></div>
      <div class="deployment-history-list">${visible.length ? visible.map(item=>`<article class="deployment-history-row ${item.state}" data-deploy-id="${esc(item.id)}"><div class="deployment-history-main"><span class="deployment-state">${stateLabel(item.state)}</span><div><strong>${esc(item.projectTitle)}</strong><small>${esc(item.projectId)} · ${esc(item.repository)} · ${esc(item.branch)}</small><time>${fmt(item.createdAt)} · 소요 ${esc(item.elapsed)}${item.attempts?` · 시도 ${item.attempts}회`:''}</time></div><div class="deployment-links">${item.commitUrl?`<a href="${esc(item.commitUrl)}" target="_blank" rel="noopener">Commit ${esc(item.commitSha.slice(0,8))}</a>`:item.commitSha?`<span>Commit ${esc(item.commitSha.slice(0,8))}</span>`:''}${item.deploymentUrl?`<a href="${esc(item.deploymentUrl)}" target="_blank" rel="noopener">배포 URL</a>`:''}${item.productionUrl?`<a href="${esc(item.productionUrl)}" target="_blank" rel="noopener">운영 URL</a>`:''}</div></div><div class="deployment-timeline"><span class="${stageClass(item.githubState,'success','failure')}"><i>1</i><b>GitHub</b><em>${esc(item.githubState)}</em></span><span class="${stageClass(item.deployState,'deployed','failed')}"><i>2</i><b>Cloudflare</b><em>${esc(item.deployState)}</em></span><span class="${stageClass(item.healthState,'healthy','unhealthy')}"><i>3</i><b>URL 확인</b><em>${item.httpStatus?`HTTP ${item.httpStatus}`:esc(item.healthState)}</em></span></div>${item.error?`<p class="deployment-error">${esc(item.error)}</p>`:''}<footer><span>${item.responseTimeMs?`응답 ${item.responseTimeMs}ms`:''}</span>${item.state==='failed'?`<button class="btn primary small" data-deploy-action="retry" data-deploy-id="${esc(item.id)}">재시도</button>`:''}</footer></article>`).join('') : '<p class="ops-empty">조건에 맞는 배포 이력이 없습니다.</p>'}</div>`;
    bind(panel,rows);
    window.dispatchEvent(new CustomEvent('savingio:deployment-history-rendered',{detail:{rows:clone(rows)}}));
  }

  function bind(panel,rows) {
    $('[data-deploy-action="refresh"]',panel)?.addEventListener('click',renderPanel);
    $$('[data-deploy-range]',panel).forEach(button=>button.addEventListener('click',()=>{range=button.dataset.deployRange;renderPanel();}));
    $$('[data-deploy-state]',panel).forEach(button=>button.addEventListener('click',()=>{stateFilter=button.dataset.deployState;renderPanel();}));
    $('[data-deploy-project]',panel)?.addEventListener('change',event=>{projectFilter=event.target.value;renderPanel();});
    $('[data-deploy-search]',panel)?.addEventListener('input',event=>{query=event.target.value;renderPanel();requestAnimationFrame(()=>{const input=$('[data-deploy-search]');input?.focus();input?.setSelectionRange(query.length,query.length);});});
    $$('[data-deploy-action="retry"]',panel).forEach(button=>button.addEventListener('click',()=>retry(rows.find(item=>item.id===button.dataset.deployId))));
  }

  function boot() {
    if (!document.querySelector('link[data-deployment-history-css]')) {
      const link=document.createElement('link');link.rel='stylesheet';link.href='/admin/os/deployment-history.css';link.dataset.deploymentHistoryCss='true';document.head.appendChild(link);
    }
    window.addEventListener('savingio:operations-hq-rendered',()=>requestAnimationFrame(renderPanel));
    ['savingio:automation-jobs-changed','savingio:github-status-changed','savingio:cloudflare-deployments-changed','savingio:url-health-changed','savingio:retry-records-changed'].forEach(name=>window.addEventListener(name,()=>{if($('.operations-hq'))requestAnimationFrame(renderPanel);}));
    window.SavingioDeploymentHistory=Object.freeze({list:()=>clone(normalizeRows()),render:renderPanel,retry:id=>retry(normalizeRows().find(item=>item.id===String(id)))});
    if ($('.operations-hq')) renderPanel();
  }

  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();