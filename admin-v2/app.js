(() => {
  'use strict';

  const registry=window.SavingioV2Modules;
  if(!registry)throw new Error('Admin V2 module registry is not loaded');

  const ROUTER_LOCK=Object.freeze({name:'admin-v2-router',owner:'admin-v2/app.js',flow:'Explorer -> app.js -> Module Registry -> Workspace'});
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

  function verify(){
    const roots=workspace?.querySelectorAll(':scope > [data-module-root]')||[];
    const width=explorer?Math.round(explorer.getBoundingClientRect().width):0;
    const regionCounts=Object.fromEntries(SHELL_LOCK.regions.map(region=>[region,document.querySelectorAll(`[data-shell-region="${region}"]`).length]));
    const duplicates=duplicateIds();
    const registryIntegrity=registry.verify();
    const result={
      lockName:shell?.dataset.shellLock||'',
      routerName:window.SavingioAdminRouter?.name||'',
      routerOwner:window.SavingioAdminRouter?.owner||'',
      shellCount:document.querySelectorAll('#adminShell').length,
      explorerCount:document.querySelectorAll('#adminExplorer').length,
      headerCount:document.querySelectorAll('#adminHeader').length,
      workspaceCount:document.querySelectorAll('#adminWorkspace').length,
      regionCounts,
      activeModuleRoots:roots.length,
      activeId,
      sidebarWidth:width,
      duplicateIds:duplicates,
      legacyBoardCount:document.querySelectorAll('#departmentBoard,.department-panel').length,
      registry:registryIntegrity
    };
    result.pass=result.lockName===SHELL_LOCK.name&&result.routerName===ROUTER_LOCK.name&&result.routerOwner===ROUTER_LOCK.owner&&result.shellCount===1&&result.explorerCount===1&&result.headerCount===1&&result.workspaceCount===1&&Object.values(regionCounts).every(count=>count===1)&&roots.length===1&&width===SHELL_LOCK.explorerWidth&&duplicates.length===0&&result.legacyBoardCount===0&&registryIntegrity.pass;
    return Object.freeze(result);
  }

  function syncShellStatus(){
    const result=verify();
    shellStatus.textContent=result.pass?'PASS · Router 1개 · Registry LOCK · Root 1개':`FAIL · Router ${result.routerOwner||'없음'} · Registry ${result.registry.count} · Root ${result.activeModuleRoots}`;
    shellStatus.className=result.pass?'pass':'fail';
    document.documentElement.dataset.shellIntegrity=result.pass?'pass':'fail';
    return result;
  }

  function assertShell(){
    if(!shell||!explorer||!header||!workspace||!title||!nav||!shellStatus)throw new Error('Admin V2 shell is incomplete');
    if(shell.dataset.shellLock!==SHELL_LOCK.name)throw new Error('Admin V2 shell lock marker is missing');
    if(window.SavingioAdminRouter!==ROUTER_LOCK)throw new Error('Admin V2 router ownership changed');
  }

  function setActiveNavigation(id){
    document.querySelectorAll('[data-view]').forEach(button=>button.classList.toggle('active',button.dataset.view===id));
  }

  function syncUrl(id,mode='push'){
    const url=new URL(location.href);
    url.searchParams.set('view',id);
    history[mode==='replace'?'replaceState':'pushState']({view:id},'',url.pathname+url.search);
  }

  function mount(id,mode='push'){
    assertShell();
    const requested=String(id||'').trim();
    const module=registry.get(requested)||registry.get('command-home');
    if(!module)throw new Error(`Admin V2 route not found: ${requested||'(empty)'}`);
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
    window.dispatchEvent(new CustomEvent('savingio:v2-module-mounted',{detail:{id:activeId,title:module.title,integrity}}));
  }

  function routeFromEvent(event){
    const target=event.target.closest('[data-view],[data-route]');
    if(!target)return;
    const id=target.dataset.view||target.dataset.route;
    if(!registry.has(id))return;
    event.preventDefault();
    mount(id);
  }

  assertShell();
  registry.seal();
  nav.addEventListener('click',routeFromEvent);
  workspace.addEventListener('click',routeFromEvent);
  workspace.addEventListener('keydown',event=>{if((event.key==='Enter'||event.key===' ')&&event.target.closest('[data-route]'))routeFromEvent(event)});
  document.getElementById('refreshBtn').addEventListener('click',()=>mount(activeId||'command-home','replace'));
  document.getElementById('diagnosticsBtn').addEventListener('click',()=>{
    const result=syncShellStatus();
    alert(`Admin V2 구조 검사\n\nRouter: ${result.routerName} / ${result.routerOwner}\nRegistry: ${result.registry.count}개 / LOCK ${result.registry.sealed?'ON':'OFF'}\nShell: ${result.shellCount}개 / LOCK ${result.lockName}\nExplorer: ${result.explorerCount}개 / ${result.sidebarWidth}px\nHeader: ${result.headerCount}개\nWorkspace: ${result.workspaceCount}개\n활성 모듈 Root: ${result.activeModuleRoots}개\nLegacy Board: ${result.legacyBoardCount}개\n중복 ID: ${result.duplicateIds.length}개\n현재 모듈: ${result.activeId}\n\n${result.pass?'PASS':'FAIL'}`);
  });
  window.addEventListener('popstate',event=>mount(event.state?.view||new URLSearchParams(location.search).get('view')||'command-home','none'));
  window.addEventListener('savingio:v2-projects-changed',()=>mount(activeId||'command-home','replace'));

  const requested=new URLSearchParams(location.search).get('view')||'command-home';
  mount(requested,'replace');
  window.SavingioAdminV2=Object.freeze({mount,verify,routerLock:ROUTER_LOCK,shellLock:SHELL_LOCK,get activeId(){return activeId},modules:registry.list});
})();