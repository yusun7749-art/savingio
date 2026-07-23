(async()=>{
'use strict';

const CSS='/css/savingio-brain-navigation.css?v=20';
let css=document.querySelector('link[href*="savingio-brain-navigation.css"]');
if(css)css.href=CSS;else{css=document.createElement('link');css.rel='stylesheet';css.href=CSS;document.head.appendChild(css);}

const norm=v=>String(v||'').toLowerCase().replace(/\s+/g,' ').trim();
const compact=v=>norm(v).replace(/[^0-9a-z가-힣]+/gi,'');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const INTENTS=[
 {id:'장기수선충당금',category:'주거',topic:'관리비·장기수선충당금',terms:['장기수선충당금','장충금','장충','장수금','장수','장기수선','수선충당금'],strict:['장기수선','수선충당','장충금','장수금'],fallback:['관리비','아파트','공동주택','임대차','보증금','월세','전세'],exclude:['전기요금','전기세','누진제','에어컨','냉방','한전','연비']},
 {id:'누수',category:'주거',topic:'누수',terms:['누수','천장누수','벽누수','아랫집누수','윗집누수','배관누수','누수보험','일배책','일상생활배상책임'],strict:['누수','일배책','일상생활배상책임']},
 {id:'임대차',category:'주거',topic:'전월세·계약',terms:['임대차','전세계약','월세계약','계약해지','계약갱신','보증금','중개수수료','전세보증','전세사기'],strict:['임대차','전세','월세','보증금','중개수수료']},
 {id:'자동차보험',category:'자동차·교통',topic:'자동차보험',terms:['자동차보험','차보험','자동차보험료','운전자보험','마일리지특약','자녀할인특약'],strict:['자동차보험','차보험','운전자보험','마일리지','자녀할인'],exclude:['에어컨','연비','주유','자동차세','과태료']},
 {id:'교통사고',category:'자동차·교통',topic:'사고·보상',terms:['교통사고','자동차사고','차사고','사고접수','사고처리','대인','대물'],strict:['교통사고','자동차사고','사고접수','사고처리','대인','대물']},
 {id:'과태료',category:'자동차·교통',topic:'과태료·범칙금',terms:['과태료','범칙금','교통벌금','미납과태료','이파인','교통민원24','사전통지'],strict:['과태료','범칙금','교통벌금','이파인','교통민원24']},
 {id:'아이',category:'아이·교육',topic:'아이·교육·돌봄',terms:['아이','어린이','아동','자녀','아기','초등학생','육아','보육','교육','돌봄','아동수당','양육수당','보육료','학원비','교육비'],strict:['아이','어린이','아동','자녀','육아','보육','교육','돌봄']},
 {id:'연금',category:'연금·노후',topic:'연금·노후',terms:['연금','국민연금','기초연금','노령연금','노후','추납','고령'],strict:['연금','노후','고령']},
 {id:'정부지원',category:'정부혜택',topic:'지원금·복지',terms:['정부지원','정부혜택','지원금','보조금','복지','바우처','장려금','수당','감면'],strict:['정부지원','정부혜택','지원금','보조금','복지','바우처','장려금']},
 {id:'환급',category:'세금·환급',topic:'환급금',terms:['환급','환급금','돌려받기','과납','과오납','미수령','미환급'],strict:['환급','과납','과오납','미환급']},
 {id:'세금',category:'세금·환급',topic:'세금·신고',terms:['세금','종합소득세','종소세','부가세','재산세','자동차세','연말정산','홈택스','위택스'],strict:['세금','종합소득세','종소세','부가세','재산세','자동차세','연말정산','홈택스','위택스']},
 {id:'급여',category:'직장·급여',topic:'급여·퇴직',terms:['급여','월급','임금','연봉','시급','퇴직금','퇴사','실업급여'],strict:['급여','월급','임금','연봉','시급','퇴직금','퇴사','실업급여']},
 {id:'보험',category:'금융',topic:'보험',terms:['보험','보험료','보장','특약','실손','실비','건강보험','보험금'],strict:['보험','실손','실비','보장','특약']},
 {id:'은행카드',category:'금융',topic:'은행·카드·대출',terms:['은행','계좌','통장','카드','대출','금리','이자','수수료'],strict:['은행','계좌','통장','카드','대출','금리','이자','수수료']},
 {id:'전기요금',category:'생활비 절약',topic:'전기요금·냉방',terms:['전기요금','전기세','에어컨','냉방','누진제','한전','절전'],strict:['전기요금','전기세','에어컨','냉방','누진제','한전','절전']},
 {id:'통신비',category:'생활비 절약',topic:'통신비',terms:['통신비','휴대폰','핸드폰','인터넷','알뜰폰','요금제'],strict:['통신비','휴대폰','핸드폰','인터넷','알뜰폰','요금제']},
 {id:'생활비',category:'생활비 절약',topic:'생활비·소비',terms:['생활비','절약','고정비','가계부','예산','지출','소비'],strict:['생활비','절약','고정비','가계부','예산','지출','소비']},
 {id:'건강',category:'생활정보',topic:'건강·병원비',terms:['건강','병원','병원비','의료비','진료비','검진','치료'],strict:['건강','병원','의료비','진료비','검진','치료']},
 {id:'사업',category:'세금·환급',topic:'사업자·세무',terms:['사업','사업자','자영업','소상공인','폐업','매출','세금계산서'],strict:['사업','사업자','자영업','소상공인','폐업','매출','세금계산서']},
 {id:'부업',category:'직장·급여',topic:'부업·재택',terms:['부업','재택','재택근무','사이드잡','n잡','프리랜서'],strict:['부업','재택','사이드잡','n잡','프리랜서']}
];

function detectIntent(query){
 const q=compact(query);if(!q)return null;
 let best=null,len=0;
 for(const i of INTENTS)for(const raw of [i.id,...i.terms]){const t=compact(raw);if(t&&(q===t||q.includes(t)||t.includes(q))&&t.length>len){best=i;len=t.length;}}
 return best;
}

function classify(text,fallback='생활정보'){
 const h=compact(text);let best=null,score=0;
 for(const i of INTENTS){let s=0;for(const w of i.strict){const t=compact(w);if(t&&h.includes(t))s+=Math.max(3,t.length);}if(s>score){score=s;best=i;}}
 return best?{category:best.category,topic:best.topic,intent:best.id}:{category:fallback||'생활정보',topic:fallback||'생활정보',intent:'기타'};
}

function baseScore(r,q){
 const query=compact(q),title=compact(r.title),desc=compact(r.desc||r.description),href=compact(r.href),topic=compact(r.topic),cat=compact(r.category);
 if(!query)return 1;let s=0;
 if(title===query)s=150;else if(title.includes(query))s=110;
 if(href.includes(query))s=Math.max(s,80);if(topic.includes(query))s=Math.max(s,70);if(desc.includes(query))s=Math.max(s,45);if(cat.includes(query))s=Math.max(s,25);
 return s;
}

function rank(records,query){
 const intent=detectIntent(query);let out=[];
 if(intent){
  out=records.map(r=>{const hay=compact(`${r.title} ${r.desc||r.description||''} ${r.href} ${r.topic}`);if((intent.exclude||[]).some(w=>hay.includes(compact(w))))return {r,score:0};let s=0;for(const w of intent.strict){const t=compact(w);if(t&&hay.includes(t))s+=100+t.length;}if(r.intent===intent.id)s+=120;return {r,score:s};}).filter(x=>x.score>0);
  if(!out.length&&intent.fallback){
   out=records.map(r=>{const hay=compact(`${r.title} ${r.desc||r.description||''} ${r.href} ${r.topic}`);if((intent.exclude||[]).some(w=>hay.includes(compact(w))))return {r,score:0};let s=0;for(const w of intent.fallback){const t=compact(w);if(t&&hay.includes(t))s+=20+t.length;}if(r.category===intent.category)s+=10;return {r,score:s};}).filter(x=>x.score>10);
  }
 }else out=records.map(r=>({r,score:baseScore(r,query)})).filter(x=>x.score>0);
 return out.sort((a,b)=>b.score-a.score||a.r.title.localeCompare(b.r.title,'ko'));
}

let directory=null,sync=false;
function initDirectory(){
 const input=document.getElementById('articleSearch'),grid=document.getElementById('articleGrid'),count=document.getElementById('resultCount');if(!input||!grid||!count)return;
 const cards=[...grid.querySelectorAll('.article-card')],pager=document.querySelector('.pager'),buttons=[...document.querySelectorAll('.category-row button[data-cat]')];let active='전체';
 const records=cards.map(card=>{const title=card.querySelector('h2')?.textContent||'',desc=card.querySelector('p')?.textContent||'',href=card.getAttribute('href')||'',old=card.dataset.category||card.querySelector('.card-category')?.textContent||'생활정보',cls=classify(`${title} ${desc} ${href}`,old);card.dataset.category=cls.category;card.dataset.topic=cls.topic;card.dataset.intent=cls.intent;const badge=card.querySelector('.card-category');if(badge)badge.textContent=cls.category;return {card,title,desc,href,...cls};});
 const all=()=>{active='전체';buttons.forEach(b=>b.classList.toggle('active',(b.dataset.cat||'전체')==='전체'));};
 const apply=(q,source='directory')=>{q=String(q??input.value).trim();if(input.value!==q)input.value=q;if(q)all();let ranked=rank(records,q).filter(x=>active==='전체'||x.r.category===active);const visible=new Set(ranked.map(x=>x.r.card));records.forEach(r=>{const show=visible.has(r.card);r.card.hidden=!show;r.card.classList.toggle('savingio-filter-hidden',!show);});ranked.forEach(x=>grid.appendChild(x.r.card));count.textContent=`검색 결과 ${ranked.length}개`;if(pager)pager.style.display=(q||active!=='전체')?'none':'';if(source!=='url'){const u=new URL(location.href);q?u.searchParams.set('q',q):u.searchParams.delete('q');history.replaceState(null,'',u);}if(!sync){sync=true;window.dispatchEvent(new CustomEvent('savingio-search-change',{detail:{query:q,source}}));sync=false;}};
 input.addEventListener('input',()=>apply(input.value));input.addEventListener('search',()=>apply(input.value));buttons.forEach(b=>b.addEventListener('click',()=>{active=b.dataset.cat||'전체';buttons.forEach(x=>x.classList.toggle('active',x===b));apply(input.value,'category');}));directory={setQuery:q=>apply(q,'shared'),records};apply(new URLSearchParams(location.search).get('q')||'','url');
}
initDirectory();

document.querySelectorAll('form.search[action*="/articles"]').forEach(f=>f.addEventListener('submit',e=>{const i=f.querySelector('input[type="search"],input[name="q"]'),q=i?.value.trim();if(q){e.preventDefault();location.assign(`/articles/?q=${encodeURIComponent(q)}`);}}));

if(document.getElementById('savingio-brain-nav'))return;
let DATA=window.SAVINGIO_BRAIN_DATA;try{if(!DATA||!DATA.tree){const r=await fetch('/data/savingio-brain-data.json?v=17',{cache:'no-store'});if(!r.ok)return;DATA=await r.json();window.SAVINGIO_BRAIN_DATA=DATA;}}catch(_){return;}
const valid=h=>typeof h==='string'&&/^\/(articles|calculators)\/[a-z0-9][a-z0-9-]*(?:\.html)?(?:[?#].*)?$/i.test(h.trim());
const records=[],seen=new Set();Object.entries(DATA.tree||{}).forEach(([large,mids])=>Object.entries(mids||{}).forEach(([middle,smalls])=>Object.entries(smalls||{}).forEach(([small,items])=>(Array.isArray(items)?items:[]).forEach(item=>{if(!item||!valid(item.href)||!item.title||seen.has(item.href))return;seen.add(item.href);const description=item.description||'',cls=classify(`${item.title} ${description} ${item.search_keywords||''} ${item.href} ${middle} ${small}`,middle);records.push({...item,description,large,middle,small,...cls});}))));
const nav=document.createElement('aside');nav.id='savingio-brain-nav';nav.innerHTML=`<button class="sbn-close" type="button">×</button><div class="sbn-head"><strong>지금 어떤 문제가 있으세요?</strong><small>카테고리 이름을 몰라도 괜찮아요.<br>상황이나 글 제목을 입력해 보세요.</small></div><form class="sbn-search"><input type="search" placeholder="예: 장충금, 어린이, 자동차보험"><button type="submit">검색</button></form><div class="sbn-search-status"></div><div class="sbn-context"></div><div class="sbn-tree"></div>`;
const tree=nav.querySelector('.sbn-tree'),form=nav.querySelector('.sbn-search'),input=form.querySelector('input'),status=nav.querySelector('.sbn-search-status');
function renderTree(){let html='';Object.entries(DATA.tree||{}).forEach(([large,mids])=>{let mh='';Object.entries(mids||{}).forEach(([middle,smalls])=>{let sh='';Object.entries(smalls||{}).forEach(([small,items])=>{const validItems=(Array.isArray(items)?items:[]).filter(i=>i&&valid(i.href)&&i.title);if(validItems.length)sh+=`<details class="sbn-small"><summary>${esc(small)}<span class="sbn-count">${validItems.length}</span></summary><ul class="sbn-items">${validItems.map(i=>`<li><a href="${esc(i.href)}">${esc(i.title)}</a></li>`).join('')}</ul></details>`;});if(sh)mh+=`<details class="sbn-middle"><summary>${esc(middle)}</summary>${sh}</details>`;});if(mh)html+=`<details class="sbn-large"><summary><span class="sbn-large-title">${esc(large)}</span></summary>${mh}</details>`;});tree.innerHTML=html;status.textContent='카테고리를 펼치거나 검색해 글을 찾으세요';}
function renderSearch(q){const ranked=rank(records,q).slice(0,50);status.textContent=ranked.length?`검색 결과 ${ranked.length}개`:'검색 결과가 없습니다';tree.innerHTML=ranked.length?`<div class="sbn-results">${ranked.map(({r})=>`<a class="sbn-result-card" href="${esc(r.href)}"><span class="sbn-result-path">${esc(r.category)} · ${esc(r.topic)}</span><strong class="sbn-result-title">${esc(r.title)}</strong><span class="sbn-result-desc">${esc(r.description||'관련 내용을 확인합니다.')}</span><em class="sbn-result-arrow">›</em></a>`).join('')}</div>`:'<div class="sbn-empty">검색 결과가 없습니다.</div>';}
function setQuery(q,source){q=String(q||'').trim();if(input.value!==q)input.value=q;q?renderSearch(q):renderTree();if(directory&&source!=='directory'&&!sync)directory.setQuery(q);}
document.body.append(nav);document.documentElement.classList.add('savingio-brain-ready');renderTree();input.addEventListener('input',()=>setQuery(input.value,'left'));form.addEventListener('submit',e=>e.preventDefault());window.addEventListener('savingio-search-change',e=>{if(e.detail?.source!=='left')setQuery(e.detail?.query||'','directory');});const initial=new URLSearchParams(location.search).get('q')||'';if(initial)setQuery(initial,'url');nav.addEventListener('click',e=>{const a=e.target.closest('a[href]');if(a&&valid(a.getAttribute('href'))){e.preventDefault();location.assign(a.getAttribute('href'));}});
const button=document.createElement('button');button.className='sbn-mobile-btn';button.type='button';button.textContent='문제 찾기';document.body.append(button);const backdrop=document.createElement('div');backdrop.className='sbn-backdrop';document.body.append(backdrop);const close=()=>document.body.classList.remove('sbn-open');button.onclick=()=>document.body.classList.add('sbn-open');nav.querySelector('.sbn-close').onclick=close;backdrop.onclick=close;
})();