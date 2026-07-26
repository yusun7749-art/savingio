(() => {
  'use strict';
  const KEY='savingio-admin-v2-build-progress';
  const SCHEMA_VERSION=3;
  const defaults=Object.freeze({schemaVersion:SCHEMA_VERSION,currentPhase:'공통 센터 기반 최종 검증',status:'verified',percent:'99',currentTask:'Production Admin V2에서 런타임 검증 전체 PASS 확인',completed:'MASTER LOG 전체 확인\n현재 Admin V2 구조 확인\n공통 Center Renderer 생성\n공통 Center Store Factory 생성\n개발 진행 보드 생성\nCloudflare 상태 Store 생성\nCloudflare Center 생성\nSEO Doctor 생성\nContent Doctor 생성\n저장 직후 화면 갱신 연결\n런타임 검증 센터 생성 및 검사 범위 강화\n좌측 메뉴 및 script 연결\nGitHub main 파일 재조회',remaining:'Cloudflare Pages 최신 배포 반영 확인\nProduction Admin V2에서 런타임 검증 전체 PASS 확인\n실제 브라우저 저장·재렌더링 확인\n최종 완료 판정',note:'GitHub main 구현·연결·재조회 완료. 실제 Production 브라우저 검증 전이므로 100% 완료 처리하지 않음.',history:[]});
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
  function write(patch){const current=read();const percent=Math.max(0,Math.min(100,Number(patch.percent??current.percent)||0));const next={...current,...patch,schemaVersion:SCHEMA_VERSION,percent:String(percent),history:[{at:new Date().toISOString(),note:clean(patch.note||current.note),status:clean(patch.status||current.status),percent:String(percent)},...(current.history||[])].slice(0,30)};localStorage.setItem(KEY,JSON.stringify(next));window.dispatchEvent(new CustomEvent('savingio:v2-center-data-changed',{detail:{center:'build-progress'}}));return next}
  function reset(){localStorage.removeItem(KEY);window.dispatchEvent(new CustomEvent('savingio:v2-center-data-changed',{detail:{center:'build-progress'}}));return read()}
  function verify(){const data=read();return Object.freeze({pass:Number(data.schemaVersion)===SCHEMA_VERSION&&states.includes(data.status)&&Number(data.percent)>=0&&Number(data.percent)<=100,noFakeCompletion:data.status!=='complete'||Number(data.percent)===100,schemaVersion:SCHEMA_VERSION});}
  Object.defineProperty(window,'SavingioV2BuildProgressStore',{value:Object.freeze({read,write,reset,verify,states,schemaVersion:SCHEMA_VERSION}),writable:false,configurable:false});
})();