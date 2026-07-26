(() => {
  'use strict';
  const KEY='savingio-admin-v2-build-progress';
  const SCHEMA_VERSION=8;
  const workItems=Object.freeze([
    {id:'foundation',group:'기반',title:'Admin V2 기본 구조',status:'verified',route:'command-home'},
    {id:'legacy-root',group:'긴급 개편',title:'기존 /admin/ 메인 고정 출력 원인 제거',status:'verified',route:'tool-build-progress'},
    {id:'workspace-shell',group:'긴급 개편',title:'카테고리 전용 Workspace 컨테이너 구축',status:'verified',route:'tool-navigation-audit'},
    {id:'duplicate-tree',group:'긴급 개편',title:'Workspace 내부 중복 검색트리 제거',status:'verified',route:'tool-navigation-audit'},
    {id:'flat-layout',group:'긴급 개편',title:'카드형 박스 제거 및 평면 표·목록 전환',status:'verified',route:'tool-build-progress'},
    {id:'legacy-router',group:'긴급 개편',title:'왼쪽 카테고리 독립 화면 라우팅',status:'verified',route:'tool-navigation-audit'},
    {id:'department-screens',group:'운영 화면',title:'시장·콘텐츠·영상·SNS·상품·승인·자동화·분석·시스템 Workspace 분리',status:'verified',route:'tool-build-progress'},
    {id:'real-data',group:'운영 화면',title:'각 카테고리별 실제 데이터·작업 기능 연결',status:'in_progress',route:'tool-build-progress'},
    {id:'click-qa',group:'검증',title:'왼쪽 전체 카테고리 클릭 전수 확인',status:'not_started',route:'tool-navigation-audit'},
    {id:'mobile-qa',group:'검증',title:'모바일·좁은 화면 Workspace 전환 확인',status:'not_started',route:'tool-runtime-audit'},
    {id:'google-bridge',group:'외부 연결',title:'실제 Google API Bridge 연결',status:'blocked',route:'tool-external-connections'},
    {id:'final-e2e',group:'검증',title:'최종 Runtime·Production E2E',status:'not_started',route:'tool-production-verification'}
  ]);
  const defaults=Object.freeze({schemaVersion:SCHEMA_VERSION,currentPhase:'Admin Workspace 실사용화',status:'in_progress',percent:'88',currentTask:'왼쪽 검색트리 하나만 유지하고 중앙에 실제 표·목록·작업 기능 연결',completed:'사용자 화면 확인으로 중복 검색트리와 카드형 틀 문제 재확인\nWorkspace 내부 중복 검색트리 제거\n카드형 panel 외곽 제거\n중앙 화면을 제목·설명·표 구조로 평면화\n왼쪽 대분류·소분류 독립 화면 전환 유지\nURL·활성 메뉴·뒤로가기 연결 유지',remaining:'각 카테고리별 실제 데이터와 동작 연결\n왼쪽 전체 카테고리 브라우저 클릭 전수 확인\n모바일 전환 검증\n실제 Google API Bridge 연결\n최종 Runtime·Production E2E',note:'왼쪽 탐색기는 하나만 유지한다. 중앙 Workspace에 추가 탐색기나 카드형 장식 UI를 다시 만들지 않는다.',workItems,history:[],runtimeAudit:null});
  const states=Object.freeze(['not_started','in_progress','blocked','verified','complete']);
  const clean=value=>String(value??'').trim();
  function read(){try{const saved=JSON.parse(localStorage.getItem(KEY)||'{}');if(Number(saved.schemaVersion)!==SCHEMA_VERSION){const migrated={...defaults,history:Array.isArray(saved.history)?saved.history.slice(0,30):[]};localStorage.setItem(KEY,JSON.stringify(migrated));return migrated;}return {...defaults,...saved,schemaVersion:SCHEMA_VERSION,workItems:Array.isArray(saved.workItems)?saved.workItems:workItems};}catch{return {...defaults}}}
  function persist(next,eventDetail={center:'build-progress'}){localStorage.setItem(KEY,JSON.stringify(next));window.dispatchEvent(new CustomEvent('savingio:v2-center-data-changed',{detail:eventDetail}));return next;}
  function write(patch){const current=read();const percent=Math.max(0,Math.min(100,Number(patch.percent??current.percent)||0));const next={...current,...patch,schemaVersion:SCHEMA_VERSION,percent:String(percent),history:[{at:new Date().toISOString(),note:clean(patch.note||current.note),status:clean(patch.status||current.status),percent:String(percent)},...(current.history||[])].slice(0,30)};return persist(next);}
  function updateWorkItem(id,patch={}){const current=read();const items=(current.workItems||[]).map(item=>item.id===id?{...item,...patch}:item);return persist({...current,workItems:items,history:[{at:new Date().toISOString(),note:`전체작업표 갱신 · ${id}`,status:current.status,percent:current.percent},...(current.history||[])].slice(0,30)});}
  function applyRuntimeAudit(result){if(!result||typeof result!=='object')throw new TypeError('Runtime audit result is required');const current=read();const audit={pass:Boolean(result.pass),total:Number(result.total)||0,passed:Number(result.passed)||0,failed:Number(result.failed)||0,checkedAt:String(result.checkedAt||new Date().toISOString()),releaseId:String(result.releaseId||'미확인'),version:String(result.version||'미확인')};const next=audit.pass?{...current,runtimeAudit:audit,note:`런타임 검증 ${audit.passed}/${audit.total} PASS. 운영 브라우저 Workspace 검증은 별도 진행 중.`}:{...current,status:'blocked',currentTask:`런타임 검증 FAIL ${audit.failed}건 수정`,note:`런타임 검증 ${audit.passed}/${audit.total} PASS · FAIL ${audit.failed}`,runtimeAudit:audit};return persist(next,{center:'build-progress',source:'runtime-audit',pass:audit.pass});}
  function reset(){localStorage.removeItem(KEY);window.dispatchEvent(new CustomEvent('savingio:v2-center-data-changed',{detail:{center:'build-progress'}}));return read();}
  function verify(){const data=read();const itemsValid=Array.isArray(data.workItems)&&data.workItems.every(item=>item.id&&item.title&&states.includes(item.status));const auditGate=data.status!=='complete'||Boolean(data.runtimeAudit?.pass);return Object.freeze({pass:Number(data.schemaVersion)===SCHEMA_VERSION&&states.includes(data.status)&&Number(data.percent)>=0&&Number(data.percent)<=100&&auditGate&&itemsValid,noFakeCompletion:data.status!=='complete'||(Number(data.percent)===100&&Boolean(data.runtimeAudit?.pass)),auditGate,itemsValid,schemaVersion:SCHEMA_VERSION});}
  Object.defineProperty(window,'SavingioV2BuildProgressStore',{value:Object.freeze({read,write,updateWorkItem,applyRuntimeAudit,reset,verify,states,schemaVersion:SCHEMA_VERSION}),writable:false,configurable:false});
})();