(() => {
  'use strict';

  const registry=window.SavingioV2Modules;
  const commandCenter=window.SavingioV2CommandCenter;
  const workflowEngine=window.SavingioV2WorkflowEngine;
  const pipelineEngine=window.SavingioV2PipelineEngine;
  if(!registry)throw new Error('Admin V2 module registry is not loaded');
  if(!commandCenter)throw new Error('Admin V2 Command Center is not loaded');
  if(!workflowEngine)throw new Error('Admin V2 Workflow Engine is not loaded');
  if(!pipelineEngine)throw new Error('Admin V2 Pipeline Engine is not loaded');

  const ROUTER_LOCK=Object.freeze({name:'admin-v2-router',owner:'admin-v2/app.js',flow:'Explorer -> app.js -> Module Registry -> Workspace'});
  const DEPARTMENT_IDS=Object.freeze(['dept-cms','dept-content','dept-seo','dept-image','dept-qa','dept-deploy','dept-analytics','dept-revenue']);
  if(window.SavingioAdminRouter)throw new Error(`Admin V2 router already exists: ${window.SavingioAdminRouter.owner||'unknown'}`);
  Object.defineProperty(window,'SavingioAdminRouter',{value:ROUTER_LOCK,writable:false,configurable:false,enumerable:true});

  const shell=document.getElementById('adminShell');
  const explorer=document.getElementById('adminExplorer');
  const header=document.getElementById('adminHeader');
  const workspace=document.getElementById('adminWorkspace');
  const title=document.getElementById('pageTitle');
  const nav=document.getElementById('adminNav');
  const shellStatus=document.getElementById('shellStatus');
  const SHELL_LOCK=Object.freeze({name:'admin-v2',explorerWidth:255,regions:['explorer','header','workspace']});
  let activeId='';

  function duplicateIds(){
    const ids=[...document.querySelectorAll('[id]')].map(element=>element.id);
    return [...new Set(ids.filter((id,index)=>ids.indexOf(id)!==index))];
  }

  function verifyDepartments(){
    const registered=DEPARTMENT_IDS.filter(id=>registry.has(id));
    const missing=DEPARTMENT_IDS.filter(id=>!registry.has(id));
    return Object.freeze({expected:DEPARTMENT_IDS.length,registered:registered.length,ids:Object.freeze(registered),missing:Object.freeze(missing),pass:missing.length===0});
  }

  function verifyNavigation(){
    const menu=[...nav.querySelectorAll('[data-view]')].map(button=>String(button.dataset.view||'').trim());
    const missing=menu.filter(id=>!id||!registry.has(id));
    const duplicates=[...new Set(menu.filter((id,index)=>menu.indexOf(id)!==index))];
    return Object.freeze({count:menu.length,missing:Object.freeze(missing),duplicates:Object.freeze(duplicates),pass:missing.length===0&&duplicates.length===0});
  }

  function verify(){
    const roots=workspace?.querySelectorAll(':scope > [data-module-root]')||[];
    const width=explorer?Math.round(explorer.getBoundingClientRect().width):0;
    const regionCounts=Object.fromEntries(SHELL_LOCK.regions.map(region=>[region,document.querySelectorAll(`[data-shell-region="${region}"]`).length]));
    const duplicates=duplicateIds();
    const registryIntegrity=registry.verify();
    const commandIntegrity=commandCenter.verify();
    const departmentIntegrity=verifyDepartments();
    const navigationIntegrity=verifyNavigation();
    const workflowIntegrity=workflowEngine.verify();
    const pipelineIntegrity=pipelineEngine.verify();
    const result={lockName:shell?.dataset.shellLock||'',routerName:window.SavingioAdminRouter?.name||'',routerOwner:window.SavingioAdminRouter?.owner||'',shellCount:document.querySelectorAll('#adminShell').length,explorerCount:document.querySelectorAll('#adminExplorer').length,headerCount:document.querySelectorAll('#adminHeader').length,workspaceCount:document.querySelectorAll('#adminWorkspace').length,regionCounts,activeModuleRoots:roots.length,activeId,sidebarWidth:width,duplicateIds:duplicates,legacyBoardCount:document.querySelectorAll('#departmentBoard,.department-panel').length,registry:registryIntegrity,commandCenter:commandIntegrity,departments:departmentIntegrity,navigation:navigationIntegrity,workflow:workflowIntegrity,pipeline:pipelineIntegrity};
    result.pass=result.lockName===SHELL_LOCK.name&&result.routerName===ROUTER_LOCK.name&&result.routerOwner===ROUTER_LOCK.owner&&result.shellCount===1&&result.explorerCount===1&&result.headerCount===1&&result.workspaceCount===1&&Object.values(regionCounts).every(count=>count===1)&&roots.length===1&&width===SHELL_LOCK.explorerWidth&&duplicates.length===0&&result.legacyBoardCount===0&&registryIntegrity.pass&&commandIntegrity.pass&&departmentIntegrity.pass&&navigationIntegrity.pass&&workflowIntegrity.pass&&pipelineIntegrity.pass;
    return Object.freeze(result);
  }

  function syncShellStatus(){
    const result=verify();
    shellStatus.textContent=result.pass?`PASS · 메뉴 ${result.navigation.count}개 · 부서 ${result.departments.registered}개 · Workflow ${result.workflow.count}건`:`FAIL · 메뉴 누락 ${result.navigation.missing.length} · 부서 ${result.departments.registered}/${result.departments.expected}`;
    shellStatus.className=result.pass?'pass':'fail';
    document.documentElement.dataset.shellIntegrity=result.pass?'pass':'fail';
    return result;
  }

  function assertShell(){
    if(!shell||!explorer||!header||!workspace||!title||!nav||!shellStatus)throw new Error('Admin V2 shell is incomplete');
    if(shell.dataset.shellLock!==SHELL_LOCK.name)throw new Error('Admin V2 shell lock marker is missing');
    if(window.SavingioAdminRouter!==ROUTER_LOCK)throw new Error('Admin V2 router ownership changed');
  }

  function setActiveNavigation(id){document.querySelectorAll('[data-view]').forEach(button=>button.classList.toggle('active',button.dataset.view===id));}
  function syncUrl(id,mode='push'){const url=new URL(location.href);url.searchParams.set('view',id);history[mode==='replace'?'replaceState':'pushState']({view:id},'',url.pathname+url.search);}

  function mount(id,mode='push'){
    assertShell();
    const requested=String(id||'').trim();
    let module=registry.get(requested);
    if(!module){
      module=registry.get('tool-navigation-audit')||registry.get('command-home');
      if(!module)throw new Error(`Admin V2 route not found: ${requested||'(empty)'}`);
      console.error(`Admin V2 route not found: ${requested||'(empty)'}`);
    }
    activeId=module.id;
    title.textContent=module.title;
    const template=document.createElement('template');
    template.innerHTML=module.render().trim();
    const roots=template.content.querySelectorAll(':scope > [data-module-root]');
    if(roots.length!==1)throw new Error(`Module ${module.id} must render exactly one root`);
    workspace.replaceChildren(template.content);
    setActiveNavigation(activeId);
    if(mode!=='none')syncUrl(activeId,mode);
    const integrity=syncShellStatus();
    window.dispatchEvent(new CustomEvent('savingio:v2-module-mounted',{detail:{id:activeId,title:module.title,integrity,requested}}));
  }

  function routeFromEvent(event){
    const target=event.target.closest('[data-view],[data-route]');
    if(!target)return false;
    const id=String(target.dataset.view||target.dataset.route||'').trim();
    event.preventDefault();
    if(!id||!registry.has(id)){
      console.error(`Admin V2 broken route: ${id||'(empty)'}`);
      mount('tool-navigation-audit');
      alert(`연결되지 않은 메뉴 또는 버튼입니다.\nRoute: ${id||'(빈 값)'}\n\n메뉴·화면 연결 검사로 이동합니다.`);
      return true;
    }
    mount(id);
    return true;
  }

  function workflowActionFromEvent(event){
    const target=event.target.closest('[data-workflow-action][data-workflow-id]');
    if(!target)return false;
    event.preventDefault();
    try{commandCenter.handleAction(target.dataset.workflowAction,target.dataset.workflowId);}catch(error){alert(`워크플로 처리 실패\n${error.message}`);}
    return true;
  }

  function pipelineActionFromEvent(event){
    const target=event.target.closest('[data-pipeline-action]');
    if(!target)return false;
    event.preventDefault();
    try{commandCenter.handlePipelineAction(target.dataset.pipelineAction);}catch(error){alert(`파이프라인 처리 실패\n${error.message}`);}
    return true;
  }

  function workflowSubmitFromEvent(event){
    const form=event.target.closest('#workflowCreateForm');
    if(!form)return;
    event.preventDefault();
    try{const job=commandCenter.handleCreate(form);form.reset();alert(`워크플로가 생성되었습니다.\n${job.title}`);}catch(error){alert(`워크플로 생성 실패\n${error.message}`);}
  }

  assertShell();
  registry.seal();
  nav.addEventListener('click',routeFromEvent);
  workspace.addEventListener('click',event=>{if(workflowActionFromEvent(event))return;if(pipelineActionFromEvent(event))return;routeFromEvent(event);});
  workspace.addEventListener('submit',workflowSubmitFromEvent);
  workspace.addEventListener('keydown',event=>{if((event.key==='Enter'||event.key===' ')&&event.target.closest('[data-route]'))routeFromEvent(event)});
  document.getElementById('refreshBtn').addEventListener('click',()=>mount(activeId||'command-home','replace'));
  document.getElementById('diagnosticsBtn').addEventListener('click',()=>{
    const result=syncShellStatus();
    alert(`Admin V2 구조 검사\n\nRouter: ${result.routerName} / ${result.routerOwner}\nRegistry: ${result.registry.count}개 / LOCK ${result.registry.sealed?'ON':'OFF'}\n왼쪽 메뉴: ${result.navigation.count}개 / 누락 ${result.navigation.missing.length}개 / 중복 ${result.navigation.duplicates.length}개\nCommand Center: ${result.commandCenter.registered}/${result.commandCenter.expected}개\n독립 부서: ${result.departments.registered}/${result.departments.expected}개\nWorkflow: ${result.workflow.count}건 / 오류 ${result.workflow.invalid}건\nPipeline: ${result.pipeline.total}건 / 자동 진행 ${pipelineEngine.summary().autoReady}건\n누락 Route: ${result.navigation.missing.join(', ')||'없음'}\n중복 Route: ${result.navigation.duplicates.join(', ')||'없음'}\n누락 부서: ${result.departments.missing.join(', ')||'없음'}\nShell: ${result.shellCount}개 / LOCK ${result.lockName}\nExplorer: ${result.explorerCount}개 / ${result.sidebarWidth}px\nWorkspace Root: ${result.activeModuleRoots}개\n현재 모듈: ${result.activeId}\n\n${result.pass?'PASS':'FAIL'}`);
  });
  window.addEventListener('popstate',event=>mount(event.state?.view||new URLSearchParams(location.search).get('view')||'command-home','none'));
  window.addEventListener('savingio:v2-projects-changed',()=>mount(activeId||'command-home','replace'));
  window.addEventListener('savingio:v2-workflows-changed',()=>mount(activeId||'command-home','replace'));
  window.addEventListener('savingio:v2-center-data-changed',()=>mount(activeId||'command-home','replace'));

  const requested=new URLSearchParams(location.search).get('view')||'command-home';
  mount(requested,'replace');
  window.SavingioAdminV2=Object.freeze({mount,verify,verifyNavigation,routerLock:ROUTER_LOCK,shellLock:SHELL_LOCK,commandCenter,workflowEngine,pipelineEngine,departments:verifyDepartments,get activeId(){return activeId},modules:registry.list});
})();