(async()=>{
'use strict';

const VERSION='22';
const norm=v=>String(v||'').toLowerCase().replace(/\s+/g,' ').trim();
const compact=v=>norm(v).replace(/[^0-9a-z가-힣]+/gi,'');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const cssHref=`/css/savingio-brain-navigation.css?v=${VERSION}`;
let css=document.querySelector('link[href*="savingio-brain-navigation.css"]');
if(css)css.href=cssHref;else{css=document.createElement('link');css.rel='stylesheet';css.href=cssHref;document.head.appendChild(css);}

const INTENTS=[
 {id:'장기수선충당금',category:'주거',topic:'관리비·장기수선충당금',aliases:['장기수선충당금','장충금','장충','장수금','장수','장기수선','수선충당금'],must:['장기수선충당금','장기수선','수선충당','장충금','장수금'],fallback:['관리비','아파트관리비','공동주택','임대차정산','보증금정산'],exclude:['기초연금','국민연금','노령연금','재산세','노인일자리','난방비','전기요금','전기세','누진제','에어컨','냉방','연비']},
 {id:'누수',category:'주거',topic:'누수',aliases:['누수','천장누수','벽누수','아랫집누수','윗집누수','배관누수','누수보험','일배책'],must:['누수','일배책','일상생활배상책임']},
 {id:'임대차',category:'주거',topic:'전월세·계약',aliases:['임대차','전세계약','월세계약','계약해지','계약갱신','보증금','중개수수료','전세보증'],must:['임대차','전세','월세','보증금','중개수수료']},
 {id:'자동차보험',category:'자동차·교통',topic:'자동차보험',aliases:['자동차보험','차보험','자동차보험료','운전자보험','마일리지특약','자녀할인특약'],must:['자동차보험','차보험','운전자보험','마일리지','자녀할인'],exclude:['에어컨','연비','주유','자동차세','과태료']},
 {id:'교통사고',category:'자동차·교통',topic:'사고·보상',aliases:['교통사고','자동차사고','차사고','사고접수','사고처리','대인','대물'],must:['교통사고','자동차사고','사고접수','사고처리','대인','대물']},
 {id:'과태료',category:'자동차·교통',topic:'과태료·범칙금',aliases:['과태료','범칙금','교통벌금','미납과태료','이파인','교통민원24'],must:['과태료','범칙금','교통벌금','이파인','교통민원24']},
 {id:'아이',category:'아이·교육',topic:'아이·교육·돌봄',aliases:['아이','어린이','아동','자녀','아기','초등학생','육아','보육','교육','돌봄'],must:['아이','어린이','아동','자녀','육아','보육','교육','돌봄']},
 {id:'연금',category:'연금·노후',topic:'연금·노후',aliases:['연금','국민연금','기초연금','노령연금','노후'],must:['연금','노후','고령']},
 {id:'정부지원',category:'정부혜택',topic:'지원금·복지',aliases:['정부지원','정부혜택','지원금','보조금','복지','바우처','장려금','수당'],must:['정부지원','정부혜택','지원금','보조금','복지','바우처','장려금']},
 {id:'환급',category:'세금·환급',topic:'환급금',aliases:['환급','환급금','과납','과오납','미환급','돌려받기'],must:['환급','과납','과오납','미환급']},
 {id:'세금',category:'세금·환급',topic:'세금·신고',aliases:['세금','종합소득세','종소세','부가세','재산세','자동차세','연말정산','홈택스','위택스'],must:['세금','종합소득세','종소세','부가세','재산세','자동차세','연말정산','홈택스','위택스']},
 {id:'급여',category:'직장·급여',topic:'급여·퇴직',aliases:['급여','월급','임금','연봉','시급','퇴직금','퇴사','실업급여'],must:['급여','월급','임금','연봉','시급','퇴직금','퇴사','실업급여']},
 {id:'보험',category:'금융',topic:'보험',aliases:['보험','보험료','보장','특약','실손','실비','건강보험'],must:['보험','실손','실비','보장','특약']},
 {id:'은행카드',category:'금융',topic:'은행·카드·대출',aliases:['은행','계좌','통장','카드','대출','금리','이자','수수료'],must:['은행','계좌','통장','카드','대출','금리','이자','수수료']},
 {id:'전기요금',category:'생활비 절약',topic:'전기요금·냉방',aliases:['전기요금','전기세','에어컨','냉방','누진제','한전','절전'],must:['전기요금','전기세','에어컨','냉방','누진제','한전','절전']},
 {id:'통신비',category:'생활비 절약',topic:'통신비',aliases:['통신비','휴대폰','핸드폰','인터넷','알뜰폰','요금제'],must:['통신비','휴대폰','핸드폰','인터넷','알뜰폰','요금제']},
 {id:'생활비',category:'생활비 절약',topic:'생활비·소비',aliases:['생활비','절약','고정비','가계부','예산','지출','소비'],must:['생활비','절약','고정비','가계부','예산','지출','소비']},
 {id:'건강',category:'생활정보',topic:'건강·병원비',aliases:['건강','병원','병원비','의료비','진료비','검진','치료'],must:['건강','병원','의료비','진료비','검진','치료']}
];

function detectIntent(query){
 const q=compact(query);if(!q)return null;
 if(['장기','장기수','장기수선','장기수선충','장기수선충당','장기수선충당금','장충','장충금','장수','장수금'].includes(q))return INTENTS[0];
 let best=null,bestLen=0;
 for(const i of INTENTS){for(const a of i.aliases){const t=compact(a);if(t&&(q===t||q.includes(t))&&t.length>bestLen){best=i;bestLen=t.length;}}}
 return best;
}

function classify(text,fallback='생활정보'){
 const hay=compact(text);let best=null,score=0;
 for(const i of INTENTS){let s=0;for(const w of i.must){const t=compact(w);if(t&&hay.includes(t))s+=Math.max(5,t.length);}if(s>score){score=s;best=i;}}
 return best?{category:best.category,topic:best.topic,intent:best.id}:{category:fallback||'생활정보',topic:fallback||'생활정보',intent:'기타'};
}

function rank(records,query){
 const q=compact(query);if(!q)return records.map(r=>({r,score:1}));
 const intent=detectIntent(query);
 if(intent){
  const strict=records.map(r=>{const hay=compact(`${r.title} ${r.desc||r.description||''} ${r.href} ${r.topic}`);if((intent.exclude||[]).some(w=>hay.includes(compact(w))))return {r,score:0};let score=0;for(const w of intent.must){const t=compact(w);if(t&&hay.includes(t))score+=200+t.length;}if(r.intent===intent.id)score+=300;if(compact(r.title).includes(compact(intent.id)))score+=500;return {r,score};}).filter(x=>x.score>0);
  if(strict.length)return strict.sort((a,b)=>b.score-a.score||a.r.title.localeCompare(b.r.title,'ko'));
  const fallback=records.map(r=>{const hay=compact(`${r.title} ${r.desc||r.description||''} ${r.href} ${r.topic}`);if((intent.exclude||[]).some(w=>hay.includes(compact(w))))return {r,score:0};let score=0;for(const w of intent.fallback||[]){const t=compact(w);if(t&&hay.includes(t))score+=30+t.length;}if(r.category===intent.category)score+=10;return {r,score};}).filter(x=>x.score>10);
  return fallback.sort((a,b)=>b.score-a.score||a.r.title.localeCompare(b.r.title,'ko'));
 }
 return records.map(r=>{const title=compact(r.title),desc=compact(r.desc||r.description),href=compact(r.href),topic=compact(r.topic),category=compact(r.category);let score=0;if(title===q)score=500;else if(title.includes(q))score=300;if(href.includes(q))score=Math.max(score,200);if(topic.includes(q))score=Math.max(score,120);if(desc.includes(q))score=Math.max(score,60);if(category.includes(q))score=Math.max(score,30);return {r,score};}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.r.title.localeCompare(b.r.title,'ko'));
}

let directoryController=null;let syncing=false;
function initDirectory(){
 const input=document.getElementById('articleSearch'),grid=document.getElementById('articleGrid'),count=document.getElementById('resultCount');if(!input||!grid||!count)return;
 const cards=[...grid.querySelectorAll('.article-card')],pager=document.querySelector('.pager'),buttons=[...document.querySelectorAll('.category-row button[data-cat]')];let active='전체';
 const records=cards.map(card=>{const title=card.querySelector('h2')?.textContent||'',desc=card.querySelector('p')?.textContent||'',href=card.getAttribute('href')||'',old=card.dataset.category||card.querySelector('.card-category')?.textContent||'생활정보',cls=classify(`${title} ${desc} ${href}`,old);card.dataset.category=cls.category;card.dataset.topic=cls.topic;card.dataset.intent=cls.intent;const badge=card.querySelector('.card-category');if(badge)badge.textContent=cls.category;return {card,title,desc,href,...cls};});
 function activateAll(){active='전체';buttons.forEach(b=>b.classList.toggle('active',(b.dataset.cat||'전체')==='전체'));}
 function apply(query,source='directory'){const q=String(query??input.value).trim();if(input.value!==q)input.value=q;if(q)activateAll();const ranked=rank(records,q).filter(x=>active==='전체'||x.r.category===active);const visible=new Set(ranked.map(x=>x.r.card));records.forEach(r=>{const show=visible.has(r.card);r.card.hidden=!show;r.card.classList.toggle('savingio-filter-hidden',!show);});ranked.forEach(x=>grid.appendChild(x.r.card));count.textContent=`검색 결과 ${ranked.length}개`;if(pager)pager.style.display=(q||active!=='전체')?'none':'';if(source!=='url'){const u=new URL(location.href);q?u.searchParams.set('q',q):u.searchParams.delete('q');history.replaceState(null,'',u);}if(!syncing){syncing=true;window.dispatchEvent(new CustomEvent('savingio-search-change',{detail:{query:q,source}}));syncing=false;}}
 input.addEventListener('input',()=>apply(input.value));input.addEventListener('search',()=>apply(input.value));buttons.forEach(b=>b.addEventListener('click',()=>{active=b.dataset.cat||'전체';buttons.forEach(x=>x.classList.toggle('active',x===b));apply(input.value,'category');}));directoryController={setQuery:q=>apply(q,'shared'),records};apply(new URLSearchParams(location.search).get('q')||'','url');
}
initDirectory();

document.querySelectorAll('form.search[action*="/articles"]').forEach(f=>f.addEventListener('submit',e=>{const i=f.querySelector('input[type="search"],input[name="q"]'),q=i?.value.trim();if(q){e.preventDefault();location.assign(`/articles/?q=${encodeURIComponent(q)}`);}}));

if(document.getElementById('savingio-brain-nav'))return;
let DATA=window.SAVINGIO_BRAIN_DATA;try{if(!DATA||!DATA.tree){const r=await fetch(`/data/savingio-brain-data.json?v=${VERSION}`,{cache:'no-store'});if(!r.ok)return;DATA=await r.json();window.SAVINGIO_BRAIN_DATA=DATA;}}catch(_){return;}
const valid=h=>typeof h==='string'&&/^\/(articles|calculators)\/[a-z0-9][a-z0-9-]*(?:\.html)?(?:[?#].*)?$/i.test(h.trim());
const records=[],seen=new Set();Object.entries(DATA.tree||{}).forEach(([large,mids])=>Object.entries(mids||{}).forEach(([middle,smalls])=>Object.entries(smalls||{}).forEach(([small,items])=>(Array.isArray(items)?items:[]).forEach(item=>{if(!item||!valid(item.href)||!item.title||seen.has(item.href))return;seen.add(item.href);const description=item.description||'',cls=classify(`${item.title} ${description} ${item.search_keywords||''} ${item.href} ${middle} ${small}`,middle);records.push({...item,description,large,middle,small,...cls});}))));
const nav=document.createElement('aside');nav.id='savingio-brain-nav';nav.innerHTML=`<button class="sbn-close" type="button">×</button><div class="sbn-head"><strong>지금 어떤 문제가 있으세요?</strong><small>카테고리 이름을 몰라도 괜찮아요.<br>상황이나 글 제목을 입력해 보세요.</small></div><form class="sbn-search"><input type="search" placeholder="예: 장충금, 어린이, 자동차보험"><button type="submit">검색</button></form><div class="sbn-search-status"></div><div class="sbn-context"></div><div class="sbn-tree"></div>`;
const tree=nav.querySelector('.sbn-tree'),form=nav.querySelector('.sbn-search'),leftInput=form.querySelector('input'),status=nav.querySelector('.sbn-search-status');
function renderTree(){let html='';Object.entries(DATA.tree||{}).forEach(([large,mids])=>{let mh='';Object.entries(mids||{}).forEach(([middle,smalls])=>{let sh='';Object.entries(smalls||{}).forEach(([small,items])=>{const arr=(Array.isArray(items)?items:[]).filter(i=>i&&valid(i.href)&&i.title);if(arr.length)sh+=`<details class="sbn-small"><summary>${esc(small)}<span class="sbn-count">${arr.length}</span></summary><ul class="sbn-items">${arr.map(i=>`<li><a href="${esc(i.href)}">${esc(i.title)}</a></li>`).join('')}</ul></details>`;});if(sh)mh+=`<details class="sbn-middle"><summary>${esc(middle)}</summary>${sh}</details>`;});if(mh)html+=`<details class="sbn-large"><summary><span class="sbn-large-title">${esc(large)}</span></summary>${mh}</details>`;});tree.innerHTML=html;status.textContent='카테고리를 펼치거나 검색해 글을 찾으세요';}
function renderSearch(q){const ranked=rank(records,q).slice(0,50);status.textContent=ranked.length?`검색 결과 ${ranked.length}개`:'검색 결과가 없습니다';tree.innerHTML=ranked.length?`<div class="sbn-results">${ranked.map(({r})=>`<a class="sbn-result-card" href="${esc(r.href)}"><span class="sbn-result-path">${esc(r.category)} · ${esc(r.topic)}</span><strong class="sbn-result-title">${esc(r.title)}</strong><span class="sbn-result-desc">${esc(r.description||'관련 내용을 확인합니다.')}</span><em class="sbn-result-arrow">›</em></a>`).join('')}</div>`:'<div class="sbn-empty">검색 결과가 없습니다.</div>';}
function setShared(q,source){const value=String(q||'').trim();if(leftInput.value!==value)leftInput.value=value;value?renderSearch(value):renderTree();if(directoryController&&source!=='directory'&&!syncing)directoryController.setQuery(value);}
document.body.append(nav);document.documentElement.classList.add('savingio-brain-ready');renderTree();leftInput.addEventListener('input',()=>setShared(leftInput.value,'left'));form.addEventListener('submit',e=>e.preventDefault());window.addEventListener('savingio-search-change',e=>{if(e.detail?.source!=='left')setShared(e.detail?.query||'','directory');});const initial=new URLSearchParams(location.search).get('q')||'';if(initial)setShared(initial,'url');nav.addEventListener('click',e=>{const a=e.target.closest('a[href]');if(a&&valid(a.getAttribute('href'))){e.preventDefault();location.assign(a.getAttribute('href'));}});
const button=document.createElement('button');button.className='sbn-mobile-btn';button.type='button';button.textContent='문제 찾기';document.body.append(button);const backdrop=document.createElement('div');backdrop.className='sbn-backdrop';document.body.append(backdrop);const close=()=>document.body.classList.remove('sbn-open');button.onclick=()=>document.body.classList.add('sbn-open');nav.querySelector('.sbn-close').onclick=close;backdrop.onclick=close;
})();