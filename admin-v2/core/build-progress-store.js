(() => {
  'use strict';
  const KEY='savingio-admin-v2-build-progress';
  const SCHEMA_VERSION=4;
  const defaults=Object.freeze({schemaVersion:SCHEMA_VERSION,currentPhase:'공통 센터 기반 최종 검증',status:'verified',percent:'99',currentTask:'Production Admin V2에서 런타임 검증 전체 PASS 확인',completed:'MASTER LOG 전체 확인\n현재 Admin V2 구조 확인\n공통 Center Renderer 생성\n공통 Center Store Factory 생성\n개발 진행 보드 생성\nCloudflare 상태 Store 생성\nCloudflare Center 생성\nSEO Doctor 생성\nContent Doctor 생성\n저장 직후 화면 갱신 연결\n런타임 검증 센터 생성 및 검사 범위 강화\n좌측 메뉴 및 script 연결\nGitHub main 파일 재조회',remaining:'Production Admin V2에서 런타임 검증 전체 PASS 확인\n실제 브라우저 저장·재렌더링 확인\n최종 완료 판정',note:'런타임 검증 전체 PASS 전에는 100% 완료 처리하지 않음.',history:[],runtimeAudit:null});
  const states=Object.freeze(['not_started','in_progress','blocked','verified','complete']);
  const clean=value=>String(value??'').trim();
  function read(){
    try{
      const saved=JSON.parse(localStorage.getItem(KEY)||'{}');
      if(Number(saved.schemaVersion)!==SCHEMA_VERSION){
        const migrated={...defaults,history:Array.isArray(saved.history)?saved.history.slice(0,30):[]};
        localStorage.setItem(KEY,JSON.stringify(migrated));
        return migrated;
      }
      return {...defaults,...saved,schemaVersion:SCHEMA_VERSION};
    }catch{return {...defaults}}
  }
  function persist(next,eventDetail={center:'build-progress'}){
    localStorage.setItem(KEY,JSON.stringify(next));
    window.dispatchEvent(new CustomEvent('savingio:v2-center-data-changed',{detail:eventDetail}));
    return next;
  }
  function write(patch){
    const current=read();
    const percent=Math.max(0,Math.min(100,Number(patch.percent??current.percent)||0));
    const next={...current,...patch,schemaVersion:SCHEMA_VERSION,percent:String(percent),history:[{at:new Date().toISOString(),note:clean(patch.note||current.note),status:clean(patch.status||current.status),percent:String(percent)},...(current.history||[])].slice(0,30)};
    return persist(next);
  }
  function applyRuntimeAudit(result){
    if(!result||typeof result!=='object')throw new TypeError('Runtime audit result is required');
    const current=read();
    const audit={pass:Boolean(result.pass),total:Number(result.total)||0,passed:Number(result.passed)||0,failed:Number(result.failed)||0,checkedAt:String(result.checkedAt||new Date().toISOString()),releaseId:String(result.releaseId||'미확인'),version:String(result.version||'미확인')};
    const alreadyComplete=current.status==='complete'&&Number(current.percent)===100&&current.runtimeAudit?.checkedAt===audit.checkedAt;
    if(alreadyComplete)return current;
    const next=audit.pass?{
      ...current,schemaVersion:SCHEMA_VERSION,status:'complete',percent:'100',currentPhase:'공통 센터 기반 검증 완료',currentTask:'다음 Admin V2 모듈 개발 준비',completed:`${current.completed}\nProduction 브라우저 런타임 검증 전체 PASS\nRelease Marker 최신 버전 확인\n최종 완료 판정`.trim(),remaining:'없음',note:`런타임 검증 ${audit.passed}/${audit.total} PASS · Release ${audit.releaseId}`,runtimeAudit:audit,history:[{at:audit.checkedAt,note:`런타임 검증 전체 PASS · ${audit.releaseId}`,status:'complete',percent:'100'},...(current.history||[])].slice(0,30)
    }:{
      ...current,schemaVersion:SCHEMA_VERSION,status:'blocked',percent:'99',currentTask:`런타임 검증 FAIL ${audit.failed}건 수정`,remaining:`런타임 검증 FAIL ${audit.failed}건 확인 및 수정`,note:`런타임 검증 ${audit.passed}/${audit.total} PASS · FAIL ${audit.failed}`,runtimeAudit:audit,history:[{at:audit.checkedAt,note:`런타임 검증 FAIL ${audit.failed}건`,status:'blocked',percent:'99'},...(current.history||[])].slice(0,30)
    };
    return persist(next,{center:'build-progress',source:'runtime-audit',pass:audit.pass});
  }
  function reset(){localStorage.removeItem(KEY);window.dispatchEvent(new CustomEvent('savingio:v2-center-data-changed',{detail:{center:'build-progress'}}));return read()}
  function verify(){const data=read();const auditGate=data.status!=='complete'||Boolean(data.runtimeAudit?.pass);return Object.freeze({pass:Number(data.schemaVersion)===SCHEMA_VERSION&&states.includes(data.status)&&Number(data.percent)>=0&&Number(data.percent)<=100&&auditGate,noFakeCompletion:data.status!=='complete'||(Number(data.percent)===100&&Boolean(data.runtimeAudit?.pass)),auditGate,schemaVersion:SCHEMA_VERSION});}
  Object.defineProperty(window,'SavingioV2BuildProgressStore',{value:Object.freeze({read,write,applyRuntimeAudit,reset,verify,states,schemaVersion:SCHEMA_VERSION}),writable:false,configurable:false});
})();