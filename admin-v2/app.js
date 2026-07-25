(() => {
  'use strict';
  const registry=window.SavingioV2Modules;
  if(!registry)throw new Error('Admin V2 module registry is not loaded');
  const workspace=document.getElementById('adminWorkspace');
  const title=document.getElementById('pageTitle');
  const nav=document.getElementById('adminNav');
  const shellStatus=document.getElementById('shellStatus');
  let activeId='';

  function verify(){
    const explorer=document.getElementById('adminExplorer');
    const roots=workspace.querySelectorAll(':scope > [data-module-root]');
    const duplicateIds=[...document.querySelectorAll('[id]')].map(el=>el.id).filter((id,index,all)=>all.indexOf(id)!==index);
    const width=Math.round(explorer.getBoundingClientRect().width);
    return {
      explorerCount:document.querySelectorAll('#adminExplorer').length,
      workspaceCount:document.querySelectorAll('#adminWorkspace').length,
      activeModuleRoots:roots.length,
      activeId,
      sidebarWidth:width,
      duplicateIds:[...new Set(duplicateIds)],
      legacyBoardCount:document.querySelectorAll('#departmentBoard,.department-panel').length,
      pass:document.querySelectorAll('#adminExplorer').length===1&&document.querySelectorAll('#adminWorkspace').length===1&&roots.length===1&&width===255&&duplicateIds.length===0&&document.querySelectorAll('#departmentBoard,.department-panel').length===0
    };
  }

  function syncShellStatus(){
    const result=verify();
    shellStatus.textContent=result.pass?'PASS · Explorer 255px · Workspace 1개':`FAIL · Explorer ${result.sidebarWidth}px · Root ${result.activeModuleRoots}`;
    shellStatus.className=result.pass?'pass':'fail';
    return result;
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
    const module=registry.get(id)||registry.get('command-home');
    if(!module)return;
    activeId=module.id;
    title.textContent=module.title;
    workspace.replaceChildren();
    const template=document.createElement('template');
    template.innerHTML=module.render().trim();
    workspace.appendChild(template.content);
    setActiveNavigation(activeId);
    if(mode!=='none')syncUrl(activeId,mode);
    syncShellStatus();
    window.dispatchEvent(new CustomEvent('savingio:v2-module-mounted',{detail:{id:activeId,title:module.title}}));
  }

  function routeFromEvent(event){
    const target=event.target.closest('[data-view],[data-route]');
    if(!target)return;
    const id=target.dataset.view||target.dataset.route;
    if(!registry.get(id))return;
    event.preventDefault();
    mount(id);
  }

  nav.addEventListener('click',routeFromEvent);
  workspace.addEventListener('click',routeFromEvent);
  workspace.addEventListener('keydown',event=>{if((event.key==='Enter'||event.key===' ')&&event.target.closest('[data-route]'))routeFromEvent(event)});
  document.getElementById('refreshBtn').addEventListener('click',()=>mount(activeId||'command-home','replace'));
  document.getElementById('diagnosticsBtn').addEventListener('click',()=>{
    const result=syncShellStatus();
    alert(`Admin V2 구조 검사\n\nExplorer: ${result.explorerCount}개 / ${result.sidebarWidth}px\nWorkspace: ${result.workspaceCount}개\n활성 모듈 Root: ${result.activeModuleRoots}개\nLegacy Board: ${result.legacyBoardCount}개\n중복 ID: ${result.duplicateIds.length}개\n현재 모듈: ${result.activeId}\n\n${result.pass?'PASS':'FAIL'}`);
  });
  window.addEventListener('popstate',event=>mount(event.state?.view||new URLSearchParams(location.search).get('view')||'command-home','none'));
  window.addEventListener('savingio:v2-projects-changed',()=>mount(activeId||'command-home','replace'));

  const requested=new URLSearchParams(location.search).get('view')||'command-home';
  mount(requested,'replace');
  window.SavingioAdminV2=Object.freeze({mount,verify,get activeId(){return activeId},modules:registry.list});
})();