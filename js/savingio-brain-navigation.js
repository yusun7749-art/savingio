(async()=>{
'use strict';

const VERSION='25';
const norm=v=>String(v||'').toLowerCase().replace(/\s+/g,' ').trim();
const compact=v=>norm(v).replace(/[^0-9a-z가-힣]+/gi,'');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const INTENTS=[
 {id:'장기수선충당금',cat:'주거',aliases:['장기','장기수','장기수선','장기수선충','장기수선충당','장기수선충당금','장충','장충금','장수','장수금','수선충당금'],title:['장기수선충당금','장기수선','수선충당금','장충금','장수금'],related:['관리비','아파트관리비','공동주택','임대차정산','보증금정산'],exclude:['기초연금','국민연금','노령연금','재산세','노인일자리','난방비','전기요금','전기세','누진제','에어컨','냉방','연비']},
 {id:'아이',cat:'아이·교육',aliases:['아이','어린이','아동','자녀','아기','초등학생','육아','보육','교육','돌봄'],title:['아이','어린이','아동','자녀','육아','보육','교육','돌봄'],exclude:['자동차에어컨','자동차연비','주유','마일리지']},
 {id:'세금',cat:'세금·환급',aliases:['세금','세액','국세','지방세','종합소득세','종소세','부가가치세','부가세','재산세','자동차세','연말정산','홈택스','위택스'],title:['세금','종합소득세','종소세','부가세','재산세','자동차세','연말정산','홈택스','위택스']},
 {id:'환급',cat:'세금·환급',aliases:['환급','환급금','과납','과오납','미환급','돌려받기'],title:['환급','환급금','과납','과오납','미환급']},
 {id:'자동차보험',cat:'자동차·교통',aliases:['자동차보험','차보험','자동차보험료','운전자보험','마일리지특약','자녀할인특약'],title:['자동차보험','차보험','운전자보험','마일리지','자녀할인'],exclude:['에어컨','연비','주유','자동차세','과태료']},
 {id:'교통사고',cat:'자동차·교통',aliases:['교통사고','자동차사고','차사고','사고접수','사고처리','대인','대물'],title:['교통사고','자동차사고','사고접수','사고처리','대인','대물']},
 {id:'과태료',cat:'자동차·교통',aliases:['과태료','범칙금','교통벌금','미납과태료','이파인','교통민원24'],title:['과태료','범칙금','교통벌금','이파인','교통민원24']},
 {id:'누수',cat:'주거',aliases:['누수','천장누수','벽누수','아랫집누수','윗집누수','배관누수','누수보험','일배책'],title:['누수','일배책','일상생활배상책임']},
 {id:'임대차',cat:'주거',aliases:['임대차','전세계약','월세계약','계약해지','계약갱신','보증금','중개수수료','전세보증'],title:['임대차','전세','월세','보증금','중개수수료']},
 {id:'연금',cat:'연금·노후',aliases:['연금','국민연금','기초연금','노령연금','노후'],title:['연금','노후','고령']},
 {id:'정부지원',cat:'정부혜택',aliases:['정부지원','정부혜택','지원금','보조금','복지','바우처','장려금','수당'],title:['정부지원','정부혜택','지원금','보조금','복지','바우처','장려금']},
 {id:'급여',cat:'직장·급여',aliases:['급여','월급','임금','연봉','시급','퇴직금','퇴사','실업급여'],title:['급여','월급','임금','연봉','시급','퇴직금','퇴사','실업급여']},
 {id:'보험',cat:'금융',aliases:['보험','보험료','보장','특약','실손','실비','건강보험'],title:['보험','보험료','실손','실비','보장','특약']},
 {id:'은행카드',cat:'금융',aliases:['은행','계좌','통장','카드','대출','금리','이자','수수료'],title:['은행','계좌','통장','카드','대출','금리','이자','수수료']},
 {id:'전기요금',cat:'생활비 절약',aliases:['전기요금','전기세','에어컨','냉방','누진제','한전','절전'],title:['전기요금','전기세','에어컨','냉방','누진제','한전','절전']},
 {id:'통신비',cat:'생활비 절약',aliases:['통신비','휴대폰','핸드폰','인터넷','알뜰폰','요금제'],title:['통신비','휴대폰','핸드폰','인터넷','알뜰폰','요금제']},
 {id:'생활비',cat:'생활비 절약',aliases:['생활비','절약','고정비','가계부','예산','지출','소비'],title:['생활비','절약','고정비','가계부','예산','지출','소비']},
 {id:'건강',cat:'생활정보',aliases:['건강','병원','병원비','의료비','진료비','검진','치료'],title:['건강','병원','병원비','의료비','진료비','검진','치료']}
];

function detectIntent(q){
 const cq=compact(q);if(!cq)return null;
 let best=null,bestLen=0;
 for(const i of INTENTS){for(const a of i.aliases){const ca=compact(a);if(ca&&(cq===ca||ca.startsWith(cq)||cq.startsWith(ca))&&ca.length>bestLen){best=i;bestLen=ca.length;}}}
 return best;
}

const CATEGORY_RULES=[
 ['아이·교육',['아이','어린이','아동','자녀','육아','보육','교육','돌봄','학교','학원']],
 ['연금·노후',['연금','노후','노인','어르신','고령','장기요양']],
 ['자동차·교통',['자동차','차량','운전','교통','과태료','범칙금','주차','연비','주유','자동차보험']],
 ['주거',['주거','아파트','월세','전세','임대','부동산','관리비','누수','보증금','장기수선']],
 ['직장·급여',['급여','월급','임금','퇴직금','퇴사','근로','실업급여','연봉','시급']],
 ['세금·환급',['세금','환급','종합소득세','종소세','부가세','재산세','자동차세','연말정산','홈택스','위택스']],
 ['정부혜택',['정부','지원금','복지','바우처','장려금','수당','감면','혜택']],
 ['금융',['은행','카드','대출','계좌','이자','금리','보험','실비','실손']],
 ['생활비 절약',['절약','생활비','전기요금','통신비','수도요금','에어컨','난방비']],
 ['생활정보',['건강','병원','생활','구독','계약']]
];

function classify(title,desc,href,fallback){
 const titleText=compact(title),all=compact(`${title} ${desc} ${href}`);
 for(const [cat,words] of CATEGORY_RULES){if(words.some(w=>titleText.includes(compact(w))))return cat;}
 for(const [cat,words] of CATEGORY_RULES){if(words.some(w=>all.includes(compact(w))))return cat;}
 return fallback||'생활정보';
}

function score(record,query){
 const q=compact(query);if(!q)return 1;
 const intent=detectIntent(query);
 const title=compact(record.title),desc=compact(record.desc),href=compact(record.href),cat=compact(record.category);
 if(intent){
  const all=compact(`${record.title} ${record.desc} ${record.href}`);
  if((intent.exclude||[]).some(w=>all.includes(compact(w))))return 0;
  let s=0;
  for(const w of intent.title){const t=compact(w);if(!t)continue;if(title===t)s=Math.max(s,10000);else if(title.startsWith(t))s=Math.max(s,9000);else if(title.includes(t))s=Math.max(s,8000);}
  if(record.category===intent.cat)s=Math.max(s,2500);
  for(const w of intent.related||[]){const t=compact(w);if(title.includes(t))s=Math.max(s,1800);else if(desc.includes(t)||href.includes(t))s=Math.max(s,900);}
  if(!s){for(const a of intent.aliases){const t=compact(a);if(title.includes(t))s=Math.max(s,7000);else if(href.includes(t))s=Math.max(s,3500);else if(desc.includes(t))s=Math.max(s,300);}}
  return s;
 }
 let s=0;if(title===q)s=10000;else if(title.startsWith(q))s=9000;else if(title.includes(q))s=8000;else if(href.includes(q))s=3500;else if(cat.includes(q))s=1800;else if(desc.includes(q))s=300;return s;
}

let allRecords=[];let directoryController=null;let sync=false;
function initDirectory(){
 const input=document.getElementById('articleSearch'),grid=document.getElementById('articleGrid'),count=document.getElementById('resultCount');if(!input||!grid||!count)return;
 const pager=document.querySelector('.pager'),buttons=[...document.querySelectorAll('.category-row button[data-cat]')];let active='전체';
 allRecords=[...grid.querySelectorAll('.article-card')].map(card=>{const title=card.querySelector('h2')?.textContent||'',desc=card.querySelector('p')?.textContent||'',href=card.getAttribute('href')||'',old=card.dataset.category||card.querySelector('.card-category')?.textContent||'생활정보',category=classify(title,desc,href,old);card.dataset.category=category;const badge=card.querySelector('.card-category');if(badge)badge.textContent=category;return {card,title,desc,href,category};});
 function apply(query,source='directory'){
  const q=String(query??input.value).trim();if(input.value!==q)input.value=q;
  let ranked=allRecords.map(r=>({r,score:q?score(r,q):1})).filter(x=>x.score>0&&(active==='전체'||x.r.category===active)).sort((a,b)=>b.score-a.score||a.r.title.localeCompare(b.r.title,'ko'));
  const visible=new Set(ranked.map(x=>x.r.card));allRecords.forEach(r=>{const show=visible.has(r.card);r.card.hidden=!show;r.card.classList.toggle('savingio-filter-hidden',!show);});ranked.forEach(x=>grid.appendChild(x.r.card));
  count.textContent=`검색 결과 ${ranked.length}개`;if(pager)pager.style.display=(q||active!=='전체')?'none':'';
  if(source!=='url'){const u=new URL(location.href);q?u.searchParams.set('q',q):u.searchParams.delete('q');history.replaceState(null,'',u);}
  if(!sync){sync=true;window.dispatchEvent(new CustomEvent('savingio-search-change',{detail:{query:q,source}}));sync=false;}
 }
 input.addEventListener('input',()=>apply(input.value));input.addEventListener('search',()=>apply(input.value));
 buttons.forEach(b=>b.addEventListener('click',()=>{active=b.dataset.cat||'전체';buttons.forEach(x=>x.classList.toggle('active',x===b));apply(input.value,'category');}));
 directoryController={setQuery:q=>apply(q,'shared')};apply(new URLSearchParams(location.search).get('q')||'','url');
}
initDirectory();

document.querySelectorAll('form.search[action*="/articles"]').forEach(f=>f.addEventListener('submit',e=>{const i=f.querySelector('input[type="search"],input[name="q"]'),q=i?.value.trim();if(q){e.preventDefault();location.assign(`/articles/?q=${encodeURIComponent(q)}`);}}));

if(document.getElementById('savingio-brain-nav'))return;
let DATA=window.SAVINGIO_BRAIN_DATA;try{if(!DATA||!DATA.tree){const r=await fetch(`/data/savingio-brain-data.json?v=${VERSION}`,{cache:'no-store'});if(!r.ok)return;DATA=await r.json();window.SAVINGIO_BRAIN_DATA=DATA;}}catch(_){return;}
const valid=h=>typeof h==='string'&&/^\/(articles|calculators)\/[a-z0-9][a-z0-9-]*(?:\.html)?(?:[?#].*)?$/i.test(h.trim());
const navRecords=[],seen=new Set();Object.entries(DATA.tree||{}).forEach(([large,mids])=>Object.entries(mids||{}).forEach(([middle,smalls])=>Object.entries(smalls||{}).forEach(([small,items])=>(Array.isArray(items)?items:[]).forEach(item=>{if(!item||!valid(item.href)||!item.title||seen.has(item.href))return;seen.add(item.href);const desc=item.description||'',category=classify(item.title,desc,item.href,middle);navRecords.push({...item,desc,category,large,middle,small});}))));
const nav=document.createElement('aside');nav.id='savingio-brain-nav';nav.innerHTML=`<button class="sbn-close" type="button">×</button><div class="sbn-head"><strong>지금 어떤 문제가 있으세요?</strong><small>상황이나 찾는 글 제목을 입력해 보세요.</small></div><form class="sbn-search"><input type="search" placeholder="예: 장기수선충당금, 어린이, 세금"><button type="submit">검색</button></form><div class="sbn-search-status"></div><div class="sbn-tree"></div>`;
const tree=nav.querySelector('.sbn-tree'),leftInput=nav.querySelector('input'),status=nav.querySelector('.sbn-search-status');
function renderTree(){let html='';Object.entries(DATA.tree||{}).forEach(([large,mids])=>{let mh='';Object.entries(mids||{}).forEach(([middle,smalls])=>{let sh='';Object.entries(smalls||{}).forEach(([small,items])=>{const arr=(Array.isArray(items)?items:[]).filter(i=>i&&valid(i.href)&&i.title);if(arr.length)sh+=`<details class="sbn-small"><summary>${esc(small)}<span class="sbn-count">${arr.length}</span></summary><ul class="sbn-items">${arr.map(i=>`<li><a href="${esc(i.href)}">${esc(i.title)}</a></li>`).join('')}</ul></details>`;});if(sh)mh+=`<details class="sbn-middle"><summary>${esc(middle)}</summary>${sh}</details>`;});if(mh)html+=`<details class="sbn-large"><summary><span class="sbn-large-title">${esc(large)}</span></summary>${mh}</details>`;});tree.innerHTML=html;status.textContent='카테고리를 펼치거나 검색해 글을 찾으세요';}
function renderSearch(q){const ranked=navRecords.map(r=>({r,score:score(r,q)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.r.title.localeCompare(b.r.title,'ko')).slice(0,50);status.textContent=ranked.length?`검색 결과 ${ranked.length}개`:'검색 결과가 없습니다';tree.innerHTML=ranked.length?`<div class="sbn-results">${ranked.map(({r})=>`<a class="sbn-result-card" href="${esc(r.href)}"><span class="sbn-result-path">${esc(r.category)} · ${esc(r.small||r.middle)}</span><strong class="sbn-result-title">${esc(r.title)}</strong><span class="sbn-result-desc">${esc(r.desc||'관련 내용을 확인합니다.')}</span><em class="sbn-result-arrow">›</em></a>`).join('')}</div>`:'<div class="sbn-empty">검색 결과가 없습니다.</div>';}
function setShared(q,source){const value=String(q||'').trim();if(leftInput.value!==value)leftInput.value=value;value?renderSearch(value):renderTree();if(directoryController&&source!=='directory'&&!sync)directoryController.setQuery(value);}
document.body.append(nav);document.documentElement.classList.add('savingio-brain-ready');renderTree();leftInput.addEventListener('input',()=>setShared(leftInput.value,'left'));nav.querySelector('form').addEventListener('submit',e=>e.preventDefault());window.addEventListener('savingio-search-change',e=>{if(e.detail?.source!=='left')setShared(e.detail?.query||'','directory');});const initial=new URLSearchParams(location.search).get('q')||'';if(initial)setShared(initial,'url');
nav.addEventListener('click',e=>{const a=e.target.closest('a[href]');if(a&&valid(a.getAttribute('href'))){e.preventDefault();location.assign(a.getAttribute('href'));}});
const button=document.createElement('button');button.className='sbn-mobile-btn';button.type='button';button.textContent='문제 찾기';document.body.append(button);const backdrop=document.createElement('div');backdrop.className='sbn-backdrop';document.body.append(backdrop);const close=()=>document.body.classList.remove('sbn-open');button.onclick=()=>document.body.classList.add('sbn-open');nav.querySelector('.sbn-close').onclick=close;backdrop.onclick=close;
})();