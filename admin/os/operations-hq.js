(() => {
  'use strict';

  const $ = selector => document.querySelector(selector);
  const clone = value => JSON.parse(JSON.stringify(value));
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  let refreshTimer = null;
  let lastRenderedAt = null;
  let monitorFilter = 'all';
  let qaFilter = 'all';
  let qaSnapshot = null;

  function safeList(api) {
    try { const value = api?.list?.(); return Array.isArray(value) ? value : []; }
    catch { return []; }
  }

  function projectProgress(project) {
    if (Number.isFinite(Number(project.progress))) return Math.max(0, Math.min(100, Number(project.progress)));
    const stages = Array.isArray(project.stages) ? project.stages : [];
    if (!stages.length) return project.status === 'done' ? 100 : 0;
    return Math.round(stages.filter(stage => stage.status === 'done' || stage[1] === 'done').length / stages.length * 100);
  }

  function collect() {
    const projects = safeList(window.SavingioProject);
    const jobs = safeList(window.SavingioAutomation);
    const github = safeList(window.SavingioGitHubStatus);
    const cloudflare = safeList(window.SavingioCloudflareDeploy);
    const urls = safeList(window.SavingioUrlHealth);
    const retries = safeList(window.SavingioRetry);
    const nextTasks = safeList(window.SavingioNextTask);
    const workflows = safeList(window.SavingioWorkflow);
    const automationQA = window.SavingioAutomationQA?.latest?.() || null;
    const pluginQA = window.SavingioPluginMarketplaceQA?.latest?.() || null;
    const projectQA = window.SAVINGIO_PROJECT_QA_LAST || null;
    const controller = window.SavingioAutomationController?.state?.() || { paused:false, locks:[], history:[] };

    const workflowByProject = new Map(workflows.filter(item => item.projectId).map(item => [String(item.projectId), item]));
    const liveProjects = projects.map(project => {
      const workflow = workflowByProject.get(String(project.id));
      const projectJobs = jobs.filter(job => String(job.projectId || '') === String(project.id));
      const activeStage = workflow?.stages?.find(stage => ['active','review','error','paused'].includes(stage.status));
      return {
        ...project,
        progress:projectProgress(project),
        workflowStatus:workflow?.status || '',
        currentStage:activeStage?.name || '',
        runningJobs:projectJobs.filter(job => job.status === 'running').length,
        queuedJobs:projectJobs.filter(job => job.status === 'queued').length,
        errorJobs:projectJobs.filter(job => job.status === 'error').length
      };
    });

    const approval = liveProjects.filter(item => ['approval','waiting-approval','pending'].includes(item.status) || item.workflowStatus === 'review');
    const errors = [
      ...liveProjects.filter(item => item.status === 'error' || item.errorJobs).map(item => ({type:'프로젝트', id:item.id, title:item.title || item.id, state:item.status === 'error' ? item.status : `자동화 오류 ${item.errorJobs}`})),
      ...jobs.filter(item => item.status === 'error').map(item => ({type:'자동화', id:item.id, title:item.title || item.id, state:item.status})),
      ...cloudflare.filter(item => ['failed','error'].includes(item.status || item.state)).map(item => ({type:'배포', id:item.id, title:item.deploymentUrl || item.productionUrl || item.id, state:item.status || item.state})),
      ...urls.filter(item => ['unhealthy','blocked','error'].includes(item.status || item.state)).map(item => ({type:'URL', id:item.id, title:item.url || item.id, state:item.status || item.state}))
    ];

    const githubAudit = window.SavingioGitHubStatus?.audit?.() || {valid:true,errors:[],warnings:[],total:github.length};
    const cloudflareAudit = window.SavingioCloudflareDeploy?.audit?.() || {valid:true,errors:[],warnings:[],total:cloudflare.length};
    const urlAudit = window.SavingioUrlHealth?.audit?.() || {valid:true,errors:[],warnings:[],total:urls.length};

    return {
      projects:liveProjects, jobs, github, cloudflare, urls, retries, nextTasks, approval, errors, automationQA, pluginQA, projectQA, controller, workflows,
      audits:{github:githubAudit,cloudflare:cloudflareAudit,url:urlAudit},
      summary:{
        projects:liveProjects.length,
        running:liveProjects.filter(item => ['running','active'].includes(item.status) || item.runningJobs).length,
        approval:approval.length,
        errors:errors.length,
        queued:jobs.filter(item => item.status === 'queued').length,
        runningJobs:jobs.filter(item => item.status === 'running').length,
        deploySuccess:cloudflare.filter(item => ['success','deployed','ready'].includes(item.status || item.state)).length,
        healthy:urls.filter(item => ['healthy','ok','pass'].includes(item.status || item.state)).length
      }
    };
  }

  function statusClass(value) {
    const text=String(value||'').toLowerCase();
    if (['pass','success','healthy','ok','ready','deployed','done','완료'].some(token=>text.includes(token))) return 'pass';
    if (['fail','error','unhealthy','blocked','failed','오류'].some(token=>text.includes(token))) return 'fail';
    if (['warn','queued','pending','approval','running','active','review','checking','deploying','진행','대기'].some(token=>text.includes(token))) return 'warn';
    return 'neutral';
  }

  function card(label, value, meta='') {
    return `<article class="ops-metric"><small>${esc(label)}</small><strong>${esc(value)}</strong><span>${esc(meta)}</span></article>`;
  }

  function listRows(items, emptyText) {
    if (!items.length) return `<p class="ops-empty">${esc(emptyText)}</p>`;
    return `<ul class="ops-list">${items.slice(0,8).map(item=>`<li><span><strong>${esc(item.title || item.name || item.url || item.id)}</strong><small>${esc(item.type || item.category || item.id || '')}</small></span><em class="ops-state ${statusClass(item.status || item.state)}">${esc(item.statusLabel || item.status || item.state || '확인')}</em></li>`).join('')}</ul>`;
  }

  function liveProjectRows(projects) {
    if (!projects.length) return '<p class="ops-empty">등록된 프로젝트가 없습니다.</p>';
    return `<div class="ops-project-board">${projects.map(item => `<article class="ops-project-row" data-ops-project="${esc(item.id)}"><div class="ops-project-main"><div><strong>${esc(item.title || item.id)}</strong><small>${esc(item.category || '미분류')}${item.currentStage ? ` · 현재 ${esc(item.currentStage)}` : ''}</small></div><em class="ops-state ${statusClass(item.status || item.workflowStatus)}">${esc(item.statusLabel || item.status || item.workflowStatus || '확인')}</em></div><div class="ops-project-progress"><span><i style="width:${item.progress}%"></i></span><strong>${item.progress}%</strong></div><div class="ops-project-jobs"><span>실행 ${item.runningJobs}</span><span>대기 ${item.queuedJobs}</span><span class="${item.errorJobs ? 'has-error' : ''}">오류 ${item.errorJobs}</span></div></article>`).join('')}</div>`;
  }

  function monitorRows(data) {
    const rows = [
      ...data.github.map(item => ({kind:'github',title:item.commitSha ? `Commit ${item.commitSha.slice(0,8)}` : item.repository,meta:`${item.repository} · ${item.branch} · ${item.jobId || 'Job 미연결'}`,state:item.state,at:item.checkedAt,url:item.commitUrl,id:item.jobId})),
      ...data.cloudflare.map(item => ({kind:'cloudflare',title:item.projectName || 'Cloudflare Pages',meta:`${item.environment} · ${item.commitSha ? item.commitSha.slice(0,8) : 'SHA 없음'} · 시도 ${item.attempts}`,state:item.state,at:item.checkedAt || item.updatedAt,url:item.deploymentUrl || item.productionUrl,id:item.id})),
      ...data.urls.map(item => ({kind:'url',title:item.url || 'URL 미지정',meta:`HTTP ${item.httpStatus || '-'} · ${item.responseTimeMs || 0}ms · 시도 ${item.attempts}`,state:item.state,at:item.checkedAt || item.updatedAt,url:item.finalUrl || item.url,id:item.id}))
    ].filter(item => monitorFilter === 'all' || item.kind === monitorFilter).sort((a,b) => new Date(b.at || 0) - new Date(a.at || 0));
    if (!rows.length) return '<p class="ops-empty">선택한 모니터 기록이 없습니다.</p>';
    return `<div class="ops-monitor-list">${rows.slice(0,30).map(item=>`<article class="ops-monitor-row"><span class="ops-monitor-kind ${item.kind}">${item.kind === 'github' ? 'GitHub' : item.kind === 'cloudflare' ? 'Cloudflare' : 'URL'}</span><div><strong>${esc(item.title)}</strong><small>${esc(item.meta)}</small><time>${item.at ? new Date(item.at).toLocaleString('ko-KR') : '확인 시각 없음'}</time></div><em class="ops-state ${statusClass(item.state)}">${esc(item.state || 'unknown')}</em>${item.url ? `<a href="${esc(item.url)}" target="_blank" rel="noopener">열기</a>` : ''}</article>`).join('')}</div>`;
  }

  function auditSummary(title,audit) {
    const status = audit.valid && !(audit.warnings || []).length ? 'PASS' : audit.valid ? 'WARN' : 'FAIL';
    return `<article class="ops-audit-card ${statusClass(status)}"><span>${esc(title)}</span><strong>${status}</strong><small>오류 ${(audit.errors||[]).length} · 주의 ${(audit.warnings||[]).length} · 기록 ${audit.total||0}</small></article>`;
  }

  function normalizeQaItem(id,title,report,issues=[]) {
    const errors = Number(report?.counts?.error ?? report?.errors?.length ?? report?.errors ?? 0);
    const warnings = Number(report?.counts?.warning ?? report?.warnings?.length ?? report?.warnings ?? 0);
    const explicit = String(report?.status || '').toUpperCase();
    const status = explicit || (report?.valid === false || errors ? 'FAIL' : warnings ? 'WARN' : report ? 'PASS' : 'NOT RUN');
    const checkedAt = report?.completedAt || report?.checkedAt || report?.startedAt || null;
    return {id,title,status,errors,warnings,checkedAt,issues};
  }

  function buildQaSnapshot(data) {
    const workflowReports = data.workflows.map(workflow => {
      try { return window.SavingioWorkflowBoard?.audit?.(workflow) || null; } catch { return null; }
    }).filter(Boolean);
    const workflowErrors = workflowReports.reduce((sum,item)=>sum+Number(item.errors||0),0);
    const workflowWarnings = workflowReports.reduce((sum,item)=>sum+Number(item.warnings||0),0);
    const workflowStatus = workflowErrors ? 'FAIL' : workflowWarnings ? 'WARN' : workflowReports.length ? 'PASS' : 'NOT RUN';
    const items = [
      normalizeQaItem('project','Project Engine',data.projectQA,[...(data.projectQA?.errors||[]),...(data.projectQA?.warnings||[])]),
      normalizeQaItem('workflow','Workflow Engine',{status:workflowStatus,errors:workflowErrors,warnings:workflowWarnings,checkedAt:new Date().toISOString()},workflowReports.flatMap(item=>item.issues||[]).map(item=>item.code || item.message)),
      normalizeQaItem('automation','Automation Engine',data.automationQA,(data.automationQA?.checks||[]).filter(item=>item.level==='error'||item.level==='warning').map(item=>item.code || item.title)),
      normalizeQaItem('plugin','Plugin Marketplace',data.pluginQA,(data.pluginQA?.checks||[]).filter(item=>item.level==='error'||item.level==='warning'||item.pass===false).map(item=>item.code || item.title)),
      normalizeQaItem('github','GitHub Status',{valid:data.audits.github.valid,errors:data.audits.github.errors,warnings:data.audits.github.warnings,checkedAt:new Date().toISOString()},[...(data.audits.github.errors||[]),...(data.audits.github.warnings||[])]),
      normalizeQaItem('cloudflare','Cloudflare Deploy',{valid:data.audits.cloudflare.valid,errors:data.audits.cloudflare.errors,warnings:data.audits.cloudflare.warnings,checkedAt:new Date().toISOString()},[...(data.audits.cloudflare.errors||[]),...(data.audits.cloudflare.warnings||[])]),
      normalizeQaItem('url','URL Health',{valid:data.audits.url.valid,errors:data.audits.url.errors,warnings:data.audits.url.warnings,checkedAt:new Date().toISOString()},[...(data.audits.url.errors||[]),...(data.audits.url.warnings||[])])
    ];
    const totals = items.reduce((acc,item)=>{acc.errors+=item.errors;acc.warnings+=item.warnings;acc.pass+=item.status==='PASS'?1:0;acc.fail+=item.status==='FAIL'?1:0;return acc;},{errors:0,warnings:0,pass:0,fail:0});
    return {checkedAt:new Date().toISOString(),items,totals,status:totals.fail?'FAIL':totals.warnings?'WARN':'PASS'};
  }

  function qaPanel(snapshot) {
    const filtered = snapshot.items.filter(item=>qaFilter==='all'||item.status===qaFilter);
    return `<article class="ops-panel ops-wide ops-qa-panel"><header><div><h4>QA 결과 통합 패널</h4><small>Project · Workflow · Automation · Plugin · 배포 검사를 한 번에 확인합니다.</small></div><button class="btn primary small" data-ops-action="run-all-qa">전체 QA 다시 실행</button></header><div class="ops-qa-summary"><article class="${statusClass(snapshot.status)}"><small>종합 상태</small><strong>${snapshot.status}</strong></article><article><small>PASS 모듈</small><strong>${snapshot.totals.pass}</strong></article><article><small>FAIL 모듈</small><strong>${snapshot.totals.fail}</strong></article><article><small>오류</small><strong>${snapshot.totals.errors}</strong></article><article><small>주의</small><strong>${snapshot.totals.warnings}</strong></article></div><div class="ops-monitor-toolbar"><button class="chip ${qaFilter==='all'?'active':''}" data-qa-filter="all">전체 ${snapshot.items.length}</button><button class="chip ${qaFilter==='PASS'?'active':''}" data-qa-filter="PASS">PASS ${snapshot.items.filter(item=>item.status==='PASS').length}</button><button class="chip ${qaFilter==='WARN'?'active':''}" data-qa-filter="WARN">WARN ${snapshot.items.filter(item=>item.status==='WARN').length}</button><button class="chip ${qaFilter==='FAIL'?'active':''}" data-qa-filter="FAIL">FAIL ${snapshot.items.filter(item=>item.status==='FAIL').length}</button></div><div class="ops-qa-list">${filtered.map(item=>`<details class="ops-qa-row ${statusClass(item.status)}"><summary><span><strong>${esc(item.title)}</strong><small>${item.checkedAt ? new Date(item.checkedAt).toLocaleString('ko-KR') : '검사 기록 없음'}</small></span><span class="ops-qa-counts">오류 ${item.errors} · 주의 ${item.warnings}</span><em class="ops-state ${statusClass(item.status)}">${esc(item.status)}</em></summary>${item.issues.length ? `<ul>${item.issues.slice(0,30).map(issue=>`<li>${esc(typeof issue==='string'?issue:issue.code||issue.message||JSON.stringify(issue))}</li>`).join('')}</ul>` : '<p>표시할 오류·주의 항목이 없습니다.</p>'}</details>`).join('') || '<p class="ops-empty">선택한 QA 결과가 없습니다.</p>'}</div></article>`;
  }

  async function runQueuedUrlChecks(root) {
    const checks=safeList(window.SavingioUrlHealth).filter(item=>['queued','unknown','unhealthy','blocked'].includes(item.state));
    const button=root.querySelector('[data-ops-action="check-urls"]');
    if (button) { button.disabled=true; button.textContent=`URL 검사 중 0/${checks.length}`; }
    for (let index=0; index<checks.length; index+=1) {
      try { await window.SavingioUrlHealth?.check?.(checks[index].id); } catch {}
      if (button) button.textContent=`URL 검사 중 ${index+1}/${checks.length}`;
    }
    render(root);
  }

  function runAllQa(root) {
    try { window.SAVINGIO_PROJECT_QA_LAST = window.SavingioProjectQA?.run?.() || window.SAVINGIO_PROJECT_QA_LAST; } catch {}
    try { window.SavingioAutomationQA?.run?.({trigger:'operations-hq'}); } catch {}
    try { window.SavingioPluginMarketplaceQA?.run?.({trigger:'operations-hq'}); } catch {}
    qaSnapshot = buildQaSnapshot(collect());
    window.dispatchEvent(new CustomEvent('savingio:operations-hq-qa-completed',{detail:clone(qaSnapshot)}));
    render(root);
  }

  function render(root=$('#departmentBoard')) {
    if (!root) return null;
    const data=collect();
    qaSnapshot = buildQaSnapshot(data);
    lastRenderedAt = new Date();
    root.innerHTML=`<section class="operations-hq">
      <header class="ops-head"><div><p class="eyebrow">SAVINGIO OPERATIONS HQ</p><h3>통합 운영 대시보드</h3><p>프로젝트·자동화·배포·URL·QA 상태를 한 화면에서 확인합니다.</p><small class="ops-live-time">● 실시간 감시 · ${lastRenderedAt.toLocaleTimeString('ko-KR')}</small></div><div class="ops-actions"><button class="btn ghost" type="button" data-ops-action="refresh">새로고침</button><button class="btn primary" type="button" data-ops-action="run-all-qa">통합 QA 실행</button></div></header>
      <div class="ops-metrics">${card('전체 프로젝트',data.summary.projects,`진행 ${data.summary.running}`)}${card('승인 대기',data.summary.approval,'검토 필요')}${card('오류',data.summary.errors,'즉시 확인')}${card('자동화',`${data.summary.runningJobs} 실행`,`대기 ${data.summary.queued}`)}${card('배포 성공',data.summary.deploySuccess,`전체 ${data.cloudflare.length}`)}${card('정상 URL',data.summary.healthy,`전체 ${data.urls.length}`)}</div>
      <article class="ops-panel ops-wide ops-live-projects"><header><h4>전체 프로젝트 실시간 상태</h4><span>${data.projects.length}</span></header>${liveProjectRows(data.projects)}</article>
      <article class="ops-panel ops-wide ops-monitor"><header><div><h4>GitHub · Cloudflare · URL 통합 모니터</h4><small>Commit → 배포 → 실제 URL 상태를 시간순으로 확인합니다.</small></div><div class="ops-monitor-actions"><button class="btn ghost small" data-ops-action="scan-chain">연결 스캔</button><button class="btn primary small" data-ops-action="check-urls">대기 URL 검사</button></div></header><div class="ops-audit-grid">${auditSummary('GitHub',data.audits.github)}${auditSummary('Cloudflare',data.audits.cloudflare)}${auditSummary('URL Health',data.audits.url)}</div><div class="ops-monitor-toolbar"><button class="chip ${monitorFilter==='all'?'active':''}" data-monitor-filter="all">전체 ${data.github.length+data.cloudflare.length+data.urls.length}</button><button class="chip ${monitorFilter==='github'?'active':''}" data-monitor-filter="github">GitHub ${data.github.length}</button><button class="chip ${monitorFilter==='cloudflare'?'active':''}" data-monitor-filter="cloudflare">Cloudflare ${data.cloudflare.length}</button><button class="chip ${monitorFilter==='url'?'active':''}" data-monitor-filter="url">URL ${data.urls.length}</button></div>${monitorRows(data)}</article>
      ${qaPanel(qaSnapshot)}
      <div class="ops-grid"><article class="ops-panel"><header><h4>승인 대기 작업</h4><span>${data.approval.length}</span></header>${listRows(data.approval,'승인 대기 작업이 없습니다.')}</article><article class="ops-panel"><header><h4>오류 알림</h4><span>${data.errors.length}</span></header>${listRows(data.errors,'현재 감지된 오류가 없습니다.')}</article><article class="ops-panel"><header><h4>최근 자동화</h4><span>${data.jobs.length}</span></header>${listRows(data.jobs,'자동화 실행 기록이 없습니다.')}</article><article class="ops-panel"><header><h4>배포·URL 상태</h4><span>${data.cloudflare.length + data.urls.length}</span></header>${listRows([...data.cloudflare,...data.urls],'배포 및 URL 상태 기록이 없습니다.')}</article><article class="ops-panel ops-wide"><header><h4>다음 작업·재시도</h4><span>${data.nextTasks.length + data.retries.length}</span></header>${listRows([...data.nextTasks,...data.retries],'예약된 다음 작업이나 재시도가 없습니다.')}</article></div>
    </section>`;

    root.querySelector('[data-ops-action="refresh"]')?.addEventListener('click',()=>render(root));
    root.querySelectorAll('[data-ops-action="run-all-qa"]').forEach(button=>button.addEventListener('click',()=>runAllQa(root)));
    root.querySelector('[data-ops-action="scan-chain"]')?.addEventListener('click',()=>{ try { window.SavingioCloudflareDeploy?.scanGitHubStatuses?.(); } catch {} try { window.SavingioUrlHealth?.scanDeployments?.(); } catch {} render(root); });
    root.querySelector('[data-ops-action="check-urls"]')?.addEventListener('click',()=>runQueuedUrlChecks(root));
    root.querySelectorAll('[data-monitor-filter]').forEach(button=>button.addEventListener('click',()=>{monitorFilter=button.dataset.monitorFilter;render(root);}));
    root.querySelectorAll('[data-qa-filter]').forEach(button=>button.addEventListener('click',()=>{qaFilter=button.dataset.qaFilter;render(root);}));
    root.querySelectorAll('[data-ops-project]').forEach(row => row.addEventListener('click', () => { const id=row.dataset.opsProject; if (window.SavingioProjectDetail?.render) window.SavingioProjectDetail.render(id); }));
    window.dispatchEvent(new CustomEvent('savingio:operations-hq-rendered',{detail:{summary:clone(data.summary),qa:clone(qaSnapshot)}}));
    return clone(data);
  }

  function startLiveRefresh() { stopLiveRefresh(); refreshTimer=setInterval(()=>{ if (document.querySelector('.operations-hq')) render(); },15000); }
  function stopLiveRefresh() { if (refreshTimer) clearInterval(refreshTimer); refreshTimer=null; }

  function shouldOpen(target) {
    const title=target.closest('.tree-title');
    const child=target.closest('.tree-child');
    const dept=title?.dataset.dept || child?.closest('.tree-group')?.querySelector('.tree-title')?.dataset.dept;
    const childName=child?.dataset.child || child?.textContent.trim();
    return dept==='command' && ['전체 진행률','오늘 작업','승인 필요','오류·중지'].includes(childName || '전체 진행률');
  }

  function boot() {
    if (!document.querySelector('link[data-operations-hq-css]')) { const link=document.createElement('link'); link.rel='stylesheet'; link.href='/admin/os/operations-hq.css'; link.dataset.operationsHqCss='true'; document.head.appendChild(link); }
    $('#treeNav')?.addEventListener('click',event=>{ if(!shouldOpen(event.target)) return; event.stopImmediatePropagation(); render(); startLiveRefresh(); },true);
    ['savingio:projects-changed','savingio:workflows-changed','savingio:automation-changed','savingio:github-status-changed','savingio:cloudflare-deployments-changed','savingio:cloudflare-deployment-status','savingio:url-health-changed','savingio:url-health-status','savingio:retry-changed','savingio:next-task-changed','savingio:automation-qa-completed','savingio:plugin-marketplace-qa-completed','savingio:project-qa-completed'].forEach(name => window.addEventListener(name,()=>{ if(document.querySelector('.operations-hq')) render(); }));
    document.addEventListener('visibilitychange',()=>{ if(document.hidden) stopLiveRefresh(); else if(document.querySelector('.operations-hq')) startLiveRefresh(); });
    window.SavingioOperationsHQ=Object.freeze({collect,render,startLiveRefresh,stopLiveRefresh,runQueuedUrlChecks,runAllQa,qa:()=>clone(qaSnapshot)});
    window.dispatchEvent(new CustomEvent('savingio:operations-hq-ready'));
  }

  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();