(() => {
  'use strict';

  const STORAGE_KEY='savingio-admin-projects';
  const STORE_NAME='admin-v2-project-store';
  const ALLOWED_STATUS=Object.freeze(['running','approval','error','done']);
  const defaults=Object.freeze([
    {id:'P-2026-001',title:'40대 주름크림',category:'뷰티 · 스킨케어',type:'통합 캠페인',status:'approval',statusLabel:'승인 대기',progress:62,updated:'오늘 17:40',stages:[['시장분석','done'],['제품 후보 5개','done'],['Savingio 글 1개','done'],['쇼츠 대본 3개','done'],['이미지·음성','active'],['영상 제작','wait'],['최종 승인','wait'],['자동 배포','wait'],['성과 추적','wait']]},
    {id:'P-2026-002',title:'자동차보험 마일리지 환급',category:'보험 · 자동차보험',type:'글+쇼츠',status:'running',statusLabel:'제작 중',progress:44,updated:'오늘 16:15',stages:[['시장분석','done'],['기존 글 확인','done'],['새 본문 작성','active'],['QA','wait'],['승인','wait'],['배포','wait']]},
    {id:'P-2026-003',title:'여름 전기요금 절약',category:'생활비 · 공과금',type:'SNS 캠페인',status:'error',statusLabel:'오류 1건',progress:78,updated:'오늘 14:02',stages:[['콘텐츠 연결','done'],['쇼츠 제작','done'],['YouTube 예약','done'],['Instagram 배포','active'],['Threads 배포','wait'],['성과 추적','wait']]},
    {id:'P-2026-004',title:'구독서비스 정리',category:'생활비 · 구독',type:'글',status:'done',statusLabel:'배포 완료',progress:100,updated:'어제 22:18',stages:[['글 작성','done'],['QA','done'],['승인','done'],['GitHub 반영','done'],['Cloudflare 배포','done'],['실제 URL 확인','done']]}
  ]);

  const clone=value=>JSON.parse(JSON.stringify(value));
  const text=value=>String(value??'').trim();
  const clamp=value=>Math.max(0,Math.min(100,Number(value)||0));

  function normalizeStage(stage){
    if(!Array.isArray(stage))return null;
    const name=text(stage[0]);
    const state=['done','active','wait'].includes(stage[1])?stage[1]:'wait';
    return name?[name,state]:null;
  }

  function normalizeProject(project,index=0){
    if(!project||typeof project!=='object')throw new TypeError(`Invalid project at index ${index}`);
    const id=text(project.id);
    const title=text(project.title);
    if(!id||!title)throw new TypeError(`Project id and title are required at index ${index}`);
    const status=ALLOWED_STATUS.includes(project.status)?project.status:'running';
    return {
      id,
      title,
      category:text(project.category),
      type:text(project.type),
      status,
      statusLabel:text(project.statusLabel)||status,
      progress:clamp(project.progress),
      updated:text(project.updated),
      stages:(Array.isArray(project.stages)?project.stages:[]).map(normalizeStage).filter(Boolean)
    };
  }

  function normalizeList(list){
    if(!Array.isArray(list))throw new TypeError('Project list must be an array');
    const normalized=list.map(normalizeProject);
    const ids=normalized.map(project=>project.id);
    if(new Set(ids).size!==ids.length)throw new Error('Duplicate project id');
    return normalized;
  }

  function read(){
    try{
      const stored=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
      return clone(normalizeList(Array.isArray(stored)&&stored.length?stored:defaults));
    }catch{
      return clone(defaults);
    }
  }

  function write(list){
    const normalized=normalizeList(list);
    localStorage.setItem(STORAGE_KEY,JSON.stringify(normalized));
    const detail=Object.freeze({store:STORE_NAME,count:normalized.length,summary:summary(normalized)});
    window.dispatchEvent(new CustomEvent('savingio:v2-projects-changed',{detail}));
    return clone(normalized);
  }

  function summary(list=read()){
    const normalized=normalizeList(list);
    const state=normalized.reduce((acc,item)=>{acc[item.status]+=1;return acc},{running:0,approval:0,error:0,done:0});
    const average=normalized.length?Math.round(normalized.reduce((sum,item)=>sum+item.progress,0)/normalized.length):0;
    return Object.freeze({state:Object.freeze(state),average,total:normalized.length});
  }

  function verify(){
    try{
      const projects=read();
      const result=summary(projects);
      return Object.freeze({name:STORE_NAME,source:'localStorage',storageKey:STORAGE_KEY,count:projects.length,pass:result.total===projects.length});
    }catch(error){
      return Object.freeze({name:STORE_NAME,source:'localStorage',storageKey:STORAGE_KEY,count:0,pass:false,error:error.message});
    }
  }

  const api=Object.freeze({read,write,summary,verify,normalizeList,storageKey:STORAGE_KEY,name:STORE_NAME,source:'localStorage'});
  Object.defineProperty(window,'SavingioV2ProjectStore',{value:api,writable:false,configurable:false,enumerable:true});
})();