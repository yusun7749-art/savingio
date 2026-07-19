(async()=>{
  'use strict';

  const installProblemPathFix=()=>{
    if(!document.getElementById('savingio-problem-path-fix')){
      const style=document.createElement('style');
      style.id='savingio-problem-path-fix';
      style.textContent=`
        .savingio-problem-path{margin:48px 0 34px!important;padding:28px!important;border:1px solid #dbe5f3!important;border-radius:22px!important;background:linear-gradient(180deg,#f8fbff 0%,#fff 100%)!important;box-shadow:0 12px 30px rgba(23,105,255,.06)!important}
        .savingio-problem-path>h2{margin:0 0 8px!important;font-size:clamp(25px,3vw,32px)!important;line-height:1.3!important;letter-spacing:-.7px!important}
        .savingio-problem-path>p{margin:0 0 20px!important;color:#667085!important;line-height:1.65!important}
        .savingio-path-steps{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:12px!important}
        .savingio-path-step{display:flex!important;flex-direction:column!important;justify-content:space-between!important;min-width:0!important;min-height:116px!important;padding:18px!important;border:1px solid #dbe5f3!important;border-radius:16px!important;background:#fff!important;color:#25324b!important;text-decoration:none!important;line-height:1.45!important;box-shadow:0 4px 14px rgba(15,23,42,.03)!important;transition:border-color .18s ease,box-shadow .18s ease,transform .18s ease!important}
        .savingio-path-step:hover{border-color:#1769ff!important;box-shadow:0 10px 24px rgba(23,105,255,.11)!important;transform:translateY(-2px)!important}
        .savingio-path-step strong{display:-webkit-box!important;overflow:hidden!important;color:#183153!important;font-size:16px!important;line-height:1.45!important;-webkit-box-orient:vertical!important;-webkit-line-clamp:2!important}
        .savingio-path-step span{display:inline-flex!important;align-self:flex-start!important;margin-top:12px!important;padding:5px 9px!important;border-radius:999px!important;background:#f1f5f9!important;color:#64748b!important;font-size:12px!important;font-weight:700!important}
        .savingio-path-step[aria-current="step"]{border-color:#1769ff!important;background:#eef4ff!important;box-shadow:0 8px 22px rgba(23,105,255,.12)!important}
        .savingio-path-step[aria-current="step"] strong{color:#0f58d5!important}
        .savingio-path-step[aria-current="step"] span{background:#1769ff!important;color:#fff!important}
        @media(max-width:720px){.savingio-problem-path{padding:20px!important}.savingio-path-steps{grid-template-columns:1fr!important}.savingio-path-step{min-height:0!important}}
      `;
      document.head.append(style);
    }
    document.querySelectorAll('.savingio-problem-path').forEach((section)=>{
      if(section.dataset.compacted==='true')return;
      const container=section.querySelector('.savingio-path-steps');
      if(!container)return;
      const links=[...container.querySelectorAll('.savingio-path-step')];
      if(links.length<=6){section.dataset.compacted='true';return;}
      const currentIndex=links.findIndex((link)=>link.getAttribute('aria-current')==='step');
      const preferred=[];
      const add=(index)=>{if(index>=0&&index<links.length&&!preferred.includes(links[index]))preferred.push(links[index])};
      add(currentIndex);add(currentIndex-1);add(currentIndex+1);add(currentIndex-2);add(currentIndex+2);
      links.forEach((link)=>{if(preferred.length<6&&!preferred.includes(link))preferred.push(link)});
      container.replaceChildren(...preferred.slice(0,6));
      const note=section.querySelector(':scope > p');
      if(note)note.textContent='현재 글과 바로 이어서 확인할 핵심 단계만 정리했습니다.';
      section.dataset.compacted='true';
    });
  };

  const removeDuplicateEditorialCredit=()=>{
    const credit=document.querySelector('.editorial > strong');
    if(credit&&/작성\s*[·:]?\s*검수/.test(credit.textContent||''))credit.remove();
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{installProblemPathFix();removeDuplicateEditorialCredit()},{once:true});
  else{installProblemPathFix();removeDuplicateEditorialCredit()}

  if(document.getElementById('savingio-brain-nav'))return;
  let DATA=window.SAVINGIO_BRAIN_DATA;
  if(!DATA||!DATA.tree||typeof DATA.tree!=='object'){
    try{
      const response=await fetch('/data/savingio-brain-data.json?v=14',{cache:'no-store'});
      if(!response.ok)return;
      DATA=await response.json();
      window.SAVINGIO_BRAIN_DATA=DATA;
    }catch(_error){return;}
  }

  let exclusionPayload={excluded_paths:[]};
  try{
    const response=await fetch('/data/savingio-navigation-exclusions.json?v=1',{cache:'no-store'});
    if(response.ok)exclusionPayload=await response.json();
  }catch(_error){}

  const normalizePath=(value)=>{
    let path=value||'/';
    try{path=decodeURI(path)}catch(_error){}
    path=path.split('?')[0].split('#')[0].replace(/\/index\.html$/,'/').replace(/\.html$/,'').replace(/\/$/,'');
    return path||'/';
  };
  const excludedPaths=new Set((Array.isArray(exclusionPayload.excluded_paths)?exclusionPayload.excluded_paths:[]).map(normalizePath));
  const current=normalizePath(location.pathname);
  const isCurrent=(item)=>item&&normalizePath(item.href)===current;
  const esc=(value)=>String(value??'').replace(/[&<>"']/g,(char)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[char]);
  const normalize=(value)=>String(value||'').toLowerCase().replace(/[^0-9a-z가-힣]+/gi,'');
  const validHref=(href)=>typeof href==='string'&&/^\/(articles|calculators)\/[a-z0-9][a-z0-9-]*(?:\.html)?(?:[?#].*)?$/i.test(href.trim());
  const validItems=(items)=>{
    if(!Array.isArray(items))return[];
    const seen=new Set();
    return items.filter((item)=>{
      if(!item||typeof item.title!=='string'||!validHref(item.href))return false;
      const key=normalizePath(item.href);
      if(excludedPaths.has(key)||item.navigation_exclude===true||item.taxonomy_status==='mismatch'||seen.has(key))return false;
      seen.add(key);
      return item.title.trim().length>=2;
    });
  };

  const largeLabels={
    '돈 아끼기':'생활비가 너무 많이 나와요',
    '받을 돈 찾기':'받을 수 있는 돈을 찾고 싶어요',
    '세금 처리하기':'세금 신고·납부가 어려워요',
    '급여·일 처리하기':'월급·퇴직·일 문제를 해결하고 싶어요',
    '생활 문제 해결':'집·차·건강 문제를 해결하고 싶어요',
    '바로 계산하기':'금액을 바로 계산해 보고 싶어요'
  };
  const largeDescriptions={
    '돈 아끼기':'전기세·관리비·통신비 등 지출 줄이기',
    '받을 돈 찾기':'지원금·환급금·연금·혜택 확인하기',
    '세금 처리하기':'신고·납부·증명·사업 세금 처리하기',
    '급여·일 처리하기':'월급·퇴직금·실업·부업 확인하기',
    '생활 문제 해결':'주거·자동차·건강·교육 문제 해결하기',
    '바로 계산하기':'필요한 금액을 숫자로 바로 확인하기'
  };
  const middleLabels={
    '전기요금':'전기세가 너무 많이 나왔어요',
    '관리비':'관리비가 예상보다 많이 나왔어요',
    '수도요금':'수도요금이 갑자기 늘었어요',
    '통신비':'휴대폰·인터넷 요금을 줄이고 싶어요',
    '보험료':'보험료와 보장 내용을 점검하고 싶어요',
    '은행·카드':'은행 수수료와 카드값을 줄이고 싶어요',
    '연금':'연금으로 얼마를 받을지 궁금해요',
    '지원금':'받을 수 있는 지원금이 궁금해요',
    '환급금':'놓친 환급금이 있는지 찾고 싶어요',
    '근로·자녀장려금':'근로·자녀장려금을 받을 수 있을까요?',
    '연말정산':'연말정산 환급을 제대로 받고 싶어요',
    '종합소득세':'종합소득세 신고가 어려워요',
    '부가가치세':'부가세 신고와 납부가 궁금해요',
    '재산세':'재산세가 얼마나 나올지 궁금해요',
    '자동차세':'자동차세를 확인하고 절약하고 싶어요',
    '급여':'월급과 실수령액을 확인하고 싶어요',
    '퇴직':'퇴직금과 퇴사 절차가 궁금해요',
    '실업':'실업급여를 받을 수 있는지 궁금해요',
    '부업':'부업 수입과 신고 방법이 궁금해요',
    '주거':'집에서 문제가 생겼어요',
    '자동차':'차에 문제가 생기거나 비용이 걱정돼요',
    '건강':'병원비와 건강 문제를 확인하고 싶어요',
    '교육':'교육비와 아이 관련 지원이 궁금해요'
  };
  const smallLabels={
    '처음 확인하기':'무엇부터 확인해야 할까요?',
    '요금 구조·누진제 이해':'왜 이렇게 많이 나왔을까요?',
    '에어컨 전기세 줄이기':'에어컨 전기세를 줄이고 싶어요',
    '가전별 절약':'가전제품 전기세를 줄이고 싶어요',
    '할인·지원 확인':'할인이나 지원을 받을 수 있을까요?',
    '신청 준비':'신청 전에 무엇을 준비해야 할까요?',
    '신청 방법':'어디서 어떻게 신청하나요?',
    '대상·조건 확인':'제가 대상인지 확인하고 싶어요',
    '금액 계산':'얼마를 받을지 계산하고 싶어요',
    '문제 해결':'문제가 생겼는데 어떻게 해야 하나요?',
    '절약 방법':'실제로 줄일 수 있는 방법이 궁금해요',
    '기본 이해':'먼저 기본부터 알고 싶어요',
    '계산하기':'금액을 바로 계산해 보고 싶어요'
  };
  const displayLarge=(large)=>largeLabels[large]||large;
  const displayMiddle=(middle)=>middleLabels[middle]||middle;
  const displaySmall=(small)=>smallLabels[small]||small;

  const aliases=[
    {match:['차가안시원','에어컨안시원','미지근한바람','차가너무더워','자동차냉방'],expand:'자동차 에어컨 냉방 미지근한 바람 연비'},
    {match:['기름많이먹','기름값많이','연비나빠','주유비많이'],expand:'연비 주유비 연료비 자동차'},
    {match:['보험되나요','보험처리','보상받','누구책임'],expand:'보험 보상 배상 책임 청구'},
    {match:['물이새','천장누수','벽젖','누수'],expand:'누수 수도 집 보험 배상'},
    {match:['돈돌려받','환급받','숨은돈','못받은돈'],expand:'환급금 환급 숨은돈 지원금'},
    {match:['카드값이상','수수료아까','결제취소'],expand:'카드 결제 수수료 환불'},
    {match:['전기세많이','관리비많이','요금많이'],expand:'전기요금 관리비 생활비 절약'}
  ];
  const expandQuery=(query)=>{const q=normalize(query);const found=aliases.find((entry)=>entry.match.some((word)=>q.includes(normalize(word))));return found?`${query} ${found.expand}`:query};
  const grams=(value)=>{const text=normalize(value),out=[];for(let i=0;i<text.length-1;i++)out.push(text.slice(i,i+2));return out};
  const similarity=(left,right)=>{const a=grams(left),b=grams(right);if(!a.length||!b.length)return normalize(left)===normalize(right)?1:0;const pool=[...b];let hits=0;a.forEach((x)=>{const i=pool.indexOf(x);if(i>=0){hits++;pool.splice(i,1)}});return 2*hits/(a.length+b.length)};
  const score=(item,query)=>{const q=normalize(expandQuery(query));if(!q)return 1;const title=normalize(item.title),keywords=normalize(item.keywords);const exact=(Array.isArray(item.exactQueries)?item.exactQueries:[item.exactQueries]).map(normalize).filter(Boolean);if(exact.includes(q))return 1000;if(title===q)return 900;if(title.startsWith(q))return 700;if(title.includes(q))return 600;if(keywords.includes(q))return 500;const fuzzy=Math.max(0,...[...exact,title,keywords].filter(Boolean).map((value)=>similarity(value,q)));return q.length>=3&&fuzzy>=.46?200+Math.round(fuzzy*100):0};

  const locateCurrent=()=>{
    for(const [large,middles] of Object.entries(DATA.tree)){
      if(!middles||typeof middles!=='object')continue;
      for(const [middle,smalls] of Object.entries(middles)){
        if(!smalls||typeof smalls!=='object')continue;
        for(const [small,rawItems] of Object.entries(smalls)){
          const items=validItems(rawItems);
          const index=items.findIndex(isCurrent);
          if(index>=0)return{large,middle,small,items,index,item:items[index]};
        }
      }
    }
    return null;
  };

  const nav=document.createElement('aside');
  nav.id='savingio-brain-nav';
  nav.setAttribute('aria-label','Savingio 생활 문제 탐색');
  nav.innerHTML=`
    <button class="sbn-close" type="button" aria-label="생활 문제 탐색 닫기">×</button>
    <div class="sbn-head"><strong>지금 어떤 문제가 있으세요?</strong><small>카테고리 이름을 몰라도 괜찮아요.<br>지금 겪는 상황을 그대로 골라보세요.</small></div>
    <div class="sbn-search"><input type="search" placeholder="예: 전기세가 너무 많이 나왔어요" aria-label="Savingio 생활 문제 검색" autocomplete="off"></div>
    <div class="sbn-context"></div>
    <div class="sbn-tree"></div>`;

  const tree=nav.querySelector('.sbn-tree');
  const context=nav.querySelector('.sbn-context');
  const search=nav.querySelector('input');
  const currentLocation=locateCurrent();

  const renderContext=()=>{
    if(!currentLocation){context.hidden=true;return;}
    const {large,middle,small,items,index,item}=currentLocation;
    const neighbours=[];
    [index+1,index-1,index+2,index-2].forEach((i)=>{if(i>=0&&i<items.length&&!isCurrent(items[i])&&!neighbours.includes(items[i]))neighbours.push(items[i])});
    context.hidden=false;
    context.innerHTML=`
      <div class="sbn-context-label">지금 보고 있는 해결 경로</div>
      <div class="sbn-breadcrumb">${esc(displayLarge(large))} <span>›</span> ${esc(displayMiddle(middle))} <span>›</span> ${esc(displaySmall(small))}</div>
      <a class="sbn-current-card" href="${esc(item.href)}" aria-current="page">${esc(item.title)}</a>
      ${neighbours.length?`<div class="sbn-next-label">이어서 확인하면 좋은 내용</div><div class="sbn-next-list">${neighbours.slice(0,3).map((next)=>`<a href="${esc(next.href)}">${esc(next.title)}</a>`).join('')}</div>`:''}`;
  };

  function render(query=''){
    const q=normalize(query);
    context.hidden=Boolean(q)||!currentLocation;
    let html='';
    Object.entries(DATA.tree).forEach(([large,middles])=>{
      if(!middles||typeof middles!=='object')return;
      let middleHtml='',largeHasMatch=false,largeIsCurrent=false;
      Object.entries(middles).forEach(([middle,smalls])=>{
        if(!smalls||typeof smalls!=='object')return;
        let smallHtml='',middleHasMatch=false,middleIsCurrent=false;
        Object.entries(smalls).forEach(([small,rawItems])=>{
          const items=validItems(rawItems);
          const searchContext=`${large} ${displayLarge(large)} ${middle} ${displayMiddle(middle)} ${small} ${displaySmall(small)}`;
          const filtered=items.map((item)=>({item,score:score({title:item.title,keywords:`${item.search_keywords||''} ${searchContext}`,exactQueries:item.exact_queries||[]},query)})).filter(({score})=>!q||score>0).sort((a,b)=>b.score-a.score).map(({item})=>item);
          if(!filtered.length)return;
          const smallIsCurrent=items.some(isCurrent);
          largeHasMatch=middleHasMatch=true;
          if(smallIsCurrent)largeIsCurrent=middleIsCurrent=true;
          const links=filtered.map((item)=>`<li><a href="${esc(item.href)}"${isCurrent(item)?' aria-current="page"':''}><span>${esc(item.title)}</span></a></li>`).join('');
          smallHtml+=`<details class="sbn-small"${(smallIsCurrent||q)?' open':''}><summary>${esc(displaySmall(small))}</summary><ul class="sbn-items">${links}</ul></details>`;
        });
        if(middleHasMatch)middleHtml+=`<details class="sbn-middle"${(middleIsCurrent||q)?' open':''}><summary>${esc(displayMiddle(middle))}</summary>${smallHtml}</details>`;
      });
      if(largeHasMatch){
        const description=largeDescriptions[large]||((DATA.largeMeta&&DATA.largeMeta[large]&&DATA.largeMeta[large].description)||'');
        html+=`<details class="sbn-large"${(largeIsCurrent||q)?' open':''}><summary><span class="sbn-large-title">${esc(displayLarge(large))}</span>${description?`<span class="sbn-large-desc">${esc(description)}</span>`:''}</summary>${middleHtml}</details>`;
      }
    });
    tree.innerHTML=html||'<div class="sbn-empty">일치하는 결과가 없습니다.<br>문장을 조금 줄여 다시 찾아보세요.</div>';
    if(!q)tree.querySelectorAll('.sbn-large').forEach((details)=>details.addEventListener('toggle',()=>{if(!details.open)return;tree.querySelectorAll('.sbn-large[open]').forEach((other)=>{if(other!==details&&!other.querySelector('[aria-current="page"]'))other.open=false})}));
  }

  document.body.append(nav);
  document.documentElement.classList.add('savingio-brain-ready');
  renderContext();
  render();
  search.addEventListener('input',(event)=>render(event.target.value));

  const button=document.createElement('button');
  button.className='sbn-mobile-btn';button.type='button';button.textContent='문제 찾기';button.setAttribute('aria-label','생활 문제 탐색 열기');document.body.append(button);
  const backdrop=document.createElement('div');backdrop.className='sbn-backdrop';document.body.append(backdrop);
  const close=()=>{document.body.classList.remove('sbn-open');button.setAttribute('aria-expanded','false')};
  const open=()=>{document.body.classList.add('sbn-open');button.setAttribute('aria-expanded','true')};
  button.setAttribute('aria-expanded','false');button.addEventListener('click',open);nav.querySelector('.sbn-close').addEventListener('click',close);backdrop.addEventListener('click',close);document.addEventListener('keydown',(event)=>{if(event.key==='Escape')close()});nav.addEventListener('click',(event)=>{if(event.target.closest('a')&&matchMedia('(max-width:1180px)').matches)close()});
})();