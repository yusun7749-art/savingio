(() => {
  'use strict';
  const STORAGE_KEY='savingio-admin-projects';
  const defaults=[
    {id:'P-2026-001',title:'40대 주름크림',category:'뷰티 · 스킨케어',type:'통합 캠페인',status:'approval',statusLabel:'승인 대기',progress:62,updated:'오늘 17:40',stages:[['시장분석','done'],['제품 후보 5개','done'],['Savingio 글 1개','done'],['쇼츠 대본 3개','done'],['이미지·음성','active'],['영상 제작','wait'],['최종 승인','wait'],['자동 배포','wait'],['성과 추적','wait']]},
    {id:'P-2026-002',title:'자동차보험 마일리지 환급',category:'보험 · 자동차보험',type:'글+쇼츠',status:'running',statusLabel:'제작 중',progress:44,updated:'오늘 16:15',stages:[['시장분석','done'],['기존 글 확인','done'],['새 본문 작성','active'],['QA','wait'],['승인','wait'],['배포','wait']]},
    {id:'P-2026-003',title:'여름 전기요금 절약',category:'생활비 · 공과금',type:'SNS 캠페인',status:'error',statusLabel:'오류 1건',progress:78,updated:'오늘 14:02',stages:[['콘텐츠 연결','done'],['쇼츠 제작','done'],['YouTube 예약','done'],['Instagram 배포','active'],['Threads 배포','wait'],['성과 추적','wait']]},
    {id:'P-2026-004',title:'구독서비스 정리',category:'생활비 · 구독',type:'글',status:'done',statusLabel:'배포 완료',progress:100,updated:'어제 22:18',stages:[['글 작성','done'],['QA','done'],['승인','done'],['GitHub 반영','done'],['Cloudflare 배포','done'],['실제 URL 확인','done']]}
  ];
  const clone=value=>JSON.parse(JSON.stringify(value));
  function read(){
    try{
      const stored=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
      return Array.isArray(stored)&&stored.length?stored:clone(defaults);
    }catch{return clone(defaults)}
  }
  function write(list){
    if(!Array.isArray(list))throw new TypeError('Project list must be an array');
    localStorage.setItem(STORAGE_KEY,JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('savingio:v2-projects-changed'));
  }
  function summary(list=read()){
    const state=list.reduce((acc,item)=>{acc[item.status]=(acc[item.status]||0)+1;return acc},{running:0,approval:0,error:0,done:0});
    const average=list.length?Math.round(list.reduce((sum,item)=>sum+Number(item.progress||0),0)/list.length):0;
    return {state,average,total:list.length};
  }
  window.SavingioV2ProjectStore=Object.freeze({read,write,summary,storageKey:STORAGE_KEY});
})();