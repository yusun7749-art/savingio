(async()=>{
'use strict';

const VERSION='30';
const norm=v=>String(v||'').toLowerCase().replace(/\s+/g,' ').trim();
const compact=v=>norm(v).replace(/[^0-9a-z가-힣]+/gi,'');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/*
 * Savingio Unified Search Foundation
 * 한 개의 레코드 배열, 한 개의 분류 함수, 한 개의 순위 함수만 사용한다.
 * 가운데 검색/카테고리/왼쪽 검색은 모두 동일한 결과를 공유한다.
 */
const CATEGORIES=['금융','생활비 절약','정부혜택','세금·환급','직장·급여','자동차·교통','연금·노후','아이·교육','주거','생활정보'];
const CATEGORY_RULES=[
 ['아이·교육',['아이','어린이','아동','자녀','육아','보육','교육','학교','학원','돌봄','장학금','교육비']],
 ['연금·노후',['기초연금','국민연금','노령연금','연금','노후','노인','어르신','고령','장기요양']],
 ['자동차·교통',['자동차보험','자동차세','자동차','차량','운전','교통','과태료','범칙금','주차','연비','주유','렌터카','자동차검사']],
 ['주거',['장기수선충당금','장기수선','관리비','아파트','주거','월세','전세','임대차','부동산','누수','보증금','중개수수료']],
 ['직장·급여',['실업급여','퇴직금','급여','월급','임금','연봉','시급','퇴사','근로','주휴수당','고용지원']],
 ['세금·환급',['종합소득세','부가가치세','부가세','재산세','자동차세','연말정산','세금','세액','국세','지방세','환급','홈택스','위택스']],
 ['정부혜택',['정부지원','정부혜택','지원금','보조금','복지','바우처','장려금','수당','감면','기초생활','주거급여']],
 ['금융',['자동차보험','건강보험','실손','실비','보험','은행','카드','대출','계좌','통장','이자','금리','수수료','예금','적금']],
 ['생활비 절약',['전기요금','전기세','통신비','수도요금','가스요금','난방비','에어컨','생활비','절약','고정비','구독']],
 ['생활정보',['병원','의료비','건강','생활','계약','여행','호텔']]
];

const INTENTS=[
 {id:'장기수선충당금',cat:'주거',aliases:['장기','장기수','장기수선','장기수선충','장기수선충당','장기수선충당금','장충','장충금','장수','장수금','수선충당금']},
 {id:'아이',cat:'아이·교육',aliases:['아이','어린이','아동','자녀','아기','초등학생','학생','육아','보육','교육','학교','학원','돌봄','교육비']},
 {id:'세금',cat:'세금·환급',aliases:['세금','세액','국세','지방세','종합소득세','종소세','부가가치세','부가세','재산세','자동차세','연말정산','홈택스','위택스']},
 {id:'환급',cat:'세금·환급',aliases:['환급','환급금','과납','과오납','미환급','돌려받기']},
 {id:'정부지원',cat:'정부혜택',aliases:['정부지원','정부혜택','지원금','보조금','복지','바우처','장려금','기초생활','주거급여']},
 {id:'자동차보험',cat:'자동차·교통',aliases:['자동차보험','차보험','자동차보험료','운전자보험','마일리지특약','자녀할인특약']},
 {id:'자동차',cat:'자동차·교통',aliases:['자동차','차량','운전','교통','과태료','범칙금','주차','연비','주유','자동차검사']},
 {id:'연금',cat:'연금·노후',aliases:['연금','국민연금','기초연금','노령연금','노후','고령']},
 {id:'급여',cat:'직장·급여',aliases:['급여','월급','임금','연봉','시급','퇴직금','퇴사','실업급여','주휴수당']},
 {id:'보험',cat:'금융',aliases:['보험','보험료','보장','특약','실손','실비','건강보험']},
 {id:'은행카드',cat:'금융',aliases:['은행','계좌','통장','카드','대출','금리','이자','수수료','예금','적금']},
 {id:'전기요금',cat:'생활비 절약',aliases:['전기요금','전기세','에어컨','냉방','누진제','한전','절전']},
 {id:'통신비',cat:'생활비 절약',aliases:['통신비','휴대폰','핸드폰','인터넷','알뜰폰','요금제']},
 {id:'누수',cat:'주거',aliases:['누수','천장누수','벽누수','아랫집누수','윗집누수','배관누수','일배책']},
 {id:'임대차',cat:'주거',aliases:['임대차','전세계약','월세계약','전세','월세','보증금','중개수수료']},
 {id:'건강',cat:'생활정보',aliases:['건강','병원','병원비','의료비','진료비','검진','치료']}
];

function normalizeCategory(value){
 const v=norm(value).replace(/\s+/g,'');
 return CATEGORIES.find(c=>norm(c).replace(/\s+/g,'')===v)||'';
}

function classifyTitle(title,original='생활정보'){
 const t=compact(title);
 for(const [cat,words] of CATEGORY_RULES){if(words.some(w=>t.includes(compact(w))))return cat;}
 return normalizeCategory(original)||'생활정보';
}

function detectIntent(query){
 const q=compact(query);if(!q)return null;
 let best=null,bestScore=-1;
 for(const intent of INTENTS){
  for(const alias of intent.aliases){
   const a=compact(alias);let score=-1;
   if(q===a)score=1000+a.length;
   else if(a.startsWith(q)&&q.length>=2)score=700+q.length;
   else if(q.startsWith(a)&&a.length>=2)score=600+a.length;
   if(score>bestScore){best=intent;bestScore=score;}
  }
 }
 return best;
}

function recordScore(record,query){
 const q=compact(query);if(!q)return 1;
 const title=compact(record.title),desc=compact(record.desc),href=compact(record.href),keywords=compact(record.keywords);
 const intent=detectIntent(query);
 let score=0;

 // 사용자가 입력한 글자 자체가 제목에서 맞는 경우가 절대 우선이다.
 if(title===q)score=120000;
 else if(title.startsWith(q))score=110000;
 else if(title.includes(q))score=100000;

 if(intent){
  let aliasTitle=0;
  for(const alias of intent.aliases){
   const a=compact(alias);if(!a)continue;
   if(title===a)aliasTitle=Math.max(aliasTitle,115000);
   else if(title.startsWith(a))aliasTitle=Math.max(aliasTitle,105000+a.length);
   else if(title.includes(a))aliasTitle=Math.max(aliasTitle,95000+a.length);
  }
  score=Math.max(score,aliasTitle);
  // 제목 관련 글 다음에 같은 정확한 카테고리 글을 배치한다.
  if(record.category===intent.cat)score=Math.max(score,30000);
  // 다른 카테고리는 제목에 의도 동의어가 없으면 제외한다.
  if(record.category!==intent.cat&&aliasTitle===0&&score<100000)return 0;
 }

 if(href.includes(q))score=Math.max(score,15000);
 if(keywords.includes(q))score=Math.max(score,5000);
 if(desc.includes(q))score=Math.max(score,1000);
 return score;
}

function rankRecords(records,query,category='전체'){
 return records
  .map((r,index)=>({r,index,score:query?recordScore(r,query):1}))
  .filter(x=>x.score>0&&(category==='전체'||x.r.category===category))
  .sort((a,b)=>b.score-a.score||a.index-b.index);
}

function installLayoutGuard(){
 const style=document.createElement('style');style.id='savingio-search-foundation-v30';style.textContent=`
 .info-shell .article-card[hidden],.info-shell .article-card.savingio-filter-hidden{display:none!important}
 #savingio-brain-nav{box-sizing:border-box!important}
 #savingio-brain-nav .sbn-search{display:grid!important;grid-template-columns:minmax(0,1fr)!important;gap:7px!important}
 #savingio-brain-nav .sbn-search button{display:none!important}
 #savingio-brain-nav .sbn-results{display:grid!important;grid-template-columns:1fr!important;gap:8px!important;width:100%!important}
 #savingio-brain-nav .sbn-result-card{display:block!important;width:100%!important;padding:12px 13px!important;border:1px solid rgba(117,96,67,.14)!important;border-radius:11px!important;background:#fff!important;text-decoration:none!important;box-sizing:border-box!important}
 #savingio-brain-nav .sbn-result-path{display:block!important;color:#9c7443!important;font-size:10px!important;font-weight:750!important}
 #savingio-brain-nav .sbn-result-title{display:block!important;margin-top:5px!important;color:#132744!important;font-size:12.5px!important;line-height:1.5!important}
 #savingio-brain-nav .sbn-result-desc{display:block!important;margin-top:6px!important;color:#8a8176!important;font-size:10px!important;line-height:1.5!important}
 @media(min-width:901px){#savingio-brain-nav{position:fixed!important;left:18px!important;top:96px!important;bottom:18px!important;width:292px!important;min-width:292px!important;transform:none!important;border-radius:20px!important}html.savingio-brain-ready body{padding-left:326px!important}}
 @media(max-width:900px){html.savingio-brain-ready body{padding-left:0!important}}
 `;document.head.appendChild(style);
 const cssHref=`/css/savingio-brain-navigation.css?v=${VERSION}`;
 let css=document.querySelector('link[href*="savingio-brain-navigation.css"]');
 if(css)css.href=cssHref;else{css=document.createElement('link');css.rel='stylesheet';css.href=cssHref;document.head.appendChild(css);}
}
installLayoutGuard();

let records=[];
const cardGrid=document.getElementById('articleGrid');
if(cardGrid){
 records=[...cardGrid.querySelectorAll('.article-card')].map((card,index)=>{
  const title=card.querySelector('h2')?.textContent?.trim()||'';
  const desc=card.querySelector('p')?.textContent?.trim()||'';
  const href=card.getAttribute('href')||'';
  const original=card.dataset.category||card.querySelector('.card-category')?.textContent||'생활정보';
  const category=classifyTitle(title,original);
  const keywords=card.dataset.search||'';
  card.dataset.category=category;
  const badge=card.querySelector('.card-category');if(badge)badge.textContent=category;
  return {card,index,title,desc,href,category,keywords};
 });
}

let controller=null;
function initDirectory(){
 const input=document.getElementById('articleSearch'),grid=document.getElementById('articleGrid'),count=document.getElementById('resultCount');
 if(!input||!grid||!count||!records.length)return;
 const pager=document.querySelector('.pager');
 const buttons=[...document.querySelectorAll('.category-row button[data-cat]')];
 let state={query:new URLSearchParams(location.search).get('q')||'',category:'전체'};
 let locked=false;

 function paint(source='directory'){
  const ranked=rankRecords(records,state.query,state.category);
  const visible=new Set(ranked.map(x=>x.r.card));
  records.forEach(r=>{const show=visible.has(r.card);r.card.hidden=!show;r.card.classList.toggle('savingio-filter-hidden',!show);});
  ranked.forEach(x=>grid.appendChild(x.r.card));
  count.textContent=`검색 결과 ${ranked.length}개`;
  if(pager)pager.style.display=(state.query||state.category!=='전체')?'none':'';
  buttons.forEach(b=>b.classList.toggle('active',(b.dataset.cat||'전체')===state.category));
  if(input.value!==state.query)input.value=state.query;
  const u=new URL(location.href);state.query?u.searchParams.set('q',state.query):u.searchParams.delete('q');
  state.category!=='전체'?u.searchParams.set('cat',state.category):u.searchParams.delete('cat');
  history.replaceState(null,'',u);
  if(!locked){locked=true;window.dispatchEvent(new CustomEvent('savingio-unified-search',{detail:{query:state.query,category:state.category,ranked,source}}));locked=false;}
 }

 input.addEventListener('input',()=>{state.query=input.value.trim();state.category='전체';paint('center');});
 input.addEventListener('search',()=>{state.query=input.value.trim();state.category='전체';paint('center');});
 buttons.forEach(btn=>btn.addEventListener('click',()=>{
  state.query='';
  state.category=btn.dataset.cat||'전체';
  paint('category');
 }));
 const initialCat=new URLSearchParams(location.search).get('cat');if(CATEGORIES.includes(initialCat))state.category=initialCat;
 controller={
  setQuery(q,source='left'){state.query=String(q||'').trim();state.category='전체';paint(source);},
  setCategory(cat,source='left'){state.query='';state.category=CATEGORIES.includes(cat)?cat:'전체';paint(source);},
  getRecords:()=>records,
  getState:()=>({...state})
 };
 paint('initial');
}
initDirectory();

async function loadFallbackRecords(){
 if(records.length)return records;
 let DATA=window.SAVINGIO_BRAIN_DATA;
 try{if(!DATA||!DATA.tree){const r=await fetch(`/data/savingio-brain-data.json?v=${VERSION}`,{cache:'no-store'});if(!r.ok)return[];DATA=await r.json();window.SAVINGIO_BRAIN_DATA=DATA;}}catch(_){return[];}
 const seen=new Set(),out=[];
 Object.entries(DATA.tree||{}).forEach(([large,mids])=>Object.entries(mids||{}).forEach(([middle,smalls])=>Object.entries(smalls||{}).forEach(([small,items])=>(Array.isArray(items)?items:[]).forEach(item=>{
  if(!item?.href||!item?.title||seen.has(item.href))return;seen.add(item.href);
  const desc=item.description||'',category=classifyTitle(item.title,middle);
  out.push({title:item.title,desc,href:item.href,category,keywords:item.search_keywords||'',large,middle,small});
 }))));
 return out;
}

async function initLeftNav(){
 if(document.getElementById('savingio-brain-nav'))return;
 const sourceRecords=await loadFallbackRecords();
 const nav=document.createElement('aside');nav.id='savingio-brain-nav';
 nav.innerHTML=`<button class="sbn-close" type="button">×</button><div class="sbn-head"><strong>지금 어떤 문제가 있으세요?</strong><small>상황이나 찾는 글 제목을 입력해 보세요.</small></div><form class="sbn-search"><input type="search" placeholder="예: 아이, 세금, 장기수선충당금"><button type="submit">검색</button></form><div class="sbn-search-status"></div><div class="sbn-tree"></div>`;
 const input=nav.querySelector('input'),status=nav.querySelector('.sbn-search-status'),tree=nav.querySelector('.sbn-tree');

 function renderResults(ranked,label=''){
  status.textContent=label||`검색 결과 ${ranked.length}개`;
  tree.innerHTML=ranked.length?`<div class="sbn-results">${ranked.slice(0,50).map(({r})=>`<a class="sbn-result-card" href="${esc(r.href)}"><span class="sbn-result-path">${esc(r.category)}</span><strong class="sbn-result-title">${esc(r.title)}</strong><span class="sbn-result-desc">${esc(r.desc||'관련 내용을 확인합니다.')}</span></a>`).join('')}</div>`:'<div class="sbn-empty">검색 결과가 없습니다.</div>';
 }
 function renderCategories(){
  status.textContent='카테고리를 선택하거나 검색해 글을 찾으세요';
  tree.innerHTML=CATEGORIES.map(cat=>{
   const items=sourceRecords.filter(r=>r.category===cat);
   return `<details class="sbn-large"><summary><span class="sbn-large-title">${esc(cat)}</span><span class="sbn-count">${items.length}</span></summary><ul class="sbn-items">${items.slice(0,40).map(r=>`<li><a href="${esc(r.href)}">${esc(r.title)}</a></li>`).join('')}</ul></details>`;
  }).join('');
 }
 function searchLeft(q){const value=String(q||'').trim();value?renderResults(rankRecords(sourceRecords,value,'전체')):renderCategories();}

 document.body.appendChild(nav);document.documentElement.classList.add('savingio-brain-ready');renderCategories();
 input.addEventListener('input',()=>{const q=input.value.trim();if(controller)controller.setQuery(q,'left');else searchLeft(q);});
 nav.querySelector('form').addEventListener('submit',e=>e.preventDefault());
 window.addEventListener('savingio-unified-search',e=>{
  const d=e.detail||{};if(input.value!==d.query)input.value=d.query||'';
  if(d.query)renderResults(d.ranked||[]);
  else if(d.category&&d.category!=='전체')renderResults((d.ranked||[]),`${d.category} 글 ${(d.ranked||[]).length}개`);
  else renderCategories();
 });
 nav.addEventListener('click',e=>{const a=e.target.closest('a[href]');if(a){e.preventDefault();location.assign(a.getAttribute('href'));}});
 const button=document.createElement('button');button.className='sbn-mobile-btn';button.type='button';button.textContent='문제 찾기';document.body.appendChild(button);
 const backdrop=document.createElement('div');backdrop.className='sbn-backdrop';document.body.appendChild(backdrop);
 const close=()=>document.body.classList.remove('sbn-open');button.onclick=()=>document.body.classList.add('sbn-open');nav.querySelector('.sbn-close').onclick=close;backdrop.onclick=close;
}
initLeftNav();

document.querySelectorAll('form.search[action*="/articles"]').forEach(form=>form.addEventListener('submit',e=>{
 const i=form.querySelector('input[type="search"],input[name="q"]'),q=i?.value.trim();if(q){e.preventDefault();location.assign(`/articles/?q=${encodeURIComponent(q)}`);}
}));
})();
