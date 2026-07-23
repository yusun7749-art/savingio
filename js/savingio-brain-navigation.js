(async()=>{
'use strict';

const explorerCss='/css/savingio-brain-navigation.css?v=19';
let explorerLink=document.querySelector('link[href*="savingio-brain-navigation.css"]');
if(explorerLink){explorerLink.href=explorerCss;}else{explorerLink=document.createElement('link');explorerLink.rel='stylesheet';explorerLink.href=explorerCss;document.head.appendChild(explorerLink);}

if(!document.getElementById('sbn-search-layout-guard')){
 const style=document.createElement('style');
 style.id='sbn-search-layout-guard';
 style.textContent=`
 .info-shell .article-card[hidden],.info-shell .article-card.savingio-filter-hidden{display:none!important}
 #savingio-brain-nav .sbn-results{display:grid!important;grid-template-columns:1fr!important;gap:9px!important;width:100%!important}
 #savingio-brain-nav .sbn-result-card{display:grid!important;grid-template-columns:1fr auto!important;grid-template-areas:"path path" "title arrow" "desc desc"!important;gap:5px 10px!important;width:100%!important;padding:13px 14px!important;border:1px solid rgba(117,96,67,.16)!important;border-radius:12px!important;background:#fff!important;color:#32363a!important;text-decoration:none!important;overflow:hidden!important}
 #savingio-brain-nav .sbn-result-path{grid-area:path!important;color:#9a7040!important;font-size:10px!important;font-weight:800!important}
 #savingio-brain-nav .sbn-result-title{grid-area:title!important;color:#132744!important;font-size:13px!important;font-weight:800!important;line-height:1.5!important}
 #savingio-brain-nav .sbn-result-desc{grid-area:desc!important;color:#77746f!important;font-size:11px!important;line-height:1.55!important;display:-webkit-box!important;-webkit-line-clamp:2!important;-webkit-box-orient:vertical!important;overflow:hidden!important}
 #savingio-brain-nav .sbn-result-arrow{grid-area:arrow!important;display:grid!important;place-items:center!important;width:25px!important;height:25px!important;border-radius:50%!important;background:rgba(185,130,56,.10)!important;color:#8f6532!important}
 #savingio-brain-nav .sbn-search{grid-template-columns:minmax(0,1fr)!important}
 #savingio-brain-nav .sbn-search button{display:none!important}`;
 document.head.appendChild(style);
}

const norm=v=>String(v||'').toLowerCase().replace(/\s+/g,' ').trim();
const compact=v=>norm(v).replace(/[^0-9a-z가-힣]+/gi,'');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/*
 * 각 검색 의도는 자기 동의어만 사용한다.
 * 상위 분류의 다른 하위 주제(예: 관리비 안의 전기료)는 검색어로 확장하지 않는다.
 */
const INTENTS=[
 {id:'장기수선충당금',category:'주거',topic:'관리비·장기수선충당금',terms:['장기수선충당금','장충금','장수금','장기수선','수선충당금','장기수선충당','장기수선충당금반환','장기수선충당금환급'],required:['장기수선','수선충당','장충금','장수금']},
 {id:'누수',category:'주거',topic:'누수',terms:['누수','천장누수','벽누수','아랫집누수','윗집누수','배관누수','누수보험','일상생활배상책임','일배책'],required:['누수','일배책','일상생활배상책임']},
 {id:'임대차계약',category:'주거',topic:'전월세·계약',terms:['임대차','전세계약','월세계약','계약해지','계약갱신','보증금','중개수수료','전세보증','전세사기'],required:['임대차','전세','월세','보증금','중개수수료']},
 {id:'자동차보험',category:'자동차·교통',topic:'자동차보험',terms:['자동차보험','차보험','자동차보험료','자차보험','운전자보험','보험특약','마일리지특약','자녀할인특약'],required:['자동차보험','차보험','운전자보험','마일리지','자녀할인']},
 {id:'교통사고',category:'자동차·교통',topic:'사고·보상',terms:['교통사고','자동차사고','차사고','사고접수','사고처리','대인','대물','자차'],required:['교통사고','자동차사고','사고접수','사고처리','대인','대물']},
 {id:'과태료',category:'자동차·교통',topic:'과태료·범칙금',terms:['과태료','범칙금','교통벌금','미납과태료','이파인','교통민원24','사전통지'],required:['과태료','범칙금','교통벌금','이파인','교통민원24']},
 {id:'아이',category:'아이·교육',topic:'아이·교육·돌봄',terms:['아이','어린이','아동','자녀','아기','애기','초등학생','육아','보육','교육','돌봄','아동수당','양육수당','보육료','학원비','교육비','자녀장려금'],required:['아이','어린이','아동','자녀','육아','보육','교육','돌봄']},
 {id:'연금',category:'연금·노후',topic:'연금·노후',terms:['연금','국민연금','기초연금','노령연금','노후','연금수령','추납','연금액','고령'],required:['연금','노후','고령']},
 {id:'정부지원',category:'정부혜택',topic:'지원금·복지',terms:['정부지원','정부혜택','국가지원','공공지원','지원금','보조금','복지','바우처','장려금','수당','감면'],required:['정부지원','정부혜택','지원금','보조금','복지','바우처','장려금']},
 {id:'환급',category:'세금·환급',topic:'환급금',terms:['환급','환급금','돌려받기','과납','과오납','미수령','미환급','환급신청'],required:['환급','과납','과오납','미환급']},
 {id:'세금',category:'세금·환급',topic:'세금·신고',terms:['세금','세액','국세','지방세','종합소득세','종소세','부가가치세','부가세','재산세','자동차세','소득세','연말정산','홈택스','위택스'],required:['세금','종합소득세','종소세','부가세','재산세','자동차세','연말정산','홈택스','위택스']},
 {id:'급여',category:'직장·급여',topic:'급여·퇴직',terms:['급여','월급','임금','실수령액','연봉','시급','퇴직금','퇴사','근로계약','급여명세서','실업급여'],required:['급여','월급','임금','연봉','시급','퇴직금','퇴사','실업급여']},
 {id:'보험',category:'금융',topic:'보험',terms:['보험','보험료','보장','특약','실손보험','실비','건강보험','해지환급금','과납보험료','중복보험','보험청구','보험금'],required:['보험','실손','실비','보장','특약']},
 {id:'은행카드',category:'금융',topic:'은행·카드·대출',terms:['은행','계좌','통장','수수료','이체','예금','적금','카드','체크카드','신용카드','카드값','자동이체','금리','이자','대출'],required:['은행','계좌','통장','카드','대출','금리','이자','수수료']},
 {id:'전기요금',category:'생활비 절약',topic:'전기요금·냉방',terms:['전기요금','전기세','에어컨','냉방','누진제','한전','절전','전력','제습기','선풍기','냉장고','건조기'],required:['전기요금','전기세','에어컨','냉방','누진제','한전','절전']},
 {id:'통신비',category:'생활비 절약',topic:'통신비',terms:['통신비','휴대폰','핸드폰','스마트폰','인터넷','와이파이','알뜰폰','요금제','결합할인','데이터'],required:['통신비','휴대폰','핸드폰','인터넷','알뜰폰','요금제']},
 {id:'생활비',category:'생활비 절약',topic:'생활비·소비',terms:['생활비','절약','고정비','가계부','예산','지출','소비','할인','캐시백','포인트'],required:['생활비','절약','고정비','가계부','예산','지출','소비']},
 {id:'건강',category:'생활정보',topic:'건강·병원비',terms:['건강','병원','병원비','의료비','진료비','약값','본인부담금','검진','치료'],required:['건강','병원','의료비','진료비','검진','치료']},
 {id:'사업',category:'세금·환급',topic:'사업자·세무',terms:['사업','사업자','개인사업자','자영업','소상공인','사업용카드','비용처리','경비','폐업','매출','세금계산서'],required:['사업','사업자','자영업','소상공인','폐업','매출','세금계산서']},
 {id:'부업',category:'직장·급여',topic:'부업·재택',terms:['부업','재택','재택근무','온라인수입','추가수입','사이드잡','ai부업','n잡','프리랜서'],required:['부업','재택','사이드잡','n잡','프리랜서']}
];

const GENERIC_ALIASES={
 '장충':'장기수선충당금','장수':'장기수선충당금','어린이':'아이','아동':'아이','자녀':'아이','차보험':'자동차보험','자동차 사고':'교통사고','교통 벌금':'과태료','종소세':'세금','부가세':'세금','실비':'보험','실손':'보험'
};

function detectIntent(query){
 const q=compact(GENERIC_ALIASES[norm(query)]||query);
 if(!q)return null;
 let best=null,bestLen=0;
 for(const intent of INTENTS){
  for(const term of [intent.id,...intent.terms]){
   const t=compact(term);
   if(t&&(q===t||q.includes(t)||t.includes(q))&&t.length>bestLen){best=intent;bestLen=t.length;}
  }
 }
 return best;
}

function classifyText(text,fallback='생활정보'){
 const hay=compact(text);
 let best=null,bestScore=0;
 for(const intent of INTENTS){
  let score=0;
  for(const term of intent.required){const t=compact(term);if(t&&hay.includes(t))score+=Math.max(2,t.length);}
  for(const term of intent.terms){const t=compact(term);if(t&&hay.includes(t))score+=1;}
  if(score>bestScore){best={category:intent.category,topic:intent.topic,intent:intent.id};bestScore=score;}
 }
 return bestScore?best:{category:fallback||'생활정보',topic:fallback||'생활정보',intent:'기타'};
}

function scoreRecord(record,query){
 const q=compact(query);if(!q)return 1;
 const intent=detectIntent(query);
 const title=compact(record.title),desc=compact(record.desc||record.description),href=compact(record.href),topic=compact(record.topic),category=compact(record.category);
 const exactTerms=intent?[intent.id,...intent.terms]:[query];
 let score=0;
 for(const raw of exactTerms){
  const t=compact(raw);if(!t)continue;
  if(title===t)score=Math.max(score,120);
  else if(title.includes(t))score=Math.max(score,95);
  if(topic.includes(t))score=Math.max(score,75);
  if(href.includes(t))score=Math.max(score,60);
  if(desc.includes(t))score=Math.max(score,35);
  if(category.includes(t))score=Math.max(score,20);
 }
 if(intent){
  if(record.intent===intent.id)score+=80;
  else if(record.category!==intent.category)return 0;
  const strictHit=intent.required.some(t=>title.includes(compact(t))||href.includes(compact(t))||desc.includes(compact(t)));
  if(!strictHit)return 0;
 }
 return score;
}

let directoryController=null;
let syncLock=false;
function initArticleDirectorySearch(){
 const search=document.getElementById('articleSearch'),grid=document.getElementById('articleGrid'),count=document.getElementById('resultCount');
 if(!search||!grid||!count)return;
 const cards=[...grid.querySelectorAll('.article-card')],pager=document.querySelector('.pager'),buttons=[...document.querySelectorAll('.category-row button[data-cat]')];
 let activeCategory='전체';
 const records=cards.map(card=>{
  const title=card.querySelector('h2')?.textContent||'',desc=card.querySelector('p')?.textContent||'',href=card.getAttribute('href')||'';
  const original=card.dataset.category||card.querySelector('.card-category')?.textContent||'생활정보';
  const cls=classifyText(`${title} ${desc} ${href}`,original);
  card.dataset.category=cls.category;card.dataset.topic=cls.topic;card.dataset.intent=cls.intent;
  const badge=card.querySelector('.card-category');if(badge)badge.textContent=cls.category;
  return {card,title,desc,href,...cls};
 });
 const activateAll=()=>{activeCategory='전체';buttons.forEach(b=>b.classList.toggle('active',(b.dataset.cat||'전체')==='전체'));};
 const apply=(query,source='directory')=>{
  const q=String(query??search.value).trim();if(search.value!==q)search.value=q;if(q)activateAll();
  const ranked=records.map(r=>({r,score:q?scoreRecord(r,q):1})).filter(x=>(activeCategory==='전체'||x.r.category===activeCategory)&&x.score>0).sort((a,b)=>b.score-a.score||a.r.title.localeCompare(b.r.title,'ko'));
  const visible=new Set(ranked.map(x=>x.r.card));records.forEach(r=>{const show=visible.has(r.card);r.card.hidden=!show;r.card.classList.toggle('savingio-filter-hidden',!show);});ranked.forEach(x=>grid.appendChild(x.r.card));
  count.textContent=`검색 결과 ${ranked.length}개`;if(pager)pager.style.display=(q||activeCategory!=='전체')?'none':'';
  if(source!=='url'){const u=new URL(location.href);q?u.searchParams.set('q',q):u.searchParams.delete('q');history.replaceState(null,'',u);}
  if(!syncLock){syncLock=true;window.dispatchEvent(new CustomEvent('savingio-search-change',{detail:{query:q,source}}));syncLock=false;}
 };
 search.addEventListener('input',()=>apply(search.value,'directory'));search.addEventListener('search',()=>apply(search.value,'directory'));
 buttons.forEach(btn=>btn.addEventListener('click',()=>{activeCategory=btn.dataset.cat||'전체';buttons.forEach(b=>b.classList.toggle('active',b===btn));apply(search.value,'category');}));
 directoryController={setQuery:q=>apply(q,'shared'),records};
 apply(new URLSearchParams(location.search).get('q')||'','url');
}
initArticleDirectorySearch();

document.querySelectorAll('form.search[action*="/articles"]').forEach(form=>form.addEventListener('submit',e=>{const input=form.querySelector('input[type="search"],input[name="q"]');const q=input?.value.trim()||'';if(q){e.preventDefault();location.assign(`/articles/?q=${encodeURIComponent(q)}`);}}));

if(document.getElementById('savingio-brain-nav'))return;
let DATA=window.SAVINGIO_BRAIN_DATA;
if(!DATA||!DATA.tree){try{const r=await fetch('/data/savingio-brain-data.json?v=16',{cache:'no-store'});if(!r.ok)return;DATA=await r.json();window.SAVINGIO_BRAIN_DATA=DATA;}catch(_){return;}}
const normalizePath=v=>{let p=String(v||'/');try{p=decodeURI(p)}catch(_){}p=p.split('?')[0].split('#')[0].replace(/\/index\.html$/,'/').replace(/\.html$/,'').replace(/\/$/,'');return p||'/';};
const current=normalizePath(location.pathname),validHref=h=>typeof h==='string'&&/^\/(articles|calculators)\/[a-z0-9][a-z0-9-]*(?:\.html)?(?:[?#].*)?$/i.test(h.trim());
const largeLabels={'돈 아끼기':'생활비가 너무 많이 나와요','받을 돈 찾기':'받을 수 있는 돈을 찾고 싶어요','세금 처리하기':'세금 신고·납부가 어려워요','급여·일 처리하기':'월급·퇴직·일 문제를 해결하고 싶어요','생활 문제 해결':'집·차·건강 문제를 해결하고 싶어요','바로 계산하기':'금액을 바로 계산해 보고 싶어요'};
const middleLabels={'전기요금':'전기세가 너무 많이 나왔어요','관리비':'관리비가 예상보다 많이 나왔어요','통신비':'휴대폰·인터넷 요금을 줄이고 싶어요','보험료':'보험료와 보장 내용을 점검하고 싶어요','은행·카드':'은행 수수료와 카드값을 줄이고 싶어요','연금':'연금으로 얼마를 받을지 궁금해요','지원금':'받을 수 있는 지원금이 궁금해요','환급금':'놓친 환급금이 있는지 찾고 싶어요','자동차세':'자동차세를 확인하고 절약하고 싶어요','자동차':'차에 문제가 생기거나 비용이 걱정돼요','건강':'병원비와 건강 문제를 확인하고 싶어요','교육':'교육비와 아이 관련 지원이 궁금해요'};
const dL=v=>largeLabels[v]||v,dM=v=>middleLabels[v]||v;
const records=[],seen=new Set();
Object.entries(DATA.tree||{}).forEach(([large,mids])=>Object.entries(mids||{}).forEach(([middle,smalls])=>Object.entries(smalls||{}).forEach(([small,items])=>(Array.isArray(items)?items:[]).forEach(item=>{if(!item||!validHref(item.href)||!item.title)return;const key=normalizePath(item.href);if(seen.has(key))return;seen.add(key);const description=item.description||'',cls=classifyText(`${item.title} ${description} ${item.search_keywords||''} ${item.href} ${middle} ${small}`,middle);records.push({...item,description,large,middle,small,key,...cls});}))));
const nav=document.createElement('aside');nav.id='savingio-brain-nav';nav.innerHTML=`<button class="sbn-close" type="button">×</button><div class="sbn-head"><strong>지금 어떤 문제가 있으세요?</strong><small>카테고리 이름을 몰라도 괜찮아요.<br>상황이나 글 제목을 입력해 보세요.</small></div><form class="sbn-search"><input type="search" placeholder="예: 장충금, 어린이, 자동차보험"><button type="submit">검색</button></form><div class="sbn-search-status"></div><div class="sbn-context"></div><div class="sbn-tree"></div>`;
const tree=nav.querySelector('.sbn-tree'),context=nav.querySelector('.sbn-context'),form=nav.querySelector('.sbn-search'),input=form.querySelector('input'),status=nav.querySelector('.sbn-search-status');
const renderTree=()=>{let html='';Object.entries(DATA.tree||{}).forEach(([large,mids])=>{let mh='';Object.entries(mids||{}).forEach(([middle,smalls])=>{const group=records.filter(r=>r.large===large&&r.middle===middle);if(!group.length)return;let sh='';Object.entries(smalls||{}).forEach(([small])=>{const items=group.filter(r=>r.small===small);if(!items.length)return;sh+=`<details class="sbn-small"><summary>${esc(small)}<span class="sbn-count">${items.length}</span></summary><ul class="sbn-items">${items.map(r=>`<li><a href="${esc(r.href)}"${r.key===current?' aria-current="page"':''}>${esc(r.title)}</a></li>`).join('')}</ul></details>`;});mh+=`<details class="sbn-middle"><summary>${esc(dM(middle))}<span class="sbn-count">${group.length}</span></summary>${sh}</details>`;});if(mh)html+=`<details class="sbn-large"><summary><span class="sbn-large-title">${esc(dL(large))}</span></summary>${mh}</details>`;});tree.innerHTML=html;status.textContent='카테고리를 펼치거나 검색해 글을 찾으세요';};
const renderSearch=q=>{const ranked=records.map(r=>({r,score:scoreRecord(r,q)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.r.title.localeCompare(b.r.title,'ko')).slice(0,50);context.hidden=true;status.textContent=ranked.length?`검색 결과 ${ranked.length}개`:'검색 결과가 없습니다';tree.innerHTML=ranked.length?`<div class="sbn-results">${ranked.map(({r})=>`<a class="sbn-result-card" href="${esc(r.href)}"><span class="sbn-result-path">${esc(r.category)} · ${esc(r.topic)}</span><strong class="sbn-result-title">${esc(r.title)}</strong><span class="sbn-result-desc">${esc(r.description||'관련 내용을 확인합니다.')}</span><em class="sbn-result-arrow">›</em></a>`).join('')}</div>`:'<div class="sbn-empty">검색 결과가 없습니다.</div>';};
const setSharedQuery=(q,source)=>{const value=String(q||'').trim();if(input.value!==value)input.value=value;value?renderSearch(value):renderTree();if(directoryController&&source!=='directory'&&!syncLock)directoryController.setQuery(value);};
document.body.append(nav);document.documentElement.classList.add('savingio-brain-ready');renderTree();
input.addEventListener('input',()=>setSharedQuery(input.value,'left'));form.addEventListener('submit',e=>e.preventDefault());
window.addEventListener('savingio-search-change',e=>{if(e.detail?.source!=='left')setSharedQuery(e.detail?.query||'','directory');});
const initial=new URLSearchParams(location.search).get('q')||'';if(initial)setSharedQuery(initial,'url');
nav.addEventListener('click',e=>{const a=e.target.closest('a[href]');if(a&&validHref(a.getAttribute('href'))){e.preventDefault();location.assign(a.getAttribute('href'));}});
const button=document.createElement('button');button.className='sbn-mobile-btn';button.type='button';button.textContent='문제 찾기';document.body.append(button);const backdrop=document.createElement('div');backdrop.className='sbn-backdrop';document.body.append(backdrop);const close=()=>document.body.classList.remove('sbn-open');button.onclick=()=>document.body.classList.add('sbn-open');nav.querySelector('.sbn-close').onclick=close;backdrop.onclick=close;
})();