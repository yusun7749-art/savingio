(() => {
  const modules = [
    { id:'command', name:'통합 상황실', icon:'⌂', order:10, enabled:true, removable:false, children:['전체 진행률','오늘 작업','승인 필요','오류·중지','수익 요약'], capabilities:['dashboard','health','doctor','analytics'] },
    { id:'market', name:'시장분석본부', icon:'◎', order:20, enabled:true, removable:true, children:['주제 분석','인기 제품','영상·쇼츠 분석','댓글 반응','경쟁도','제작 추천'], capabilities:['research','score','recommend'] },
    { id:'content', name:'콘텐츠본부', icon:'✎', order:30, enabled:true, removable:true, children:['신규 글','기존 글 재작성','SEO','이미지','내부 링크','계산기','콘텐츠 QA'], capabilities:['create','edit','approve','publish','analytics'] },
    { id:'video', name:'쇼츠·영상본부', icon:'▶', order:40, enabled:true, removable:true, children:['기획','대본','장면 구성','이미지·소재','음성','자막','완성 영상'], capabilities:['create','asset','approve','publish','analytics'] },
    { id:'social', name:'SNS 배포본부', icon:'↗', order:50, enabled:true, removable:true, children:['YouTube Shorts','Instagram Reels','Threads','Facebook','Pinterest','예약 발행'], capabilities:['schedule','publish','retry','analytics'] },
    { id:'product', name:'상품·수익본부', icon:'₩', order:60, enabled:true, removable:true, children:['상품 DB','디지털 이미지','전자책·파일','제휴 링크','연결 콘텐츠','클릭','전환','수익·정산'], capabilities:['catalog','sell','link','analytics','revenue'] },
    { id:'approval', name:'승인센터', icon:'✓', order:70, enabled:true, removable:false, children:['글 승인','이미지 승인','영상 승인','상품 승인','발행 승인','반려·수정'], capabilities:['approve','reject','history'] },
    { id:'automation', name:'자동화센터', icon:'⚙', order:80, enabled:true, removable:false, children:['실행 예정','실행 중','완료','실패','재실행','긴급 중지'], capabilities:['schedule','run','stop','retry','log'] },
    { id:'analytics', name:'데이터·분석본부', icon:'▥', order:90, enabled:true, removable:true, children:['검색 유입','SNS 유입','영상 성과','상품 전환','애드센스','다음 주제'], capabilities:['analytics','report','recommend'] },
    { id:'system', name:'시스템관리', icon:'⚒', order:100, enabled:true, removable:false, children:['모듈 관리','분류 관리','API 연결','Publisher LOCK','GitHub','Cloudflare','백업·기록'], capabilities:['module-admin','category-admin','security','deployment','backup'] }
  ];

  const assetSchema = {
    required:['id','moduleId','title','type','status','category','createdAt','updatedAt'],
    optional:['subcategory','tags','files','thumbnail','channels','approval','publish','price','revenue','analytics','metadata'],
    statuses:['draft','working','review','approved','scheduled','published','paused','archived','error']
  };

  window.SAVINGIO_MODULE_REGISTRY = Object.freeze({ version:'1.0.0', modules, assetSchema });
})();