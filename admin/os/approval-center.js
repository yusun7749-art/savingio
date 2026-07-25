(() => {
  'use strict';

  const STORAGE_KEY = 'savingio-operations-approval-center-v1';
  const $ = (selector, root=document) => root.querySelector(selector);
  const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const clone = value => JSON.parse(JSON.stringify(value));
  let statusFilter = 'pending';
  let priorityFilter = 'all';
  let categoryFilter = 'all';
  let query = '';
  const selected = new Set();

  function readState() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return value && typeof value === 'object' ? value : {};
    } catch { return {}; }
  }

  function writeState(value) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent('savingio:approval-center-changed', { detail:clone(value) }));
    return value;
  }

  function safeList(api) {
    try { const value=api?.list?.(); return Array.isArray(value) ? value : []; }
    catch { return []; }
  }

  function priorityFor(workflow, project, requestedAt) {
    const explicit=String(project?.priority || '').toLowerCase();
    if (['critical','urgent'].includes(explicit)) return 'critical';
    if (explicit === 'high') return 'high';
    const age=Date.now()-new Date(requestedAt || workflow.updatedAt || workflow.createdAt || Date.now()).getTime();
    if (age > 48*60*60*1000) return 'high';
    if (age > 12*60*60*1000) return 'medium';
    return 'normal';
  }

  function priorityLabel(value) {
    return ({critical:'긴급',high:'높음',medium:'보통',normal:'낮음'})[value] || '보통';
  }

  function categoryFor(stage, workflow) {
    const moduleId=String(stage?.moduleId || '').toLowerCase();
    if (moduleId.includes('content')) return '콘텐츠';
    if (moduleId.includes('media') || moduleId.includes('image') || moduleId.includes('video')) return '이미지·미디어';
    if (moduleId.includes('calculator')) return '계산기';
    if (moduleId.includes('plugin')) return 'Plugin';
    if (moduleId.includes('automation') || moduleId.includes('publish')) return '배포';
    return workflow.category || '최종 승인';
  }

  function collect() {
    const state=readState();
    const projects=safeList(window.SavingioProject);
    const projectMap=new Map(projects.map(item=>[String(item.id),item]));
    const workflows=safeList(window.SavingioWorkflow);
    const rows=[];

    workflows.forEach(workflow => {
      const stage=(workflow.stages || []).find(item=>item.status === 'review');
      const request=[...(workflow.approvals || [])].find(item=>item.action === 'requested' && (!stage || item.stageId === stage.id));
      if (!stage && !request) return;
      const key=`${workflow.id}:${stage?.id || request?.stageId || 'approval'}`;
      const saved=state[key] || {};
      const project=projectMap.get(String(workflow.projectId)) || {};
      rows.push({
        id:key,
        workflowId:workflow.id,
        projectId:workflow.projectId,
        projectTitle:project.title || workflow.title || workflow.projectId,
        category:categoryFor(stage,workflow),
        stageId:stage?.id || request?.stageId || '',
        stageName:stage?.name || request?.stageName || '최종 승인',
        owner:project.owner || stage?.owner || '선장님',
        requestedAt:request?.createdAt || workflow.updatedAt || workflow.createdAt,
        note:request?.note || stage?.note || '',
        priority:priorityFor(workflow,project,request?.createdAt),
        status:saved.status || 'pending',
        decisionNote:saved.decisionNote || '',
        decidedAt:saved.decidedAt || null
      });
    });

    Object.entries(state).forEach(([key,item]) => {
      if (rows.some(row=>row.id===key) || !item?.history) return;
      rows.push({...item,id:key,status:item.status || 'approved'});
    });

    return rows.sort((a,b) => {
      const rank={critical:4,high:3,medium:2,normal:1};
      return (rank[b.priority]||0)-(rank[a.priority]||0) || new Date(a.requestedAt||0)-new Date(b.requestedAt||0);
    });
  }

  function counts(items) {
    return {
      pending:items.filter(item=>item.status==='pending').length,
      hold:items.filter(item=>item.status==='hold').length,
      approved:items.filter(item=>item.status==='approved').length,
      rejected:items.filter(item=>item.status==='rejected').length,
      urgent:items.filter(item=>item.status==='pending' && item.priority==='critical').length
    };
  }

  function filtered(items) {
    const term=query.trim().toLowerCase();
    return items.filter(item => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && item.priority !== priorityFilter) return false;
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      if (term && ![item.projectTitle,item.projectId,item.stageName,item.category,item.owner,item.note].some(value=>String(value||'').toLowerCase().includes(term))) return false;
      return true;
    });
  }

  function decisionNote(action,count=1) {
    const label=action==='approved'?'승인':action==='rejected'?'반려':'보류';
    return window.prompt(`${count}개 작업 ${label} 사유를 입력해 주세요.`, action==='approved'?'승인 완료':action==='rejected'?'수정 후 재검토 필요':'검토 보류') || '';
  }

  function saveHistory(item,status,note) {
    const state=readState();
    const history={...item,status,decisionNote:note,decidedAt:new Date().toISOString(),history:true};
    state[item.id]=history;
    writeState(state);
    return history;
  }

  function decide(id,status,note='') {
    const item=collect().find(row=>row.id===id);
    if (!item) return null;
    let result=null;
    if (status === 'approved') {
      result=window.SavingioWorkflow?.approve?.(item.workflowId,{actor:'선장님',note:note || '승인 완료'});
      try { window.SavingioAutomation?.scan?.(); } catch {}
    } else if (status === 'rejected') {
      result=window.SavingioWorkflow?.reject?.(item.workflowId,{actor:'선장님',note:note || '수정 후 재검토 필요'});
    }
    saveHistory(item,status,note);
    selected.delete(id);
    window.dispatchEvent(new CustomEvent('savingio:approval-decision',{detail:{item:clone(item),status,note,result:clone(result)}}));
    renderPanel();
    return result;
  }

  function bulkDecision(status) {
    const ids=[...selected];
    if (!ids.length) return;
    const note=decisionNote(status,ids.length);
    if (!note && status !== 'approved') return;
    ids.forEach(id=>decide(id,status,note));
    selected.clear();
    renderPanel();
  }

  function renderPanel() {
    const host=$('.operations-hq');
    if (!host) return;
    let panel=$('#operationsApprovalCenter');
    if (!panel) {
      panel=document.createElement('article');
      panel.id='operationsApprovalCenter';
      panel.className='ops-panel ops-wide ops-approval-center';
      const errorPanel=$('#operationsErrorCenter',host);
      const qaPanel=$('.ops-qa-panel',host);
      if (errorPanel) errorPanel.insertAdjacentElement('afterend',panel);
      else if (qaPanel) qaPanel.insertAdjacentElement('afterend',panel);
      else host.appendChild(panel);
    }
    const items=collect();
    const stat=counts(items);
    const rows=filtered(items);
    const categories=[...new Set(items.map(item=>item.category))];
    panel.innerHTML=`<header><div><h4>승인 대기 작업함</h4><small>승인·반려·보류 이력을 관리하고 승인 완료 작업을 Automation Engine으로 전달합니다.</small></div><div><button class="btn ghost small" data-approval-action="refresh">새로고침</button><button class="btn primary small" data-approval-action="bulk-approve" ${selected.size?'':'disabled'}>선택 승인 ${selected.size||''}</button></div></header>
      <div class="ops-approval-summary"><article class="urgent"><small>긴급</small><strong>${stat.urgent}</strong></article><article><small>승인 대기</small><strong>${stat.pending}</strong></article><article><small>보류</small><strong>${stat.hold}</strong></article><article><small>승인 완료</small><strong>${stat.approved}</strong></article><article><small>반려</small><strong>${stat.rejected}</strong></article></div>
      <div class="ops-approval-toolbar"><input type="search" data-approval-search value="${esc(query)}" placeholder="프로젝트·단계·담당자 검색"><div>${['pending','hold','approved','rejected','all'].map(value=>`<button class="chip ${statusFilter===value?'active':''}" data-approval-status="${value}">${value==='pending'?'대기':value==='hold'?'보류':value==='approved'?'승인':value==='rejected'?'반려':'전체'}</button>`).join('')}</div><select data-approval-priority><option value="all">전체 우선순위</option>${['critical','high','medium','normal'].map(value=>`<option value="${value}" ${priorityFilter===value?'selected':''}>${priorityLabel(value)}</option>`).join('')}</select><select data-approval-category><option value="all">전체 분류</option>${categories.map(value=>`<option value="${esc(value)}" ${categoryFilter===value?'selected':''}>${esc(value)}</option>`).join('')}</select></div>
      <div class="ops-approval-bulk"><button class="btn ghost small" data-approval-action="bulk-hold" ${selected.size?'':'disabled'}>선택 보류</button><button class="btn danger small" data-approval-action="bulk-reject" ${selected.size?'':'disabled'}>선택 반려</button></div>
      <div class="ops-approval-list">${rows.length ? rows.map(item=>`<article class="ops-approval-row ${item.priority} ${item.status}"><input type="checkbox" data-approval-select="${esc(item.id)}" ${selected.has(item.id)?'checked':''} ${item.status==='approved'||item.status==='rejected'?'disabled':''}><span class="ops-approval-priority">${priorityLabel(item.priority)}</span><div class="ops-approval-main" data-approval-project="${esc(item.projectId)}"><strong>${esc(item.projectTitle)}</strong><small>${esc(item.category)} · ${esc(item.stageName)} · 담당 ${esc(item.owner)}</small><p>${esc(item.note || '승인 요청 메모 없음')}</p><time>요청 ${item.requestedAt?new Date(item.requestedAt).toLocaleString('ko-KR'):'시각 없음'}${item.decidedAt?` · 처리 ${new Date(item.decidedAt).toLocaleString('ko-KR')}`:''}</time>${item.decisionNote?`<em>${esc(item.decisionNote)}</em>`:''}</div><span class="ops-approval-state">${item.status==='pending'?'승인 대기':item.status==='hold'?'보류':item.status==='approved'?'승인 완료':'반려'}</span><div class="ops-approval-actions">${item.status==='pending'||item.status==='hold'?`<button class="btn ghost small" data-approval-action="hold" data-approval-id="${esc(item.id)}">보류</button><button class="btn danger small" data-approval-action="reject" data-approval-id="${esc(item.id)}">반려</button><button class="btn primary small" data-approval-action="approve" data-approval-id="${esc(item.id)}">승인</button>`:''}</div></article>`).join('') : '<p class="ops-empty">조건에 맞는 승인 작업이 없습니다.</p>'}</div>`;
    bind(panel);
  }

  function bind(panel) {
    $('[data-approval-action="refresh"]',panel)?.addEventListener('click',renderPanel);
    $('[data-approval-search]',panel)?.addEventListener('input',event=>{query=event.target.value;renderPanel();requestAnimationFrame(()=>{const input=$('[data-approval-search]');input?.focus();input?.setSelectionRange(query.length,query.length);});});
    $$('[data-approval-status]',panel).forEach(button=>button.addEventListener('click',()=>{statusFilter=button.dataset.approvalStatus;renderPanel();}));
    $('[data-approval-priority]',panel)?.addEventListener('change',event=>{priorityFilter=event.target.value;renderPanel();});
    $('[data-approval-category]',panel)?.addEventListener('change',event=>{categoryFilter=event.target.value;renderPanel();});
    $$('[data-approval-select]',panel).forEach(input=>input.addEventListener('change',()=>{input.checked?selected.add(input.dataset.approvalSelect):selected.delete(input.dataset.approvalSelect);renderPanel();}));
    $$('[data-approval-action="approve"]',panel).forEach(button=>button.addEventListener('click',()=>decide(button.dataset.approvalId,'approved',decisionNote('approved'))));
    $$('[data-approval-action="reject"]',panel).forEach(button=>button.addEventListener('click',()=>{const note=decisionNote('rejected');if(note)decide(button.dataset.approvalId,'rejected',note);}));
    $$('[data-approval-action="hold"]',panel).forEach(button=>button.addEventListener('click',()=>decide(button.dataset.approvalId,'hold',decisionNote('hold'))));
    $('[data-approval-action="bulk-approve"]',panel)?.addEventListener('click',()=>bulkDecision('approved'));
    $('[data-approval-action="bulk-reject"]',panel)?.addEventListener('click',()=>bulkDecision('rejected'));
    $('[data-approval-action="bulk-hold"]',panel)?.addEventListener('click',()=>bulkDecision('hold'));
    $$('[data-approval-project]',panel).forEach(node=>node.addEventListener('click',()=>window.SavingioProjectDetail?.render?.(node.dataset.approvalProject)));
  }

  function boot() {
    if (!document.querySelector('link[data-approval-center-css]')) {
      const link=document.createElement('link');link.rel='stylesheet';link.href='/admin/os/approval-center.css';link.dataset.approvalCenterCss='true';document.head.appendChild(link);
    }
    window.addEventListener('savingio:operations-hq-rendered',()=>requestAnimationFrame(renderPanel));
    ['savingio:workflows-changed','savingio:projects-changed','savingio:approval-center-changed','savingio:automation-jobs-changed'].forEach(name=>window.addEventListener(name,()=>{if($('.operations-hq'))requestAnimationFrame(renderPanel);}));
    window.SavingioApprovalCenter=Object.freeze({list:()=>clone(collect()),render:renderPanel,approve:(id,note)=>decide(id,'approved',note),reject:(id,note)=>decide(id,'rejected',note),hold:(id,note)=>decide(id,'hold',note)});
    if ($('.operations-hq')) renderPanel();
  }

  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();