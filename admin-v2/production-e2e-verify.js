(() => {
  'use strict';

  const STATE_KEY='savingio-admin-v2-production-e2e';
  const EXPECTED_ROUTES=Object.freeze([
    'command-home','command-progress','tool-build-progress','tool-navigation-audit','tool-runtime-audit','tool-production-verification','command-today','command-approval','command-error','command-revenue',
    'dept-cms','dept-content','dept-seo','dept-image','dept-qa','dept-deploy','dept-analytics','dept-revenue',
    'tool-seo-doctor','tool-content-doctor','tool-external-connections','tool-search-console','tool-adsense','tool-github-release','tool-cloudflare'
  ]);

  function row(name,pass,detail=''){return Object.freeze({name,pass:Boolean(pass),detail:String(detail||'')});}
  function save(result){
    try{sessionStorage.setItem(STATE_KEY,JSON.stringify(result));}catch{}
    window.dispatchEvent(new CustomEvent('savingio:v2-production-e2e',{detail:result}));
    return result;
  }
  function scriptLoaded(path){return [...document.scripts].some(script=>{try{return new URL(script.src,location.href).pathname===path}catch{return false}})}

  function run(){
    const registry=window.SavingioV2Modules;
    const app=window.SavingioAdminV2;
    const dashboard=window.SavingioV2OperationsDashboardStore;
    const actions=window.SavingioV2OperationalActions;
    const navigation=window.SavingioV2NavigationAudit;
    const rows=[];

    rows.push(row('Admin shell exists',document.querySelectorAll('#adminShell').length===1));
    rows.push(row('Explorer exists',document.querySelectorAll('#adminExplorer').length===1));
    rows.push(row('Workspace exists',document.querySelectorAll('#adminWorkspace').length===1));
    rows.push(row('Module registry sealed',Boolean(registry?.sealed)));
    rows.push(row('Admin app available',Boolean(app?.mount&&app?.verify&&app?.verifyNavigation)));
    rows.push(row('Operations dashboard available',Boolean(dashboard?.read&&dashboard?.verify)));
    rows.push(row('Operational actions available',Boolean(actions?.verify?.().pass)));
    rows.push(row('Navigation audit available',Boolean(navigation?.verify)));
    rows.push(row('Production auto verify script',scriptLoaded('/admin-v2/production-auto-verify.js')));

    EXPECTED_ROUTES.forEach(id=>{
      const menu=document.querySelector(`[data-view="${id}"]`);
      const module=registry?.get?.(id);
      let valid=false;
      let detail='missing';
      if(module){
        try{
          const template=document.createElement('template');
          template.innerHTML=String(module.render()).trim();
          const roots=template.content.querySelectorAll(':scope > [data-module-root]');
          valid=roots.length===1&&Boolean(menu);
          detail=`menu:${menu?'yes':'no'} · root:${roots.length}`;
        }catch(error){detail=error?.message||String(error);}
      }
      rows.push(row(`Sidebar route · ${id}`,valid,detail));
    });

    const menuIds=[...document.querySelectorAll('#adminNav [data-view]')].map(button=>String(button.dataset.view||'').trim());
    const unknownMenuIds=menuIds.filter(id=>!EXPECTED_ROUTES.includes(id));
    const missingMenuIds=EXPECTED_ROUTES.filter(id=>!menuIds.includes(id));
    const duplicateMenuIds=[...new Set(menuIds.filter((id,index)=>menuIds.indexOf(id)!==index))];
    rows.push(row('Sidebar has no unknown routes',unknownMenuIds.length===0,unknownMenuIds.join(', ')));
    rows.push(row('Sidebar has all expected routes',missingMenuIds.length===0,missingMenuIds.join(', ')));
    rows.push(row('Sidebar has no duplicate routes',duplicateMenuIds.length===0,duplicateMenuIds.join(', ')));

    const shell=app?.verify?.()||{pass:false};
    const navigationCheck=navigation?.verify?.()||{pass:false,menuCount:0,missing:[],duplicates:[]};
    const dashboardCheck=dashboard?.verify?.()||{pass:false,centers:0};
    rows.push(row('Admin shell verification',Boolean(shell.pass)));
    rows.push(row(`Navigation verification · ${navigationCheck.menuCount||0} menus`,Boolean(navigationCheck.pass),`missing:${navigationCheck.missing?.length||0} duplicate:${navigationCheck.duplicates?.length||0}`));
    rows.push(row(`Dashboard centers · ${dashboardCheck.centers||0}`,Boolean(dashboardCheck.pass)));

    const result=Object.freeze({
      pass:rows.every(item=>item.pass),
      total:rows.length,
      passed:rows.filter(item=>item.pass).length,
      failed:rows.filter(item=>!item.pass).length,
      rows:Object.freeze(rows),
      expectedRoutes:EXPECTED_ROUTES.length,
      menuRoutes:menuIds.length,
      unknownMenuIds:Object.freeze(unknownMenuIds),
      missingMenuIds:Object.freeze(missingMenuIds),
      duplicateMenuIds:Object.freeze(duplicateMenuIds),
      host:location.hostname,
      path:location.pathname,
      checkedAt:new Date().toISOString()
    });
    document.documentElement.dataset.productionE2e=result.pass?'pass':'fail';
    return save(result);
  }

  Object.defineProperty(window,'SavingioV2ProductionE2EVerify',{value:Object.freeze({run,stateKey:STATE_KEY,expectedRoutes:EXPECTED_ROUTES}),writable:false,configurable:false});
  queueMicrotask(run);
  window.addEventListener('pageshow',event=>{if(event.persisted)run();});
})();