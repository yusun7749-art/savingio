(() => {
  'use strict';
  const KEY='savingio-admin-v2-build-progress';
  const SCHEMA_VERSION=5;
  const defaultWorkItems=Object.freeze([
    {id:'foundation',group:'기반 구조',title:'Admin V2 Shell·Module Registry·Router',status:'verified',route:'tool-runtime-audit',note:'공통 화면 구조와 라우터 검증'},
    {id:'command',group:'통합 상황실',title:'메인 대시보드·워크플로·승인·오류',status:'verified',route:'command-home',note:'운영 센터 통합 현황'},
    {id:'centers',group:'운영 센터',title:'Content·SEO·Image·QA·Deploy·Analytics·Revenue',status:'verified',route:'dept-content',note:'7개 운영 센터 기본 화면'},
    {id:'external',group:'외부 연결',title:'Search Console·Analytics·AdSense Provider',status:'in_progress',route:'tool-external-connections',note:'구조 완료 · 실제 Google 인증 대기'},
    {id:'retry',group:'외부 연결',title:'Provider 오류·긴급 수정·자동 재시도',status:'verified',route:'tool-production-verification',note:'최대 3회 제한형 재시도'},
    {id:'navigation',group:'화면 연결',title:'왼쪽 검색트리·메인 카드 Route 전수 정비',status:'in_progress',route:'tool-navigation-audit',note:'현재 작업 위치'},
    {id:'browser',group:'운영 검증',title:'브라우저 메뉴·카드 전수 클릭 확인',status:'not_started',route:'tool-navigation-audit',note:'Cloudflare 반영 후 실제 확인'},
    {id:'mobile',group:'운영 검증',title:'모바일·좁은 화면 검색트리 확인',status:'not_started',route:'tool-navigation-audit',note:'반응형 실제 화면 검사'},
    {id:'bridge',group:'실제 데이터',title:'Google API Bridge 또는 서버 Endpoint',status:'blocked',route:'tool-external-connections',note:'인증 정보·서버 연결 필요'},
    {id:'final',group:'최종 완료',title:'Runtime Audit·Production E2E 전체 PASS',status:'not_started',route:'tool-runtime-audit',note:'실제 검증 전 100% 금지'}
  ]);
  const defaults=Object.freeze({schemaVersion:SCHEMA_VERSION,currentPhase:'화면 연결 전수 정비',status:'in_progress',percent:'86',currentTask:'왼쪽 검색트리와 어드민 메인 카드의 Route 연결 상태 확인 및 수정',completed:'Admin V2 기반 구조\n운영 센터 기본 화면\n외부 Provider 구조\n자동 재시도 엔진\n메뉴·화면 연결 검사 센터\n어드민 메인 운영 센터 바로가기',remaining:'브라우저 메뉴·카드 전수 클릭 확인\n모바일 검색트리 확인\n실제 Google Bridge 연결\nRuntime Audit·Production E2E 최종 PASS',note:'현재 작업은 화면 연결 전수 정비입니다. 실제 브라우저 확인 전 완료 처리하지 않습니다.',history:[],runtimeAudit:null,workItems:defaultWorkItems});
  const states=Object.freeze(['not_started','in_progress','blocked','verified','complete']);
  const clean=value=>String(value??'').trim();
  const clone=value=>JSON.parse(JSON.stringify(value));
  function normalizeItems(items){const source=Array.isArray(items)?items:defaultWorkItems;return source.map(item=>({id:clean(item.id),group:clean(item.group),title:clean(item.title),status:states.includes(item.status)?item.status:'not_started',route:clean(item.route),note:clean(item.note)})).filter(item=>item.id&&item.title);}
  function read(){
    try{
      const saved=JSON.parse(localStorage.getItem(KEY)||'{}');
      if(Number(saved.schemaVersion)!==SCHEMA_VERSION){
        const migrated={...defaults,history:Array.isArray(saved.history)?saved.history.slice(0,30):[],workItems:normalizeItems(saved.workItems)};
        localStorage.setItem(KEY,JSON.stringify(migrated));
        return clone(migrated);
      }
      return {...clone(defaults),...saved,schemaVersion:SCHEMA_VERSION,workItems:normalizeItems(saved.workItems)};
    }catch{return clone(defaults)}
  }
  function persist(next,eventDetail={center:'build-progress'}){localStorage.setItem(KEY,JSON.stringify(next));window.dispatchEvent(new CustomEvent('savingio:v2-center-data-changed',{detail:eventDetail}));return next;}
  function write(patch){const current=read();const percent=Math.max(0,Math.min(100,Number(patch.percent??current.percent)||0));const next={...current,...patch,schemaVersion:SCHEMA_VERSION,percent:String(percent),workItems:normalizeItems(patch.workItems||current.workItems),history:[{at:new Date().toISOString(),note:clean(patch.note||current.note),status:clean(patch.status||current.status),percent:String(percent)},...(current.history||[])].slice(0,30)};return persist(next);}
  function updateWorkItem(id,patch={}){const current=read();const workItems=current.workItems.map(item=>item.id===id?{...item,...patch,status:states.includes(patch.status)?patch.status:item.status}:item);return write({...current,workItems,note:patch.note||current.note});}
  function applyRuntimeAudit(result){if(!result||typeof result!=='object')throw new TypeError('Runtime audit result is required');const current=read();const audit={pass:Boolean(result.pass),total:Number(result.total)||0,passed:Number(result.passed)||0,failed:Number(result.failed)||0,checkedAt:String(result.checkedAt||new Date().toISOString()),releaseId:String(result.releaseId||'미확인'),version:String(result.version||'미확인')};const workItems=current.workItems.map(item=>item.id==='final'?{...item,status:audit.pass?'complete':'blocked',note:audit.pass?`Runtime ${audit.passed}/${audit.total} PASS`:`Runtime FAIL ${audit.failed}건`}:item);const next=audit.pass?{...current,status:'complete',percent:'100',currentPhase:'Admin V2 최종 검증 완료',currentTask:'완료',remaining:'없음',note:`런타임 검증 ${audit.passed}/${audit.total} PASS`,runtimeAudit:audit,workItems}:{...current,status:'blocked',percent:'99',currentTask:`런타임 검증 FAIL ${audit.failed}건 수정`,remaining:`런타임 검증 FAIL ${audit.failed}건 확인 및 수정`,note:`런타임 검증 ${audit.passed}/${audit.total} PASS · FAIL ${audit.failed}`,runtimeAudit:audit,workItems};next.history=[{at:audit.checkedAt,note:next.note,status:next.status,percent:next.percent},...(current.history||[])].slice(0,30);return persist(next,{center:'build-progress',source:'runtime-audit',pass:audit.pass});}
  function reset(){localStorage.removeItem(KEY);window.dispatchEvent(new CustomEvent('savingio:v2-center-data-changed',{detail:{center:'build-progress'}}));return read()}
  function summary(){const data=read();const counts=Object.fromEntries(states.map(state=>[state,data.workItems.filter(item=>item.status===state).length]));return Object.freeze({...counts,total:data.workItems.length,current:data.workItems.filter(item=>item.status==='in_progress')});}
  function verify(){const data=read();const auditGate=data.status!=='complete'||Boolean(data.runtimeAudit?.pass);const itemsValid=data.workItems.length>0&&data.workItems.every(item=>item.id&&item.title&&states.includes(item.status));return Object.freeze({pass:Number(data.schemaVersion)===SCHEMA_VERSION&&states.includes(data.status)&&Number(data.percent)>=0&&Number(data.percent)<=100&&auditGate&&itemsValid,noFakeCompletion:data.status!=='complete'||(Number(data.percent)===100&&Boolean(data.runtimeAudit?.pass)),auditGate,itemsValid,schemaVersion:SCHEMA_VERSION});}
  Object.defineProperty(window,'SavingioV2BuildProgressStore',{value:Object.freeze({read,write,updateWorkItem,applyRuntimeAudit,reset,summary,verify,states,schemaVersion:SCHEMA_VERSION}),writable:false,configurable:false});
})();