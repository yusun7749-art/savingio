(() => {
  'use strict';

  const HISTORY_KEY='savingio-plugin-marketplace-qa-history-v1';
  const clone=value=>JSON.parse(JSON.stringify(value));
  const now=()=>new Date().toISOString();
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

  function history(){
    try{const value=JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]');return Array.isArray(value)?value:[];}
    catch{return [];}
  }

  function save(report){
    const items=history();
    items.unshift(clone(report));
    localStorage.setItem(HISTORY_KEY,JSON.stringify(items.slice(0,100)));
  }

  function result(id,title,pass,detail='',severity='error'){
    return {id,title,pass:Boolean(pass),detail:String(detail||''),severity};
  }

  function requiredModules(){
    return [
      ['marketplace','Plugin Marketplace',window.SavingioPluginMarketplace],
      ['manager','Plugin Manager',window.SavingioPluginManager],
      ['install-ui','설치·업데이트 UI',window.SavingioPluginInstallUI],
      ['settings','Plugin Settings',window.SavingioPluginSettings],
      ['backup','백업·복원',window.SavingioPluginBackupRestore],
      ['dependency','의존성 관리자',window.SavingioPluginDependency],
      ['auto-update','자동 업데이트',window.SavingioPluginAutoUpdate],
      ['integrity','서명·무결성',window.SavingioPluginIntegrity]
    ];
  }

  function testModules(){
    return requiredModules().map(([id,title,api])=>result(`module-${id}`,`${title} 로딩`,Boolean(api),api?'API 준비':'전역 API 없음'));
  }

  function testCatalog(){
    const marketplace=window.SavingioPluginMarketplace;
    if(!marketplace) return [result('catalog-ready','Marketplace 카탈로그','false','Marketplace 미로딩')];
    const catalog=Array.isArray(marketplace.catalog)?marketplace.catalog:[];
    const ids=catalog.map(item=>item.id);
    const duplicateIds=[...new Set(ids.filter((id,index)=>ids.indexOf(id)!==index))];
    const invalid=catalog.filter(item=>!item.id||!item.name||!item.version||!item.global||!item.entry);
    return [
      result('catalog-count','카탈로그 항목 존재',catalog.length>0,`총 ${catalog.length}개`),
      result('catalog-duplicate','Plugin ID 중복 없음',duplicateIds.length===0,duplicateIds.join(', ')||'중복 없음'),
      result('catalog-schema','카탈로그 필수 필드',invalid.length===0,invalid.map(item=>item.id||'unknown').join(', ')||'정상'),
      result('catalog-list','카탈로그 조회 API',typeof marketplace.list==='function'&&Array.isArray(marketplace.list()),'list() 실행 가능'),
      result('catalog-summary','카탈로그 요약 API',typeof marketplace.summary==='function'&&typeof marketplace.summary()==='object','summary() 실행 가능')
    ];
  }

  function testInstalled(){
    const manager=window.SavingioPluginManager;
    if(!manager) return [result('installed-manager','설치 Plugin 검사',false,'Plugin Manager 미로딩')];
    let list=[];
    try{list=manager.list?.()||[];}catch(error){return [result('installed-list','설치 Plugin 목록',false,error?.message||'list 실패')];}
    const invalid=list.filter(item=>!item?.id||!item?.version||!item?.manifest);
    const ids=list.map(item=>item.id);
    const duplicate=[...new Set(ids.filter((id,index)=>ids.indexOf(id)!==index))];
    return [
      result('installed-list','설치 Plugin 목록 조회',Array.isArray(list),`총 ${list.length}개`),
      result('installed-schema','설치 Plugin Schema',invalid.length===0,invalid.map(item=>item.id||'unknown').join(', ')||'정상'),
      result('installed-duplicate','설치 Plugin 중복 없음',duplicate.length===0,duplicate.join(', ')||'중복 없음')
    ];
  }

  function testDependencies(){
    const dependency=window.SavingioPluginDependency;
    if(!dependency) return [result('dependency-ready','의존성 관리자',false,'API 미로딩')];
    const checks=[];
    checks.push(result('dependency-audit','의존성 Audit API',typeof dependency.audit==='function','audit 함수'));
    try{
      const report=typeof dependency.audit==='function'?dependency.audit():null;
      checks.push(result('dependency-valid','의존성 무결성',report?report.valid!==false:true,report?JSON.stringify(report.errors||[]):'audit 결과 없음'));
    }catch(error){checks.push(result('dependency-valid','의존성 무결성',false,error?.message||'audit 실패'));}
    return checks;
  }

  function testBackup(){
    const backup=window.SavingioPluginBackupRestore;
    if(!backup) return [result('backup-ready','백업·복원 API',false,'API 미로딩')];
    const manager=window.SavingioPluginManager;
    const ids=manager?.list?.().map(item=>item.id)||[];
    try{
      const snapshot=backup.snapshot?.(ids);
      return [
        result('backup-api','백업 API',typeof backup.snapshot==='function'&&typeof backup.restore==='function','snapshot/restore'),
        result('backup-snapshot','비파괴 Snapshot 생성',Boolean(snapshot),snapshot?`대상 ${ids.length}개`:'생성 실패')
      ];
    }catch(error){return [result('backup-snapshot','비파괴 Snapshot 생성',false,error?.message||'snapshot 실패')];}
  }

  function testAutoUpdate(){
    const api=window.SavingioPluginAutoUpdate;
    if(!api) return [result('auto-update-ready','자동 업데이트 API',false,'API 미로딩')];
    try{
      const audit=api.audit?.();
      const scan=api.scan?.();
      return [
        result('auto-update-scan','업데이트 Scan',Array.isArray(scan),Array.isArray(scan)?`대상 ${scan.length}개`:'scan 실패'),
        result('auto-update-audit','자동 업데이트 Audit',audit?.valid!==false,JSON.stringify(audit?.errors||[]))
      ];
    }catch(error){return [result('auto-update-audit','자동 업데이트 Audit',false,error?.message||'audit 실패')];}
  }

  async function testIntegrity(){
    const integrity=window.SavingioPluginIntegrity;
    if(!integrity) return [result('integrity-ready','무결성 API',false,'API 미로딩')];
    try{
      const sample={id:'savingio.qa.sample',version:'1.0.0',publisher:'Savingio',name:'QA Sample'};
      const signed=await integrity.sign(sample,{publisher:'Savingio',keyId:'qa'});
      const verified=await integrity.verify(signed,{requireSignature:true,blockTampered:true});
      const tampered={...signed,name:'Tampered'};
      const tamperedReport=await integrity.verify(tampered,{requireSignature:true,blockTampered:true});
      return [
        result('integrity-sign','SHA-256 서명 생성',Boolean(signed.signature?.value),signed.integrity||''),
        result('integrity-verify','정상 서명 검증',verified.valid===true,verified.errors?.join(', ')||'통과'),
        result('integrity-tamper','변조 탐지',tamperedReport.valid===false&&tamperedReport.blocked===true,tamperedReport.errors?.join(', ')||'변조 미탐지')
      ];
    }catch(error){return [result('integrity-test','서명·무결성 통합 검사',false,error?.message||'검사 실패')];}
  }

  function testPluginGlobals(){
    const catalog=window.SavingioPluginMarketplace?.catalog||[];
    return catalog.map(item=>{
      const api=window[item.global];
      const ok=Boolean(api&&typeof api.install==='function');
      return result(`plugin-${item.id}`,`${item.name} 실행 API`,ok,ok?'install 준비':`${item.global} 미로딩`);
    });
  }

  async function run(options={}){
    const startedAt=now();
    const checks=[
      ...testModules(),
      ...testCatalog(),
      ...testInstalled(),
      ...testDependencies(),
      ...testBackup(),
      ...testAutoUpdate(),
      ...(await testIntegrity()),
      ...testPluginGlobals()
    ];
    const failed=checks.filter(item=>!item.pass&&item.severity!=='warning');
    const warnings=checks.filter(item=>!item.pass&&item.severity==='warning');
    const report={
      id:`PMQA-${Date.now()}`,
      valid:failed.length===0,
      total:checks.length,
      passed:checks.filter(item=>item.pass).length,
      failed:failed.length,
      warnings:warnings.length,
      checks,
      startedAt,
      completedAt:now(),
      mode:options.mode||'safe-nondestructive'
    };
    save(report);
    window.dispatchEvent(new CustomEvent(report.valid?'savingio:plugin-marketplace-qa-pass':'savingio:plugin-marketplace-qa-fail',{detail:clone(report)}));
    return report;
  }

  async function render(root){
    root.innerHTML='<section class="workboard-view"><header class="workboard-head"><div><p class="eyebrow">SAVINGIO PLUGIN MARKETPLACE QA</p><h3>Plugin Marketplace 통합 QA</h3><p>Marketplace, 설치 상태, 의존성, 백업, 자동 업데이트, 서명·무결성을 비파괴 방식으로 검사합니다.</p></div><div class="workboard-current"><small>QA 상태</small><strong data-pmqa-status>검사 중</strong><span data-pmqa-summary>잠시만 기다려 주세요.</span></div></header><div class="workboard-layout"><main class="workboard-phases" data-pmqa-results></main><aside class="workboard-side"><section><h4>검사 모드</h4><p>Safe · Non-destructive</p></section><section><h4>최근 이력</h4><p data-pmqa-history></p></section><section><button type="button" data-pmqa-rerun>전체 QA 다시 실행</button></section></aside></div></section>';
    const execute=async()=>{
      const report=await run();
      const status=root.querySelector('[data-pmqa-status]');
      const summary=root.querySelector('[data-pmqa-summary]');
      const results=root.querySelector('[data-pmqa-results]');
      const historyNode=root.querySelector('[data-pmqa-history]');
      if(status) status.textContent=report.valid?'PASS':'FAIL';
      if(summary) summary.textContent=`전체 ${report.total} · 통과 ${report.passed} · 실패 ${report.failed}`;
      if(historyNode) historyNode.textContent=`저장된 QA ${history().length}회`;
      if(results) results.innerHTML=`<details open><summary><strong>통합 검사 결과</strong><span>${report.passed}/${report.total}</span></summary><ul>${report.checks.map(item=>`<li class="workboard-task ${item.pass?'done':'active'}"><span class="workboard-mark">${item.pass?'✓':'!'}</span><span><strong>${esc(item.title)}</strong>${esc(item.detail)}</span><em>${item.pass?'PASS':'FAIL'}</em></li>`).join('')}</ul></details>`;
      return report;
    };
    root.querySelector('[data-pmqa-rerun]')?.addEventListener('click',execute);
    return execute();
  }

  window.SavingioPluginMarketplaceQA=Object.freeze({run,render,history});
  window.dispatchEvent(new CustomEvent('savingio:plugin-marketplace-qa-ready',{detail:{history:history().length}}));
})();