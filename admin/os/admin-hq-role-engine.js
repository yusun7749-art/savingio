(() => {
  'use strict';

  const STORAGE_KEY='savingio-admin-hq-role-v1';
  const AUDIT_KEY='savingio-admin-hq-role-audit-v1';
  const clone=value=>JSON.parse(JSON.stringify(value));
  const now=()=>new Date().toISOString();
  const read=(key,fallback)=>{try{const value=JSON.parse(localStorage.getItem(key)||'null');return value??fallback}catch{return fallback}};
  const write=(key,value)=>localStorage.setItem(key,JSON.stringify(value));

  const actions=['view','create','edit','delete','approve','deploy','manageUsers','managePlugins','manageSettings','export'];
  const roles={
    owner:{label:'Owner',rank:100,modules:['*'],actions:['*']},
    admin:{label:'Admin',rank:80,modules:['*'],actions:['view','create','edit','delete','approve','deploy','managePlugins','manageSettings','export']},
    editor:{label:'Editor',rank:60,modules:['home','projects','workflow','assets','calculators','tests','games','affiliate','products','analytics'],actions:['view','create','edit','export']},
    operator:{label:'Operator',rank:40,modules:['home','projects','workflow','operations','approval','analytics'],actions:['view','approve','deploy','export']},
    viewer:{label:'Viewer',rank:20,modules:['home','projects','workflow','operations','analytics','revenue'],actions:['view','export']}
  };

  const saved=read(STORAGE_KEY,{});
  const state={role:roles[saved.role]?saved.role:'owner',overrides:saved.overrides&&typeof saved.overrides==='object'?saved.overrides:{},updatedAt:saved.updatedAt||now()};
  let auditLog=Array.isArray(read(AUDIT_KEY,[]))?read(AUDIT_KEY,[]):[];

  function persist(){state.updatedAt=now();write(STORAGE_KEY,state)}
  function audit(action,detail={}){const row={id:`ROLE-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,action,role:state.role,detail,createdAt:now()};auditLog=[row,...auditLog].slice(0,500);write(AUDIT_KEY,auditLog);window.dispatchEvent(new CustomEvent('savingio:role-audit',{detail:clone(row)}));return row}
  function roleConfig(role=state.role){return roles[role]||roles.viewer}
  function includes(list,value){return list.includes('*')||list.includes(value)}
  function can(action,moduleId='home'){
    if(!actions.includes(action)) return false;
    const override=state.overrides?.[moduleId]?.[action];
    if(typeof override==='boolean') return override;
    const config=roleConfig();
    return includes(config.modules,moduleId)&&includes(config.actions,action);
  }
  function canOpen(moduleId){return can('view',moduleId)}
  function setRole(role,meta={}){
    if(!roles[role]) throw new Error(`알 수 없는 역할: ${role}`);
    const previous=state.role;state.role=role;persist();audit('role-changed',{previous,next:role,...meta});apply();window.dispatchEvent(new CustomEvent('savingio:admin-role-changed',{detail:snapshot()}));return snapshot();
  }
  function setOverride(moduleId,action,allowed){
    if(!moduleId||!actions.includes(action)) return false;
    state.overrides[moduleId]??={};state.overrides[moduleId][action]=Boolean(allowed);persist();audit('permission-override',{moduleId,action,allowed:Boolean(allowed)});apply();return true;
  }
  function clearOverride(moduleId,action){
    if(!state.overrides[moduleId]) return false;
    if(action) delete state.overrides[moduleId][action]; else delete state.overrides[moduleId];
    if(state.overrides[moduleId]&&Object.keys(state.overrides[moduleId]).length===0) delete state.overrides[moduleId];
    persist();audit('permission-override-cleared',{moduleId,action:action||'*'});apply();return true;
  }
  function snapshot(){return clone({role:state.role,config:roleConfig(),overrides:state.overrides,roles,actions,updatedAt:state.updatedAt})}
  function permissions(moduleId){return Object.fromEntries(actions.map(action=>[action,can(action,moduleId)]))}
  function apply(){
    document.documentElement.dataset.adminRole=state.role;
    document.querySelectorAll('[data-admin-module],[data-module]').forEach(element=>{
      const moduleId=element.dataset.adminModule||element.dataset.module;
      const allowed=canOpen(moduleId);
      element.hidden=!allowed;element.setAttribute('aria-hidden',String(!allowed));
    });
    document.querySelectorAll('[data-requires-permission]').forEach(element=>{
      const action=element.dataset.requiresPermission;
      const moduleId=element.dataset.permissionModule||window.SavingioAdminHQ?.state?.().activeModule||'home';
      const allowed=can(action,moduleId);
      element.disabled=!allowed;element.setAttribute('aria-disabled',String(!allowed));
      element.classList.toggle('permission-denied',!allowed);
    });
    renderBadge();
    window.dispatchEvent(new CustomEvent('savingio:admin-permissions-applied',{detail:snapshot()}));
  }
  function renderBadge(){
    let badge=document.getElementById('adminRoleBadge');
    if(!badge){badge=document.createElement('button');badge.id='adminRoleBadge';badge.type='button';badge.className='admin-role-badge';document.body.appendChild(badge)}
    badge.textContent=`역할 · ${roleConfig().label}`;
    badge.title='현재 Admin HQ 권한 역할';
    badge.onclick=()=>window.dispatchEvent(new CustomEvent('savingio:admin-role-panel-open',{detail:snapshot()}));
  }
  function guard(moduleId,action='view'){
    const allowed=can(action,moduleId);
    if(!allowed){audit('access-denied',{moduleId,action});window.dispatchEvent(new CustomEvent('savingio:admin-access-denied',{detail:{moduleId,action,role:state.role}}));}
    return allowed;
  }
  function auditPermissions(){
    const modules=window.SavingioAdminHQ?.modules?.()||[];
    const invalidOverrides=[];
    Object.entries(state.overrides).forEach(([moduleId,map])=>Object.keys(map||{}).forEach(action=>{if(!actions.includes(action)||!modules.some(module=>module.id===moduleId))invalidOverrides.push({moduleId,action})}));
    return {valid:invalidOverrides.length===0,status:invalidOverrides.length?'WARN':'PASS',checkedAt:now(),role:state.role,moduleCount:modules.length,invalidOverrides,warnings:invalidOverrides.map(item=>`${item.moduleId}.${item.action} 권한 설정을 확인하세요.`),errors:[]};
  }
  function bind(){
    window.addEventListener('savingio:admin-hq-open',event=>{const id=event.detail?.module?.id;if(id&&!guard(id,'view'))window.SavingioAdminHQ?.open?.('home',{reason:'permission-denied'})});
    window.addEventListener('savingio:admin-hq-modules-changed',apply);
    window.addEventListener('savingio:admin-route-changed',apply);
  }
  function boot(){
    if(!document.querySelector('link[data-admin-role-css]')){const link=document.createElement('link');link.rel='stylesheet';link.href='/admin/os/admin-hq-role-engine.css';link.dataset.adminRoleCss='true';document.head.appendChild(link)}
    bind();apply();
    window.SavingioAdminRole=Object.freeze({roles:()=>clone(roles),actions:()=>clone(actions),state:snapshot,can,canOpen,guard,permissions,setRole,setOverride,clearOverride,apply,audit:auditPermissions,auditLog:()=>clone(auditLog)});
    window.dispatchEvent(new CustomEvent('savingio:admin-role-ready',{detail:snapshot()}));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
