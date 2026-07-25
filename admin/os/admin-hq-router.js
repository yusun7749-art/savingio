(() => {
  'use strict';

  const $=(selector,root=document)=>root.querySelector(selector);
  const $$=(selector,root=document)=>[...root.querySelectorAll(selector)];
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const routeKey='savingio-admin-hq-route-v1';
  let current='home';

  const routeMap={
    home:{title:'Home HQ',group:'core'},projects:{title:'Project HQ',group:'core'},workflow:{title:'Workflow HQ',group:'core'},operations:{title:'Operations HQ',group:'core'},approval:{title:'Approval HQ',group:'core'},plugins:{title:'Plugin Store',group:'extension'},marketplace:{title:'Plugin Marketplace',group:'extension'},assets:{title:'Asset / Image Center',group:'content'},calculators:{title:'Calculator Center',group:'content'},tests:{title:'Psychology Test Center',group:'content'},games:{title:'Game Center',group:'content'},affiliate:{title:'Coupon & Affiliate Center',group:'revenue'},products:{title:'Digital Product Center',group:'revenue'},analytics:{title:'Analytics Center',group:'revenue'},revenue:{title:'Revenue Center',group:'revenue'},settings:{title:'Settings Center',group:'system'}
  };

  function modules(){return window.SavingioAdminHQ?.modules?.()||Object.entries(routeMap).map(([route,item])=>({id:route,route,...item,loaded:true}));}
  function normalized(value){const route=String(value||'').replace(/^#\/?/,'').split(/[?&]/)[0];return routeMap[route]?route:'home';}
  function urlFor(route){return `#/${normalized(route)}`;}

  function ensureShell(){
    let shell=$('#adminHqRouterShell');
    if(shell)return shell;
    shell=document.createElement('section');
    shell.id='adminHqRouterShell';
    shell.className='admin-hq-router-shell';
    shell.innerHTML='<button type="button" class="admin-hq-menu-toggle" data-admin-menu-toggle aria-label="통합 메뉴 열기">☰</button><nav class="admin-hq-unified-menu" aria-label="Savingio Admin HQ 통합 메뉴"></nav><div class="admin-hq-route-meta"><nav class="admin-hq-breadcrumb" aria-label="현재 위치"></nav><div class="admin-hq-route-actions"><button type="button" data-admin-route-favorite>☆ 즐겨찾기</button><button type="button" data-admin-route-command>⌘K 빠른 실행</button></div></div>';
    document.body.prepend(shell);
    $('[data-admin-menu-toggle]',shell)?.addEventListener('click',()=>shell.classList.toggle('menu-open'));
    $('[data-admin-route-command]',shell)?.addEventListener('click',()=>window.dispatchEvent(new CustomEvent('savingio:admin-hq-command-open',{detail:{modules:modules()}})));
    $('[data-admin-route-favorite]',shell)?.addEventListener('click',()=>{window.SavingioAdminHQ?.toggleFavorite?.(current);render();});
    return shell;
  }

  function renderMenu(){
    const shell=ensureShell();
    const menu=$('.admin-hq-unified-menu',shell);
    const groups={core:'핵심 본부',content:'콘텐츠 센터',extension:'플러그인',revenue:'수익 센터',system:'시스템'};
    const rows=modules().filter(item=>routeMap[item.route||item.id]);
    menu.innerHTML=Object.entries(groups).map(([group,label])=>{
      const items=rows.filter(item=>(item.group||'extension')===group);
      if(!items.length)return '';
      return `<section><h3>${esc(label)}</h3>${items.map(item=>`<button type="button" data-admin-route="${esc(item.route||item.id)}" class="${current===(item.route||item.id)?'active':''}" ${item.loaded===false?'data-unloaded="true"':''}><span>${esc(item.title)}</span><small>${item.loaded===false?'대기':'열기'}</small></button>`).join('')}</section>`;
    }).join('');
    $$('[data-admin-route]',menu).forEach(button=>button.addEventListener('click',()=>navigate(button.dataset.adminRoute)));
  }

  function renderBreadcrumb(){
    const shell=ensureShell();
    const item=routeMap[current]||routeMap.home;
    $('.admin-hq-breadcrumb',shell).innerHTML=`<button type="button" data-admin-breadcrumb-home>Admin HQ</button><span>›</span><strong>${esc(item.title)}</strong>`;
    $('[data-admin-breadcrumb-home]',shell)?.addEventListener('click',()=>navigate('home'));
    const favorite=window.SavingioAdminHQ?.modules?.().find(item=>item.id===current)?.favorite;
    const button=$('[data-admin-route-favorite]',shell);
    if(button)button.textContent=favorite?'★ 즐겨찾기':'☆ 즐겨찾기';
  }

  function highlightLegacy(){
    $$('[data-admin-route-active]').forEach(node=>node.removeAttribute('data-admin-route-active'));
    const selectors=[`[data-route="${current}"]`,`[data-module="${current}"]`,`[data-dept="${current}"]`,`[data-child="${current}"]`];
    selectors.forEach(selector=>$$(selector).forEach(node=>node.setAttribute('data-admin-route-active','true')));
  }

  function dispatch(route,meta={}){
    const item=routeMap[route];
    document.documentElement.dataset.adminRoute=route;
    localStorage.setItem(routeKey,route);
    window.SavingioAdminHQ?.open?.(route,{source:'router',...meta});
    window.dispatchEvent(new CustomEvent('savingio:admin-route-changed',{detail:{route,title:item.title,group:item.group,meta}}));
  }

  function render(){renderMenu();renderBreadcrumb();highlightLegacy();}

  function activate(route,meta={}){
    current=normalized(route);
    render();
    dispatch(current,meta);
    ensureShell().classList.remove('menu-open');
    return current;
  }

  function navigate(route,options={}){
    const next=normalized(route);
    if(options.replace)history.replaceState({savingioAdminRoute:next},'',urlFor(next));
    else if(location.hash!==urlFor(next))history.pushState({savingioAdminRoute:next},'',urlFor(next));
    return activate(next,{navigation:options.replace?'replace':'push'});
  }

  function routeFromLocation(){return normalized(location.hash||localStorage.getItem(routeKey)||'home');}

  function bindLegacyNavigation(){
    document.addEventListener('click',event=>{
      const target=event.target.closest('[data-admin-route],[data-route],[data-module]');
      if(!target||target.closest('#adminHqRouterShell'))return;
      const route=target.dataset.adminRoute||target.dataset.route||target.dataset.module;
      if(!routeMap[route])return;
      event.preventDefault();
      navigate(route);
    });
  }

  function audit(){
    const rows=modules();
    const duplicateRoutes=rows.map(item=>item.route||item.id).filter((route,index,array)=>array.indexOf(route)!==index);
    const missing=Object.keys(routeMap).filter(route=>!rows.some(item=>(item.route||item.id)===route));
    return {valid:!duplicateRoutes.length&&!missing.length,status:duplicateRoutes.length||missing.length?'WARN':'PASS',current,registered:rows.length,missing:[...new Set(missing)],duplicates:[...new Set(duplicateRoutes)],checkedAt:new Date().toISOString()};
  }

  function boot(){
    if(!$('link[data-admin-hq-router-css]')){const link=document.createElement('link');link.rel='stylesheet';link.href='/admin/os/admin-hq-router.css';link.dataset.adminHqRouterCss='true';document.head.appendChild(link);}
    bindLegacyNavigation();
    window.addEventListener('popstate',()=>activate(routeFromLocation(),{navigation:'popstate'}));
    window.addEventListener('hashchange',()=>{const next=routeFromLocation();if(next!==current)activate(next,{navigation:'hashchange'});});
    window.addEventListener('savingio:admin-hq-modules-changed',render);
    window.addEventListener('savingio:admin-hq-state-changed',renderBreadcrumb);
    current=routeFromLocation();
    if(!location.hash)history.replaceState({savingioAdminRoute:current},'',urlFor(current));
    activate(current,{navigation:'boot'});
    window.SavingioAdminRouter=Object.freeze({navigate,activate,current:()=>current,routes:()=>JSON.parse(JSON.stringify(routeMap)),audit,render});
    window.dispatchEvent(new CustomEvent('savingio:admin-router-ready',{detail:{route:current,audit:audit()}}));
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();