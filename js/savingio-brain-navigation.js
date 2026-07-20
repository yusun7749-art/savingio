(async()=>{
'use strict';

/* Always load the latest Explorer skin even when an older page still links a previous version. */
const explorerCss='/css/savingio-brain-navigation.css?v=15';
let explorerLink=document.querySelector('link[href*="savingio-brain-navigation.css"]');
if(explorerLink){
  if(explorerLink.getAttribute('href')!==explorerCss) explorerLink.setAttribute('href',explorerCss);
}else{
  explorerLink=document.createElement('link');
  explorerLink.rel='stylesheet';
  explorerLink.href=explorerCss;
  document.head.appendChild(explorerLink);
}

/* Search result layout guard: prevents old/global styles from flattening cards into one text block. */
if(!document.getElementById('sbn-search-layout-guard')){
  const guard=document.createElement('style');
  guard.id='sbn-search-layout-guard';
  guard.textContent=`
  #savingio-brain-nav .sbn-results{display:grid!important;grid-template-columns:1fr!important;gap:9px!important;width:100%!important}
  #savingio-brain-nav .sbn-result-card{display:grid!important;grid-template-columns:1fr auto!important;grid-template-areas:"path path" "title arrow" "desc desc"!important;gap:5px 10px!important;width:100%!important;padding:13px 14px!important;border:1px solid rgba(117,96,67,.16)!important;border-radius:12px!important;background:#fff!important;color:#32363a!important;text-decoration:none!important;overflow:hidden!important;box-shadow:none!important}
  #savingio-brain-nav .sbn-result-path{grid-area:path!important;display:block!important;margin:0!important;color:#9a7040!important;font-size:10px!important;font-weight:800!important;line-height:1.35!important;white-space:normal!important}
  #savingio-brain-nav .sbn-result-title{grid-area:title!important;display:block!important;min-width:0!important;margin:0!important;color:#132744!important;font-size:13px!important;font-weight:800!important;line-height:1.5!important;letter-spacing:-.2px!important;word-break:keep-all!important;overflow-wrap:anywhere!important}
  #savingio-brain-nav .sbn-result-desc{grid-area:desc!important;display:-webkit-box!important;margin:0!important;color:#77746f!important;font-size:11px!important;font-weight:400!important;font-style:normal!important;line-height:1.55!important;-webkit-line-clamp:2!important;-webkit-box-orient:vertical!important;overflow:hidden!important}
  #savingio-brain-nav .sbn-result-arrow{grid-area:arrow!important;display:grid!important;place-items:center!important;align-self:center!important;width:25px!important;height:25px!important;border-radius:50%!important;background:rgba(185,130,56,.10)!important;color:#8f6532!important;font-size:14px!important;font-style:normal!important;line-height:1!important}
  #savingio-brain-nav .sbn-result-card:hover{transform:translateY(-1px)!important;border-color:rgba(185,130,56,.38)!important;background:#fffdf9!important}
  #savingio-brain-nav .sbn-search{grid-template-columns:minmax(0,1fr)!important}
  #savingio-brain-nav .sbn-search button{display:none!important}
  #savingio-brain-nav .sbn-search input{padding-right:34px!important}
  `;
  document.head.appendChild(guard);
}

const normalizeText=(value)=>String(value||'').toLowerCase().replace(/\s+/g,' ').trim();
const compact=(value)=>normalizeText(value).replace(/[^0-9a-z가-힣]+/gi,'');

/* Article directory search: uses title, summary, category and meaningful topic synonyms only. */
function initArticleDirectorySearch(){
  const search=document.getElementById('articleSearch');
  const grid=document.getElementById('articleGrid');
  const count=document.getElementById('resultCount');
  if(!search||!grid||!count||search.dataset.savingioSearchReady==='1')return;
  search.dataset.savingioSearchReady='1';

  const cards=[...grid.querySelectorAll('.article-card')];
  const pager=document.querySelector('.pager');
  const buttons=[...document.querySelectorAll('.category-row button[data-cat]')];
  let activeCategory='전체';

  const topicGroups={
    '정부':['정부','정부24','정부혜택','정부지원','지원금','복지','복지로','수당','장려금','바우처','보조금','지원제도','국가지원','공공지원'],
    '지원':['지원','지원금','정부지원','정부혜택','복지','수당','장려금','바우처','보조금'],
    '환급':['환급','환급금','돌려받','과납','과오납','정산'],
    '자동차':['자동차','차량','운전','교통','보험','자동차세'],
    '아이':['아이','아동','자녀','육아','보육','교육','돌봄'],
    '노인':['노인','고령','어르신','기초연금','노후','장기요양'],
    '은행':['은행','계좌','통장','수수료','이체','예금','카드'],
    '세금':['세금','세액','납부','신고','공제','국세','지방세'],
    '전기':['전기','전기세','전기요금','에어컨','냉방','에너지']
  };

  const cardRecord=(card)=>{
    const title=card.querySelector('h2')?.textContent||'';
    const desc=card.querySelector('p')?.textContent||'';
    const category=card.dataset.category||card.querySelector('.card-category')?.textContent||'';
    const href=card.getAttribute('href')||'';
    return {card,title,desc,category,href,text:normalizeText(`${title} ${desc} ${category} ${href}`)};
  };
  const records=cards.map(cardRecord);

  const termsFor=(query)=>{
    const q=normalizeText(query);
    const terms=new Set([q]);
    Object.entries(topicGroups).forEach(([key,values])=>{
      if(q.includes(key)||values.some(v=>q.includes(v))) values.forEach(v=>terms.add(normalizeText(v)));
    });
    return [...terms].filter(Boolean);
  };

  const matches=(record,query)=>{
    const q=normalizeText(query);
    if(!q)return true;
    const cq=compact(q);
    if(compact(record.title).includes(cq)||compact(record.desc).includes(cq)||compact(record.category).includes(cq)||compact(record.href).includes(cq))return true;
    const terms=termsFor(q);
    return terms.some(term=>{
      const ct=compact(term);
      if(!ct)return false;
      if(compact(record.category).includes(ct))return true;
      if(compact(record.title).includes(ct))return true;
      if(compact(record.desc).includes(ct))return true;
      return compact(record.href).includes(ct);
    });
  };

  const apply=()=>{
    const query=search.value.trim();
    let shown=0;
    records.forEach(record=>{
      const categoryOk=activeCategory==='전체'||record.category===activeCategory;
      const visible=categoryOk&&matches(record,query);
      record.card.hidden=!visible;
      record.card.style.display=visible?'':'none';
      if(visible)shown++;
    });
    count.textContent=`검색 결과 ${shown}개`;
    if(pager)pager.style.display=query||activeCategory!=='전체'?'none':'';
  };

  search.addEventListener('input',event=>{
    event.stopImmediatePropagation();
    apply();
  },true);
  search.addEventListener('search',event=>{
    event.stopImmediatePropagation();
    apply();
  },true);
  buttons.forEach(button=>button.addEventListener('click',event=>{
    event.preventDefault();
    event.stopImmediatePropagation();
    activeCategory=button.dataset.cat||'전체';
    buttons.forEach(item=>item.classList.toggle('active',item===button));
    apply();
  },true));
  apply();
}

initArticleDirectorySearch();

if(document.getElementById('savingio-brain-nav'))return;

let DATA=window.SAVINGIO_BRAIN_DATA;
if(!DATA||!DATA.tree){
  try{
    const res=await fetch('/data/savingio-brain-data.json?v=14',{cache:'no-store'});
    if(!res.ok)throw new Error('navigation data');
    DATA=await res.json();
    window.SAVINGIO_BRAIN_DATA=DATA;
  }catch(_){return;}
}

const normalizePath=(value)=>{
  let path=String(value||'/');
  try{path=decodeURI(path)}catch(_){}
  path=path.split('?')[0].split('#')[0].replace(/\/index\.html$/,'/').replace(/\.html$/,'').replace(/\/$/,'');
  return path||'/';
};
const normalize=(value)=>String(value||'').toLowerCase().replace(/[^0-9a-z가-힣]+/gi,'');
const esc=(value)=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const validHref=(href)=>typeof href==='string'&&/^\/(articles|calculators)\/[a-z0-9][a-z0-9-]*(?:\.html)?(?:[?#].*)?$/i.test(href.trim());
const current=normalizePath(location.pathname);

const largeLabels={
 '돈 아끼기':'생활비가 너무 많이 나와요','받을 돈 찾기':'받을 수 있는 돈을 찾고 싶어요',
 '세금 처리하기':'세금 신고·납부가 어려워요','급여·일 처리하기':'월급·퇴직·일 문제를 해결하고 싶어요',
 '생활 문제 해결':'집·차·건강 문제를 해결하고 싶어요','바로 계산하기':'금액을 바로 계산해 보고 싶어요'
};
const largeDescriptions={
 '돈 아끼기':'전기세·관리비·통신비·은행 수수료 줄이기','받을 돈 찾기':'지원금·환급금·연금·혜택 확인하기',
 '세금 처리하기':'신고·납부·증명·사업 세금 처리하기','급여·일 처리하기':'월급·퇴직금·실업·부업 확인하기',
 '생활 문제 해결':'주거·자동차·건강·교육 문제 해결하기','바로 계산하기':'필요한 금액을 숫자로 바로 확인하기'
};
const middleLabels={
 '전기요금':'전기세가 너무 많이 나왔어요','관리비':'관리비가 예상보다 많이 나왔어요','수도요금':'수도요금이 갑자기 늘었어요',
 '통신비':'휴대폰·인터넷 요금을 줄이고 싶어요','보험료':'보험료와 보장 내용을 점검하고 싶어요',
 '은행·카드':'은행 수수료와 카드값을 줄이고 싶어요','연금':'연금으로 얼마를 받을지 궁금해요',
 '지원금':'받을 수 있는 지원금이 궁금해요','환급금':'놓친 환급금이 있는지 찾고 싶어요',
 '근로·자녀장려금':'근로·자녀장려금을 받을 수 있을까요?','연말정산':'연말정산 환급을 제대로 받고 싶어요',
 '종합소득세':'종합소득세 신고가 어려워요','부가가치세':'부가세 신고와 납부가 궁금해요','재산세':'재산세가 얼마나 나올지 궁금해요',
 '자동차세':'자동차세를 확인하고 절약하고 싶어요','급여':'월급과 실수령액을 확인하고 싶어요','퇴직':'퇴직금과 퇴사 절차가 궁금해요',
 '실업':'실업급여를 받을 수 있는지 궁금해요','부업':'부업 수입과 신고 방법이 궁금해요','주거':'집에서 문제가 생겼어요',
 '자동차':'차에 문제가 생기거나 비용이 걱정돼요','건강':'병원비와 건강 문제를 확인하고 싶어요','교육':'교육비와 아이 관련 지원이 궁금해요'
};
const smallLabels={'처음 확인하기':'무엇부터 확인해야 할까요?','요금 구조·누진제 이해':'왜 이렇게 많이 나왔을까요?','에어컨 전기세 줄이기':'에어컨 전기세를 줄이고 싶어요','가전별 절약':'가전제품 전기세를 줄이고 싶어요','할인·지원 확인':'할인이나 지원을 받을 수 있을까요?','신청 준비':'신청 전에 무엇을 준비해야 할까요?','신청 방법':'어디서 어떻게 신청하나요?','대상·조건 확인':'제가 대상인지 확인하고 싶어요','금액 계산':'얼마를 받을지 계산하고 싶어요','문제 해결':'문제가 생겼는데 어떻게 해야 하나요?','절약 방법':'실제로 줄일 수 있는 방법이 궁금해요','기본 이해':'먼저 기본부터 알고 싶어요','계산하기':'금액을 바로 계산해 보고 싶어요'};
const displayLarge=v=>largeLabels[v]||v,displayMiddle=v=>middleLabels[v]||v,displaySmall=v=>smallLabels[v]||v;

const records=[];
const seen=new Set();
Object.entries(DATA.tree||{}).forEach(([large,middles])=>Object.entries(middles||{}).forEach(([middle,smalls])=>Object.entries(smalls||{}).forEach(([small,items])=>(Array.isArray(items)?items:[]).forEach(item=>{
  if(!item||!validHref(item.href)||!item.title)return;
  const key=normalizePath(item.href); if(seen.has(key))return; seen.add(key);
  const description=String(item.description||item.summary||item.excerpt||item.search_description||'').trim();
  records.push({...item,description,large,middle,small,key,haystack:`${item.title} ${description} ${item.search_keywords||''} ${large} ${displayLarge(large)} ${middle} ${displayMiddle(middle)} ${small} ${displaySmall(small)}`});
}))));

const score=(item,qRaw)=>{
  const q=normalize(qRaw),title=normalize(item.title),hay=normalize(item.haystack);
  if(!q)return 1;
  if(title===q)return 1000;
  if(title.startsWith(q))return 850;
  if(title.includes(q))return 700;
  if(hay.includes(q))return 500;
  const tokens=String(qRaw).trim().split(/\s+/).map(normalize).filter(Boolean);
  return tokens.reduce((sum,t)=>sum+(title.includes(t)?120:hay.includes(t)?45:0),0);
};
const currentRecord=records.find(r=>r.key===current);

const nav=document.createElement('aside');
nav.id='savingio-brain-nav';
nav.setAttribute('aria-label','Savingio 생활 문제 탐색');
nav.innerHTML=`<button class="sbn-close" type="button" aria-label="탐색 닫기">×</button>
<div class="sbn-head"><strong>지금 어떤 문제가 있으세요?</strong><small>카테고리 이름을 몰라도 괜찮아요.<br>상황이나 글 제목을 입력해 보세요.</small></div>
<form class="sbn-search" role="search"><input type="search" placeholder="예: 은행 수수료, 카드값, 전기세" aria-label="사이트 글 검색" autocomplete="off"><button type="submit" tabindex="-1">검색</button></form>
<div class="sbn-search-status" aria-live="polite"></div><div class="sbn-context"></div><div class="sbn-tree"></div>`;
const tree=nav.querySelector('.sbn-tree'),context=nav.querySelector('.sbn-context'),form=nav.querySelector('.sbn-search'),input=form.querySelector('input'),status=nav.querySelector('.sbn-search-status');

function renderContext(){
 if(!currentRecord){context.hidden=true;return;}
 const related=records.filter(r=>r.key!==current&&r.middle===currentRecord.middle).slice(0,3);
 context.hidden=false;
 context.innerHTML=`<div class="sbn-context-label">지금 보고 있는 글</div><div class="sbn-breadcrumb">${esc(displayLarge(currentRecord.large))}<span>›</span>${esc(displayMiddle(currentRecord.middle))}</div><a class="sbn-current-card" href="${esc(currentRecord.href)}" aria-current="page">${esc(currentRecord.title)}</a>${related.length?`<div class="sbn-next-label">이어서 확인하면 좋은 글</div><div class="sbn-next-list">${related.map(r=>`<a href="${esc(r.href)}">${esc(r.title)}</a>`).join('')}</div>`:''}`;
}
function renderSearch(q){
 const results=records.map(r=>({r,s:score(r,q)})).filter(x=>x.s>0&&x.r.key!==current).sort((a,b)=>b.s-a.s).slice(0,12).map(x=>x.r);
 context.hidden=true;
 status.textContent=results.length?`검색 결과 ${results.length}개`:'검색 결과가 없습니다';
 tree.innerHTML=results.length?`<div class="sbn-results">${results.map(r=>{
   const desc=r.description||`${displayMiddle(r.middle)} 관련 내용을 확인합니다.`;
   return `<a class="sbn-result-card" href="${esc(r.href)}"><span class="sbn-result-path">${esc(displayLarge(r.large))} · ${esc(displayMiddle(r.middle))}</span><strong class="sbn-result-title">${esc(r.title)}</strong><span class="sbn-result-desc">${esc(desc)}</span><em class="sbn-result-arrow" aria-hidden="true">›</em></a>`;
 }).join('')}</div>`:`<div class="sbn-empty">일치하는 글이 없습니다.<br>검색어를 짧게 입력해 보세요.</div>`;
 return results;
}
function renderTree(){
 status.textContent='카테고리를 펼치거나 검색해 글을 찾으세요';
 let html='';
 Object.entries(DATA.tree||{}).forEach(([large,middles])=>{
  let middleHtml='';
  Object.entries(middles||{}).forEach(([middle,smalls])=>{
   const group=records.filter(r=>r.large===large&&r.middle===middle); if(!group.length)return;
   const isHere=group.some(r=>r.key===current);
   let smallHtml='';
   Object.entries(smalls||{}).forEach(([small])=>{
    const items=group.filter(r=>r.small===small); if(!items.length)return;
    const smallHere=items.some(r=>r.key===current);
    smallHtml+=`<details class="sbn-small"${smallHere?' open':''}><summary>${esc(displaySmall(small))}<span class="sbn-count">${items.length}</span></summary><ul class="sbn-items">${items.map(r=>`<li><a href="${esc(r.href)}"${r.key===current?' aria-current="page"':''}><span>${esc(r.title)}</span></a></li>`).join('')}</ul></details>`;
   });
   middleHtml+=`<details class="sbn-middle"${isHere?' open':''}><summary>${esc(displayMiddle(middle))}<span class="sbn-count">${group.length}</span></summary>${smallHtml}</details>`;
  });
  if(middleHtml)html+=`<details class="sbn-large"${records.some(r=>r.large===large&&r.key===current)?' open':''}><summary><span class="sbn-large-title">${esc(displayLarge(large))}</span><span class="sbn-large-desc">${esc(largeDescriptions[large]||'')}</span></summary>${middleHtml}</details>`;
 });
 tree.innerHTML=html;
}

document.body.append(nav);document.documentElement.classList.add('savingio-brain-ready');renderContext();renderTree();
let last=[];
input.addEventListener('input',e=>{const q=e.target.value.trim();if(!q){renderContext();renderTree();return;}last=renderSearch(q)});
form.addEventListener('submit',e=>{e.preventDefault();const q=input.value.trim();if(!q){input.focus();return;}last=renderSearch(q);if(last.length===1)location.href=last[0].href;});
nav.addEventListener('click',e=>{const a=e.target.closest('a[href]');if(!a)return;const href=a.getAttribute('href');if(validHref(href)){e.preventDefault();location.assign(href);}});

const button=document.createElement('button');button.className='sbn-mobile-btn';button.type='button';button.textContent='문제 찾기';document.body.append(button);
const backdrop=document.createElement('div');backdrop.className='sbn-backdrop';document.body.append(backdrop);
const close=()=>document.body.classList.remove('sbn-open');button.addEventListener('click',()=>document.body.classList.add('sbn-open'));nav.querySelector('.sbn-close').addEventListener('click',close);backdrop.addEventListener('click',close);document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
})();