(() => {
  'use strict';

  const HISTORY_KEY='savingio-plugin-auto-update-history-v1';
  const POLICY_KEY='savingio-plugin-auto-update-policy-v1';
  const clone=value=>JSON.parse(JSON.stringify(value));
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const now=()=>new Date().toISOString();

  function manager(){
    if(!window.SavingioPluginManager) throw Object.assign(new Error('Plugin Manager가 준비되지 않았습니다.'),{code:'PLUGIN_MANAGER_NOT_READY'});
    return window.SavingioPluginManager;
  }

  function marketplace(){
    if(!window.SavingioPluginMarketplace) throw Object.assign(new Error('Plugin Marketplace가 준비되지 않았습니다.'),{code:'PLUGIN_MARKETPLACE_NOT_READY'});
    return window.SavingioPluginMarketplace;
  }

  function manifestEngine(){
    if(!window.SavingioPluginManifest) throw Object.assign(new Error('Plugin Manifest Engine이 준비되지 않았습니다.'),{code:'PLUGIN_MANIFEST_NOT_READY'});
    return window.SavingioPluginManifest;
  }

  function readJson(key,fallback){
    try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback));}
    catch{return clone(fallback);}
  }

  function history(){const value=readJson(HISTORY_KEY,[]);return Array.isArray(value)?value:[];}
  function addHistory(action,detail={}){
    const items=history();
    items.unshift({id:`PAU-${Date.now()}`,action,detail:clone(detail),createdAt:now()});
    localStorage.setItem(HISTORY_KEY,JSON.stringify(items.slice(0,200)));
  }

  function policy(){
    const value=readJson(POLICY_KEY,{enabled:false,channel:'stable',backupBeforeUpdate:true,rollbackOnFailure:true,includeDisabled:true});
    return {
      enabled:Boolean(value.enabled),
      channel:['stable','beta'].includes(value.channel)?value.channel:'stable',
      backupBeforeUpdate:value.backupBeforeUpdate!==false,
      rollbackOnFailure:value.rollbackOnFailure!==false,
      includeDisabled:value.includeDisabled!==false
    };
  }

  function setPolicy(next={}){
    const value={...policy(),...next};
    localStorage.setItem(POLICY_KEY,JSON.stringify(value));
    window.dispatchEvent(new CustomEvent('savingio:plugin-auto-update-policy',{detail:clone(value)}));
    return clone(value);
  }

  function compareVersions(a,b){
    if(typeof manifestEngine().compareVersions==='function') return manifestEngine().compareVersions(a,b);
    const left=String(a||'0').split('.').map(Number),right=String(b||'0').split('.').map(Number);
    for(let i=0;i<Math.max(left.length,right.length);i++){
      const diff=(left[i]||0)-(right[i]||0);
      if(diff) return diff>0?1:-1;
    }
    return 0;
  }

  function scan(){
    const installed=new Map(manager().list().map(item=>[item.id,item]));
    const catalog=marketplace().list();
    return catalog.map(item=>{
      const current=installed.get(item.id)||null;
      const comparison=current?compareVersions(item.version,current.version):0;
      return {
        id:item.id,
        name:item.name,
        category:item.category,
        installed:Boolean(current),
        enabled:current?.enabled!==false,
        currentVersion:current?.version||'',
        availableVersion:item.version,
        updateAvailable:Boolean(current&&comparison>0),
        status:!current?'not-installed':comparison>0?'update-available':comparison<0?'ahead':'current'
      };
    });
  }

  function updates(){return scan().filter(item=>item.updateAvailable);}

  function backup(ids){
    if(!window.SavingioPluginBackupRestore?.snapshot) return null;
    return window.SavingioPluginBackupRestore.snapshot(ids);
  }

  function restore(snapshot){
    if(!snapshot||!window.SavingioPluginBackupRestore?.restore) return null;
    return window.SavingioPluginBackupRestore.restore(snapshot,{stopOnError:false});
  }

  function updateOne(id,options={}){
    const item=scan().find(entry=>entry.id===id);
    if(!item) throw Object.assign(new Error(`Marketplace Plugin을 찾을 수 없습니다: ${id}`),{code:'PLUGIN_NOT_FOUND'});
    if(!item.installed) throw Object.assign(new Error(`설치되지 않은 Plugin입니다: ${id}`),{code:'PLUGIN_NOT_INSTALLED'});
    if(!item.updateAvailable) return {id,updated:false,reason:'UP_TO_DATE',from:item.currentVersion,to:item.availableVersion};

    const useBackup=options.backupBeforeUpdate??policy().backupBeforeUpdate;
    const useRollback=options.rollbackOnFailure??policy().rollbackOnFailure;
    const snapshot=useBackup?backup([id]):null;
    const current=manager().get(id);

    try{
      const catalog=marketplace().catalog.find(entry=>entry.id===id);
      const api=catalog?window[catalog.global]:null;
      if(api?.install) api.install({replace:true,source:'auto-update'});
      else manager().install({...current.manifest,version:item.availableVersion},{replace:true,enabled:current.enabled,settings:current.settings||{},source:'auto-update'});

      const updated=manager().get(id);
      if(!updated||compareVersions(updated.version,item.availableVersion)<0){
        throw Object.assign(new Error(`업데이트 후 버전 검증 실패: ${id}`),{code:'PLUGIN_UPDATE_VERSION_VERIFY_FAILED'});
      }
      window.SavingioPluginUI?.sync?.();
      const result={id,updated:true,from:item.currentVersion,to:updated.version,backupCreated:Boolean(snapshot)};
      addHistory('update-success',result);
      window.dispatchEvent(new CustomEvent('savingio:plugin-updated',{detail:clone(result)}));
      return result;
    }catch(error){
      let rollback=null;
      if(useRollback&&snapshot){
        try{rollback=restore(snapshot);}catch(rollbackError){rollback={valid:false,error:rollbackError?.message||'ROLLBACK_FAILED'};}
      }
      const result={id,updated:false,from:item.currentVersion,to:item.availableVersion,error:error?.message||'UNKNOWN',code:error?.code||'UNKNOWN',rollback};
      addHistory('update-failed',result);
      window.dispatchEvent(new CustomEvent('savingio:plugin-update-failed',{detail:clone(result)}));
      throw Object.assign(error,{updateResult:result});
    }
  }

  function updateMany(ids=[],options={}){
    const targetIds=(ids.length?ids:updates().map(item=>item.id));
    const dependency=window.SavingioPluginDependency?.installOrder?.(targetIds);
    const ordered=dependency?.order?.length?dependency.order:targetIds;
    const results=[];
    const failed=[];
    ordered.forEach(id=>{
      try{results.push(updateOne(id,options));}
      catch(error){failed.push({id,code:error?.code||'UNKNOWN',message:error?.message||''});if(options.stopOnError)throw error;}
    });
    const report={valid:failed.length===0,total:ordered.length,updated:results.filter(item=>item.updated).length,results,failed};
    addHistory('batch-update',report);
    window.dispatchEvent(new CustomEvent('savingio:plugin-auto-update-complete',{detail:clone(report)}));
    return report;
  }

  function runScheduled(){
    const currentPolicy=policy();
    if(!currentPolicy.enabled) return {skipped:true,reason:'AUTO_UPDATE_DISABLED',updates:updates().length};
    return updateMany([],{backupBeforeUpdate:currentPolicy.backupBeforeUpdate,rollbackOnFailure:currentPolicy.rollbackOnFailure});
  }

  function audit(){
    const items=scan();
    const errors=[];
    if(!window.SavingioPluginManager) errors.push('PLUGIN_MANAGER_NOT_READY');
    if(!window.SavingioPluginMarketplace) errors.push('PLUGIN_MARKETPLACE_NOT_READY');
    const duplicate=items.map(item=>item.id).filter((id,index,array)=>array.indexOf(id)!==index);
    duplicate.forEach(id=>errors.push(`DUPLICATE:${id}`));
    return {valid:errors.length===0,errors:[...new Set(errors)],installed:items.filter(item=>item.installed).length,updates:items.filter(item=>item.updateAvailable).length,history:history().length,policy:policy()};
  }

  function render(root){
    const items=scan();
    const report=audit();
    const currentPolicy=policy();
    root.innerHTML=`<section class="workboard-view"><header class="workboard-head"><div><p class="eyebrow">SAVINGIO PLUGIN AUTO UPDATE</p><h3>Plugin 자동 업데이트</h3><p>Marketplace 버전을 비교하고 백업·실패 롤백을 포함해 선택 또는 일괄 업데이트합니다.</p></div><div class="workboard-current"><small>업데이트 가능</small><strong>${report.updates}개</strong><span>설치 ${report.installed} · 이력 ${report.history}</span></div></header><div class="workboard-layout"><main class="workboard-phases"><details open><summary><strong>업데이트 대상</strong><span>${items.length}</span></summary><ul>${items.filter(item=>item.installed).map(item=>`<li class="workboard-task ${item.updateAvailable?'active':'done'}"><span class="workboard-mark">${item.updateAvailable?'●':'✓'}</span><span><strong>${esc(item.name)}</strong>현재 v${esc(item.currentVersion)} · 최신 v${esc(item.availableVersion)}</span><em>${esc(item.status)}</em></li>`).join('')||'<li>설치된 Plugin이 없습니다.</li>'}</ul><button type="button" data-plugin-update-all ${report.updates?'':'disabled'}>업데이트 ${report.updates}개 실행</button></details></main><aside class="workboard-side"><section><h4>자동 업데이트</h4><label><input type="checkbox" data-auto-update-enabled ${currentPolicy.enabled?'checked':''}> 사용</label></section><section><h4>안전 정책</h4><p>업데이트 전 백업 ${currentPolicy.backupBeforeUpdate?'사용':'해제'} · 실패 롤백 ${currentPolicy.rollbackOnFailure?'사용':'해제'}</p></section><section><h4>실행 결과</h4><p data-plugin-update-message>${report.valid?'검사 통과':'검사 실패'}</p></section></aside></div></section>`;
    const message=root.querySelector('[data-plugin-update-message]');
    root.querySelector('[data-auto-update-enabled]')?.addEventListener('change',event=>{setPolicy({enabled:event.currentTarget.checked});if(message)message.textContent='자동 업데이트 정책을 저장했습니다.';});
    root.querySelector('[data-plugin-update-all]')?.addEventListener('click',()=>{
      try{const result=updateMany();if(message)message.textContent=`업데이트 ${result.updated}개 · 실패 ${result.failed.length}개`;render(root);}catch(error){if(message)message.textContent=`실패: ${error?.message||'알 수 없는 오류'}`;}
    });
    return report;
  }

  window.SavingioPluginAutoUpdate=Object.freeze({policy,setPolicy,scan,updates,updateOne,updateMany,runScheduled,history,audit,render});
  window.dispatchEvent(new CustomEvent('savingio:plugin-auto-update-ready',{detail:audit()}));
})();