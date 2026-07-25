(() => {
  'use strict';

  const registry=window.SavingioV2Modules;
  const store=window.SavingioV2ProjectStore;
  const workflow=window.SavingioV2WorkflowEngine;
  if(!registry||!store||!workflow)throw new Error('Admin V2 Command Center dependencies are not loaded');
  if(window.SavingioV2CommandCenter)throw new Error('Admin V2 Command Center already exists');

  const MODULE_NAME='command-center';
  const MODULE_IDS=Object.freeze(['command-home','command-progress','command-today','command-approval','command-error','command-revenue']);
  const STAGE_LABELS=Object.freeze({content:'콘텐츠',seo:'SEO',image:'이미지',qa:'QA',deploy:'배포',analytics:'분석',revenue:'수익'});
  const STATUS_LABELS=Object.freeze({pending:'대기',running:'진행 중',done:'완료',error:'오류'});
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const metric=(label,value,action='')=>`<article class="metric"${action?` data-route="${esc(action)}" role="button" tabindex="0"`:''}><span>${esc(label)}</span><strong>${esc(value)}</strong>${action?'<small>상세 보기 →</small>':''}</article>`;

  function projectCards(list,showStages=false){
    if(!list.length)return '<div class="panel empty">해당 조건의 프로젝트가 없습니다.</div>';
    return `<div class="project-list">${list.map(project=>`<article class="project-card"><div class="project-top"><div><div class="project-title">${esc(project.title)}</div><div class="meta">${esc(project.id)} · ${esc(project.category)} · ${esc(project.type)}</div></div><span class="status ${esc(project.status)}">${esc(project.statusLabel)}</span></div><div class="progress"><i style="width:${project.progress}%"></i></div><div class="meta">진행률 ${project.progress}% · ${esc(project.updated)}</div>${showStages?`<div class="stage-list">${project.stages.map(([name,state])=>`<div class="stage ${esc(state)}"><span>${state==='done'?'✓':state==='active'?'●':'·'}</span><strong>${esc(name)}</strong><small>${state==='done'?'완료':state==='active'?'진행 중':'대기'}</small></div>`).join('')}</div>`:''}</article>`).join('')}</div>`;
  }

  function workflowButtons(job){
    if(job.status==='pending')return `<button class="button" type="button" data-workflow-action="start" data-workflow-id="${esc(job.id)}">작업 시작</button>`;
    if(job.status==='running')return `<button class="button" type="button" data-workflow-action="advance" data-workflow-id="${esc(job.id)}">현재 단계 완료</button><button class="button secondary" type="button" data-workflow-action="fail" data-workflow-id="${esc(job.id)}">오류 처리</button>`;
    if(job.status==='error')return `<button class="button" type="button" data-workflow-action="retry" data-workflow-id="${esc(job.id)}">재시도</button>`;
    return '<span class="status done">완료</span>';
  }

  function workflowCards(list){
    if(!list.length)return '<div class="panel empty">등록된 워크플로가 없습니다.</div>';
    return `<div class="project-list">${list.map(job=>{const index=workflow.flow.indexOf(job.stage);const progress=job.status==='done'?100:Math.round((index+(job.status==='running'?0.5:0))/workflow.flow.length*100);return `<article class="project-card"><div class="project-top"><div><div class="project-title">${esc(job.title)}</div><div class="meta">${esc(job.projectId||job.id)} · 현재 부서 ${esc(STAGE_LABELS[job.stage])}</div></div><span class="status ${esc(job.status)}">${esc(STATUS_LABELS[job.status])}</span></div><div class="progress"><i style="width:${progress}%"></i></div><div class="meta">전체 진행률 ${progress}% · ${esc(job.updatedAt)}</div><div class="header-actions">${workflowButtons(job)}</div></article>`;}).join('')}</div>`;
  }

  const creationPanel=()=>`<section class="panel"><h3>새 운영 작업 생성</h3><form id="workflowCreateForm"><div class="connection-list"><label><span>작업 제목</span><input name="title" required maxlength="120" placeholder="예: 전기요금 절약 글 신규 제작"></label><label><span>프로젝트 ID 또는 URL</span><input name="projectId" maxlength="160" placeholder="예: electricity-bill-saving"></label><label><span>작업 유형</span><select name="type"><option value="new">새 콘텐츠</option><option value="rewrite">기존 콘텐츠 수정</option><option value="seo">SEO 재검사</option><option value="urgent">긴급 수정</option></select></label></div><div class="header-actions"><button class="button" type="submit">워크플로 생성</button></div></form></section>`;
  const view=(eyebrow,title,description,body)=>`<section class="view" data-module-root data-module="${MODULE_NAME}"><header class="hero"><p>${esc(eyebrow)}</p><h2>${esc(title)}</h2><p>${esc(description)}</p></header>${body}</section>`;
  const snapshot=()=>{const list=store.read();return Object.freeze({list,summary:store.summary(list)});};
  const workflowSnapshot=()=>Object.freeze({list:workflow.readAll(),summary:workflow.summary()});

  const modules=[
    {id:'command-home',title:'통합 상황실',render(){const {list,summary:s}=snapshot();const wf=workflowSnapshot();return view('COMMAND CENTER','통합 상황실','작업을 생성하고 부서별 진행 상태를 한 화면에서 관리합니다.',`${creationPanel()}<div class="metrics">${metric('전체 진행률',`${s.average}%`,'command-progress')}${metric('워크플로',`${wf.summary.total}건`,'command-progress')}${metric('진행 중',`${wf.summary.state.running}건`,'command-today')}${metric('대기',`${wf.summary.state.pending}건`,'command-approval')}${metric('오류',`${wf.summary.state.error}건`,'command-error')}${metric('완료',`${wf.summary.state.done}건`,'command-progress')}</div><section class="panel"><h3>운영 파이프라인</h3>${workflowCards(wf.list.filter(item=>item.status!=='done'))}</section><section class="panel"><h3>기존 프로젝트 현황</h3>${projectCards(list.filter(item=>item.status!=='done'))}</section>`);}},
    {id:'command-progress',title:'전체 진행률',render(){const {list,summary:s}=snapshot();const wf=workflowSnapshot();return view('COMMAND CENTER','전체 진행률','프로젝트와 운영 워크플로의 전체 진행 상태를 확인합니다.',`<div class="metrics">${metric('프로젝트 평균',`${s.average}%`)}${metric('워크플로 전체',`${wf.summary.total}건`)}${metric('진행 중',`${wf.summary.state.running}건`)}${metric('대기',`${wf.summary.state.pending}건`)}${metric('오류',`${wf.summary.state.error}건`)}${metric('완료',`${wf.summary.state.done}건`)}</div><section class="panel"><h3>워크플로 진행 단계</h3>${workflowCards(wf.list)}</section><section class="panel"><h3>프로젝트별 진행 단계</h3>${projectCards(list,true)}</section>`);}},
    {id:'command-today',title:'오늘 작업',render(){const list=workflow.readAll().filter(item=>item.status==='running'||item.status==='pending');return view('COMMAND CENTER','오늘 작업','현재 실행 중이거나 다음 행동을 기다리는 작업입니다.',`<section class="panel"><h3>오늘 처리할 워크플로</h3>${workflowCards(list)}</section>`);}},
    {id:'command-approval',title:'승인 필요',render(){const list=workflow.readAll().filter(item=>item.status==='pending');return view('COMMAND CENTER','승인 필요','다음 부서에서 시작 승인을 기다리는 작업입니다.',`<section class="panel"><h3>대기 작업</h3>${workflowCards(list)}</section>`);}},
    {id:'command-error',title:'오류·중지',render(){const list=workflow.readAll().filter(item=>item.status==='error');return view('COMMAND CENTER','오류·중지','오류가 발생해 재시도가 필요한 작업입니다.',`<section class="panel"><h3>오류 워크플로</h3>${workflowCards(list)}</section>`);}},
    {id:'command-revenue',title:'수익 요약',render(){const {summary:s}=workflowSnapshot();return view('COMMAND CENTER','수익 요약','실제 수익 데이터는 외부 연결 전까지 생성하지 않고 운영 완료 건만 표시합니다.',`<div class="metrics">${metric('수익 단계 대기',`${s.stages.revenue}건`)}${metric('완료 워크플로',`${s.state.done}건`)}${metric('진행 중',`${s.state.running}건`)}${metric('오류',`${s.state.error}건`)}${metric('전체',`${s.total}건`)}${metric('수익 데이터','미연결')}</div>`);}}
  ];

  modules.forEach(module=>registry.register(module));

  function handleAction(action,id){
    if(!['start','advance','fail','retry'].includes(action))return false;
    if(action==='start')workflow.start(id);
    if(action==='advance')workflow.advance(id);
    if(action==='fail')workflow.fail(id,'운영자 수동 오류 처리');
    if(action==='retry')workflow.retry(id);
    return true;
  }

  function handleCreate(form){
    const data=new FormData(form);
    const type=String(data.get('type')||'new');
    const prefixes={new:'[신규]',rewrite:'[수정]',seo:'[SEO]',urgent:'[긴급]'};
    return workflow.create({title:`${prefixes[type]||'[작업]'} ${String(data.get('title')||'').trim()}`,projectId:String(data.get('projectId')||'').trim()});
  }

  function verify(){
    const registered=MODULE_IDS.filter(id=>registry.has(id));
    const storeIntegrity=store.verify();
    const workflowIntegrity=workflow.verify();
    return Object.freeze({name:MODULE_NAME,expected:MODULE_IDS.length,registered:registered.length,ids:Object.freeze(registered),store:storeIntegrity,workflow:workflowIntegrity,pass:registered.length===MODULE_IDS.length&&storeIntegrity.pass&&workflowIntegrity.pass});
  }

  Object.defineProperty(window,'SavingioV2CommandCenter',{value:Object.freeze({name:MODULE_NAME,ids:MODULE_IDS,verify,handleAction,handleCreate}),writable:false,configurable:false,enumerable:true});
})();