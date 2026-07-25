(() => {
  'use strict';

  const $ = selector => document.querySelector(selector);
  const clone = value => JSON.parse(JSON.stringify(value));
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

  function safeList(api) {
    try { return Array.isArray(api?.list?.()) ? api.list() : []; }
    catch { return []; }
  }

  function collect() {
    const projects = safeList(window.SavingioProject);
    const jobs = safeList(window.SavingioAutomation);
    const github = safeList(window.SavingioGitHubStatus);
    const cloudflare = safeList(window.SavingioCloudflareDeploy);
    const urls = safeList(window.SavingioUrlHealth);
    const retries = safeList(window.SavingioRetry);
    const nextTasks = safeList(window.SavingioNextTask);
    const automationQA = window.SavingioAutomationQA?.latest?.() || null;
    const pluginQA = window.SavingioPluginMarketplaceQA?.latest?.() || null;
    const controller = window.SavingioAutomationController?.state?.() || { paused:false, locks:[], history:[] };

    const approval = projects.filter(item => ['approval','waiting-approval','pending'].includes(item.status));
    const errors = [
      ...projects.filter(item => item.status === 'error').map(item => ({type:'프로젝트', id:item.id, title:item.title || item.id, state:item.status})),
      ...jobs.filter(item => item.status === 'error').map(item => ({type:'자동화', id:item.id, title:item.title || item.id, state:item.status})),
      ...cloudflare.filter(item => ['failed','error'].includes(item.status || item.state)).map(item => ({type:'배포', id:item.id, title:item.url || item.id, state:item.status || item.state})),
      ...urls.filter(item => ['unhealthy','blocked','error'].includes(item.status || item.state)).map(item => ({type:'URL', id:item.id, title:item.url || item.id, state:item.status || item.state}))
    ];

    return {
      projects, jobs, github, cloudflare, urls, retries, nextTasks, approval, errors, automationQA, pluginQA, controller,
      summary:{
        projects:projects.length,
        running:projects.filter(item => ['running','active'].includes(item.status)).length,
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
    if (['pass','success','healthy','ok','ready','deployed','done'].some(token=>text.includes(token))) return 'pass';
    if (['fail','error','unhealthy','blocked','failed'].some(token=>text.includes(token))) return 'fail';
    if (['warn','queued','pending','approval','running','active'].some(token=>text.includes(token))) return 'warn';
    return 'neutral';
  }

  function card(label, value, meta='') {
    return `<article class="ops-metric"><small>${esc(label)}</small><strong>${esc(value)}</strong><span>${esc(meta)}</span></article>`;
  }

  function listRows(items, emptyText) {
    if (!items.length) return `<p class="ops-empty">${esc(emptyText)}</p>`;
    return `<ul class="ops-list">${items.slice(0,8).map(item=>`<li><span><strong>${esc(item.title || item.name || item.url || item.id)}</strong><small>${esc(item.type || item.category || item.id || '')}</small></span><em class="ops-state ${statusClass(item.status || item.state)}">${esc(item.statusLabel || item.status || item.state || '확인')}</em></li>`).join('')}</ul>`;
  }

  function render(root=$('#departmentBoard')) {
    if (!root) return null;
    const data=collect();
    const qaItems=[
      {title:'Automation QA', status:data.automationQA?.status || '미실행', detail:data.automationQA ? `${data.automationQA.counts?.pass||0} PASS · ${data.automationQA.counts?.error||0} ERROR` : '검사 기록 없음'},
      {title:'Plugin Marketplace QA', status:data.pluginQA?.status || '미실행', detail:data.pluginQA ? `${data.pluginQA.counts?.pass||0} PASS · ${data.pluginQA.counts?.fail||data.pluginQA.counts?.error||0} FAIL` : '검사 기록 없음'},
      {title:'Automation Controller', status:data.controller.paused ? '중지' : '운영 중', detail:`Lock ${data.controller.locks?.length||0} · 이력 ${data.controller.history?.length||0}`}
    ];

    root.innerHTML=`<section class="operations-hq">
      <header class="ops-head"><div><p class="eyebrow">SAVINGIO OPERATIONS HQ</p><h3>통합 운영 대시보드</h3><p>프로젝트·자동화·배포·URL·QA 상태를 한 화면에서 확인합니다.</p></div><div class="ops-actions"><button class="btn ghost" type="button" data-ops-action="refresh">새로고침</button><button class="btn primary" type="button" data-ops-action="run-qa">통합 QA 실행</button></div></header>
      <div class="ops-metrics">${card('전체 프로젝트',data.summary.projects,`진행 ${data.summary.running}`)}${card('승인 대기',data.summary.approval,'검토 필요')}${card('오류',data.summary.errors,'즉시 확인')}${card('자동화',`${data.summary.runningJobs} 실행`,`대기 ${data.summary.queued}`)}${card('배포 성공',data.summary.deploySuccess,`전체 ${data.cloudflare.length}`)}${card('정상 URL',data.summary.healthy,`전체 ${data.urls.length}`)}</div>
      <div class="ops-grid">
        <article class="ops-panel"><header><h4>승인 대기 작업</h4><span>${data.approval.length}</span></header>${listRows(data.approval,'승인 대기 작업이 없습니다.')}</article>
        <article class="ops-panel"><header><h4>오류 알림</h4><span>${data.errors.length}</span></header>${listRows(data.errors,'현재 감지된 오류가 없습니다.')}</article>
        <article class="ops-panel"><header><h4>최근 자동화</h4><span>${data.jobs.length}</span></header>${listRows(data.jobs,'자동화 실행 기록이 없습니다.')}</article>
        <article class="ops-panel"><header><h4>배포·URL 상태</h4><span>${data.cloudflare.length + data.urls.length}</span></header>${listRows([...data.cloudflare,...data.urls],'배포 및 URL 상태 기록이 없습니다.')}</article>
        <article class="ops-panel ops-wide"><header><h4>통합 QA</h4><span>${qaItems.length}</span></header><ul class="ops-list">${qaItems.map(item=>`<li><span><strong>${esc(item.title)}</strong><small>${esc(item.detail)}</small></span><em class="ops-state ${statusClass(item.status)}">${esc(item.status)}</em></li>`).join('')}</ul></article>
        <article class="ops-panel ops-wide"><header><h4>다음 작업·재시도</h4><span>${data.nextTasks.length + data.retries.length}</span></header>${listRows([...data.nextTasks,...data.retries],'예약된 다음 작업이나 재시도가 없습니다.')}</article>
      </div>
    </section>`;

    root.querySelector('[data-ops-action="refresh"]')?.addEventListener('click',()=>render(root));
    root.querySelector('[data-ops-action="run-qa"]')?.addEventListener('click',()=>{
      try { window.SavingioAutomationQA?.run?.({trigger:'operations-hq'}); } catch {}
      try { window.SavingioPluginMarketplaceQA?.run?.({trigger:'operations-hq'}); } catch {}
      render(root);
    });
    window.dispatchEvent(new CustomEvent('savingio:operations-hq-rendered',{detail:{summary:clone(data.summary)}}));
    return clone(data);
  }

  function shouldOpen(target) {
    const title=target.closest('.tree-title');
    const child=target.closest('.tree-child');
    const dept=title?.dataset.dept || child?.closest('.tree-group')?.querySelector('.tree-title')?.dataset.dept;
    const childName=child?.dataset.child || child?.textContent.trim();
    return dept==='command' && ['전체 진행률','오늘 작업','승인 필요','오류·중지'].includes(childName || '전체 진행률');
  }

  function boot() {
    if (!document.querySelector('link[data-operations-hq-css]')) {
      const link=document.createElement('link'); link.rel='stylesheet'; link.href='/admin/os/operations-hq.css'; link.dataset.operationsHqCss='true'; document.head.appendChild(link);
    }
    $('#treeNav')?.addEventListener('click',event=>{ if(!shouldOpen(event.target)) return; event.stopImmediatePropagation(); render(); },true);
    window.SavingioOperationsHQ=Object.freeze({collect,render});
    window.dispatchEvent(new CustomEvent('savingio:operations-hq-ready'));
  }

  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();