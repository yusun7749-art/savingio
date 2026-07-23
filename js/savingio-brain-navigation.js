(async()=>{
'use strict';
const VERSION='33';
const norm=v=>String(v||'').toLowerCase().replace(/\s+/g,' ').trim();
const compact=v=>norm(v).replace(/[^0-9a-z가-힣]+/gi,'');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
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
 {cat:'주거',aliases:['장기','장기수','장기수선','장기수선충','장기수선충당','장기수선충당금','장충','장충금','수선충당금']},
 {cat:'아이·교육',aliases:['아이','어린이','아동','자녀','아기','초등학생','학생','육아','보육','교육','학교','학원','돌봄','교육비']},
 {cat:'세금·환급',aliases:['세금','세액','국세','지방세','종합소득세','종소세','부가가치세','부가세','재산세','자동차세','연말정산','홈택스','위택스','환급','환급금','과납','과오납']},
 {cat:'정부혜택',aliases:['정부지원','정부혜택','지원금','보조금','복지','바우처','장려금','기초생활','주거급여']},
 {cat:'자동차·교통',aliases:['자동차보험','차보험','자동차보험료','운전자보험','마일리지특약','자녀할인특약','자동차','차량','운전','교통','과태료','범칙금','주차','연비','주유']},
 {cat:'연금·노후',aliases:['연금','국민연금','기초연금','노령연금','노후','고령']},
 {cat:'직장·급여',aliases:['급여','월급','임금','연봉','시급','퇴직금','퇴사','실업급여','주휴수당']},
 {cat:'금융',aliases:['보험','보험료','보장','특약','실손','실비','건강보험','은행','계좌','통장','카드','대출','금리','이자','수수료','예금','적금']},
 {cat:'생활비 절약',aliases:['전기요금','전기세','에어컨','냉방','누진제','한전','절전','통신비','휴대폰','인터넷','알뜰폰']},
 {cat:'주거',aliases:['누수','천장누수','벽누수','아랫집누수','윗집누수','배관누수','임대차','전세계약','월세계약','전세','월세','보증금','중개수수료']},
 {cat:'생활정보',aliases:['건강','병원','병원비','의료비','진료비','검진','치료']}
];
function installHeader(){
 const header=document.querySelector('.site-header,.top');
 if(!header)return;
 const path=location.pathname.replace(/index\.html$/,'').replace(/\.html$/,'');
 const items=[['홈','/'],['생활정보','/articles/'],['계산기','/calculators/'],['Savingio Lab','/lab/'],['사이트 탐색','/categories/'],['About','/about.html']];
 header.className='savingio-dna-header';
 header.innerHTML=`<div class="savingio-dna-header-inner"><a class="savingio-dna-logo" href="/">Savingio</a><nav class="savingio-dna-nav" aria-label="Savingio 주요 메뉴">${items.map(([label,href])=>{const target=href.replace(/index\.html$/,'').replace(/\.html$/,'');const active=href==='/'?path==='/'||path==='':path.startsWith(target);return `<a href="${href}"${label==='Savingio Lab'?' class="lab-link"':''}${active?' aria-current="page"':''}>${label}</a>`}).join('')}</nav></div>`;
 if(!document.getElementById('savingio-header-dna-v33')){
  const style=document.createElement('style');style.id='savingio-header-dna-v33';style.textContent=`
  :root{--savingio-header-height:84px}
  html{scroll-padding-top:100px}
  body{padding-top:var(--savingio-header-height)!important}
  .savingio-dna-header{position:fixed!important;left:0!important;right:0!important;top:0!important;width:100vw!important;height:var(--savingio-header-height)!important;z-index:10000!important;margin:0!important;padding:0!important;background:rgba(251,247,239,.97)!important;border-bottom:1px solid rgba(145,119,82,.20)!important;box-shadow:none!important;backdrop-filter:blur(14px)!important;-webkit-backdrop-filter:blur(14px)!important}
  .savingio-dna-header-inner{box-sizing:border-box!important;width:calc(100% - 48px)!important;max-width:1180px!important;height:84px!important;margin:0 auto!important;padding:0!important;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:36px!important}
  .savingio-dna-logo{display:block!important;margin:0!important;padding:0!important;font-family:Georgia,"Times New Roman",serif!important;font-size:31px!important;line-height:1!important;font-weight:700!important;letter-spacing:-.7px!important;color:#132744!important;text-decoration:none!important;white-space:nowrap!important}
  .savingio-dna-nav{display:flex!important;align-items:center!important;justify-content:flex-end!important;gap:28px!important;margin-left:auto!important;padding:0!important;white-space:nowrap!important}
  .savingio-dna-nav a{display:inline-flex!important;align-items:center!important;justify-content:center!important;min-height:38px!important;margin:0!important;padding:0!important;color:#132744!important;font-family:Pretendard,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;font-size:15px!important;line-height:1!important;font-weight:750!important;text-decoration:none!important;white-space:nowrap!important}
  .savingio-dna-nav a:hover,.savingio-dna-nav a[aria-current="page"]{color:#b98238!important}
  .savingio-dna-nav .lab-link{padding:9px 13px!important;border:1px solid rgba(185,130,56,.42)!important;border-radius:999px!important;background:rgba(185,130,56,.05)!important}
  html.savingio-brain-ready .savingio-dna-header{left:0!important;width:100vw!important;margin:0!important}
  @media(max-width:900px){.savingio-dna-header-inner{width:calc(100% - 32px)!important}.savingio-dna-nav{gap:15px!important}.savingio-dna-nav a{font-size:14px!important}}
  @media(max-width:760px){:root{--savingio-header-height:72px}.savingio-dna-header,.savingio-dna-header-inner{height:72px!important}.savingio-dna-logo{font-size:28px!important}.savingio-dna-nav{display:none!important}}
  `;document.head.appendChild(style);
 }
}
function normalizeCategory(value){const v=norm(value).replace(/\s+/g,'');return CATEGORIES.find(c=>norm(c).replace(/\s+/g,'')===v)||'';}
function classifyTitle(title,original='생활정보'){const t=compact(title);for(const [cat,words] of CATEGORY_RULES){if(words.some(w=>t.includes(compact(w))))return cat;}return normalizeCategory(original)||'생활정보';}
function detectIntent(query){const q=compact(query);if(!q)return null;let best=null,bestScore=-1;for(const intent of INTENTS)for(const alias of intent.aliases){const a=compact(alias);let score=-1;if(q===a)score=1000+a.length;else if(a.startsWith(q)&&q.length>=2)score=700+q.length;else if(q.startsWith(a)&&a.length>=2)score=600+a.length;if(score>bestScore){best=intent;bestScore=score;}}return best;}
function recordScore(r,query){const q=compact(query);if(!q)return 1;const title=compact(r.title),desc=compact(r.desc),href=compact(r.href),keywords=compact(r.keywords);const intent=detectIntent(query);let score=0;if(title===q)score=120000;else if(title.startsWith(q))score=110000;else if(title.includes(q))score=100000;if(intent){let aliasTitle=0;for(const alias of intent.aliases){const a=compact(alias);if(title===a)aliasTitle=Math.max(aliasTitle,115000);else if(title.startsWith(a))aliasTitle=Math.max(aliasTitle,105000+a.length);else if(title.includes(a))aliasTitle=Math.max(aliasTitle,95000+a.length);}score=Math.max(score,aliasTitle);if(r.category===intent.cat)score=Math.max(score,30000);if(r.category!==intent.cat&&aliasTitle===0&&score<100000)return 0;}if(href.includes(q))score=Math.max(score,15000);if(keywords.includes(q))score=Math.max(score,5000);if(desc.includes(q))score=Math.max(score,1000);return score;}
function rankRecords(list,query,category='전체'){return list.map((r,index)=>({r,index,score:query?recordScore(r,query):1})).filter(x=>x.score>0&&(category==='전체'||x.r.category===category)).sort((a,b)=>b.score-a.score||a.index-b.index);}
installHeader();
let records=[];const grid=document.getElementById('articleGrid');
if(grid)records=[...grid.querySelectorAll('.article-card')].map((card,index)=>{const title=card.querySelector('h2')?.textContent?.trim()||'',desc=card.querySelector('p')?.textContent?.trim()||'',href=card.getAttribute('href')||'',original=card.dataset.category||card.querySelector('.card-category')?.textContent||'생활정보',category=classifyTitle(title,original),keywords=card.dataset.search||'';card.dataset.category=category;const badge=card.querySelector('.card-category');if(badge)badge.textContent=category;return{card,index,title,desc,href,category,keywords};});
let controller=null;
function initDirectory(){const input=document.getElementById('articleSearch'),count=document.getElementById('resultCount');if(!input||!grid||!count||!records.length)return;const pager=document.querySelector('.pager'),buttons=[...document.querySelectorAll('.category-row button[data-cat]')];let state={query:new URLSearchParams(location.search).get('q')||'',category:'전체'},locked=false;function paint(source='directory'){const ranked=rankRecords(records,state.query,state.category),visible=new Set(ranked.map(x=>x.r.card));records.forEach(r=>{const show=visible.has(r.card);r.card.hidden=!show;r.card.classList.toggle('savingio-filter-hidden',!show);});ranked.forEach(x=>grid.appendChild(x.r.card));count.textContent=`검색 결과 ${ranked.length}개`;if(pager)pager.style.display=(state.query||state.category!=='전체')?'none':'';buttons.forEach(b=>b.classList.toggle('active',(b.dataset.cat||'전체')===state.category));input.value=state.query;const u=new URL(location.href);state.query?u.searchParams.set('q',state.query):u.searchParams.delete('q');state.category!=='전체'?u.searchParams.set('cat',state.category):u.searchParams.delete('cat');history.replaceState(null,'',u);if(!locked){locked=true;dispatchEvent(new CustomEvent('savingio-unified-search',{detail:{query:state.query,category:state.category,ranked,source}}));locked=false;}}input.addEventListener('input',()=>{state.query=input.value.trim();state.category='전체';paint('center');});buttons.forEach(btn=>btn.addEventListener('click',()=>{state.query='';state.category=btn.dataset.cat||'전체';paint('category');}));const initialCat=new URLSearchParams(location.search).get('cat');if(CATEGORIES.includes(initialCat))state.category=initialCat;controller={setQuery(q,source='left'){state.query=String(q||'').trim();state.category='전체';paint(source);}};paint('initial');}
initDirectory();
async function loadFallback(){if(records.length)return records;let data=window.SAVINGIO_BRAIN_DATA;try{if(!data?.tree){const res=await fetch(`/data/savingio-brain-data.json?v=${VERSION}`,{cache:'no-store'});if(!res.ok)return[];data=await res.json();}}catch{return[];}const seen=new Set(),out=[];Object.entries(data.tree||{}).forEach(([large,mids])=>Object.entries(mids||{}).forEach(([middle,smalls])=>Object.entries(smalls||{}).forEach(([small,items])=>(items||[]).forEach(item=>{if(!item?.href||!item?.title||seen.has(item.href))return;seen.add(item.href);out.push({title:item.title,desc:item.description||'',href:item.href,category:classifyTitle(item.title,middle),keywords:item.search_keywords||'',large,middle,small});}))));return out;}
async function initLeftNav(){if(document.getElementById('savingio-brain-nav'))return;const source=await loadFallback(),nav=document.createElement('aside');nav.id='savingio-brain-nav';nav.innerHTML='<button class="sbn-close" type="button">×</button><div class="sbn-head"><strong>지금 어떤 문제가 있으세요?</strong><small>상황이나 찾는 글 제목을 입력해 보세요.</small></div><form class="sbn-search"><input type="search" placeholder="예: 아이, 세금, 장기수선충당금"><button type="submit">검색</button></form><div class="sbn-search-status"></div><div class="sbn-tree"></div>';const input=nav.querySelector('input'),status=nav.querySelector('.sbn-search-status'),tree=nav.querySelector('.sbn-tree');function results(ranked,label=''){status.textContent=label||`검색 결과 ${ranked.length}개`;tree.innerHTML=ranked.length?`<div class="sbn-results">${ranked.slice(0,50).map(({r})=>`<a class="sbn-result-card" href="${esc(r.href)}"><span class="sbn-result-path">${esc(r.category)}</span><strong class="sbn-result-title">${esc(r.title)}</strong><span class="sbn-result-desc">${esc(r.desc||'관련 내용을 확인합니다.')}</span></a>`).join('')}</div>`:'<div class="sbn-empty">검색 결과가 없습니다.</div>';}function categories(){status.textContent='카테고리를 선택하거나 검색해 글을 찾으세요';tree.innerHTML=CATEGORIES.map(cat=>{const items=source.filter(r=>r.category===cat);return `<details class="sbn-large"><summary><span class="sbn-large-title">${esc(cat)}</span><span class="sbn-count">${items.length}</span></summary><ul class="sbn-items">${items.map(r=>`<li><a href="${esc(r.href)}">${esc(r.title)}</a></li>`).join('')}</ul></details>`}).join('');}function search(q){q?results(rankRecords(source,q)):categories();}document.body.appendChild(nav);document.documentElement.classList.add('savingio-brain-ready');categories();input.addEventListener('input',()=>controller?controller.setQuery(input.value,'left'):search(input.value.trim()));nav.querySelector('form').addEventListener('submit',e=>e.preventDefault());addEventListener('savingio-unified-search',e=>{const d=e.detail||{};input.value=d.query||'';d.query?results(d.ranked||[]):d.category&&d.category!=='전체'?results(d.ranked||[],`${d.category} 글 ${(d.ranked||[]).length}개`):categories();});const button=document.createElement('button');button.className='sbn-mobile-btn';button.type='button';button.textContent='문제 찾기';document.body.appendChild(button);const backdrop=document.createElement('div');backdrop.className='sbn-backdrop';document.body.appendChild(backdrop);const close=()=>document.body.classList.remove('sbn-open');button.onclick=()=>document.body.classList.add('sbn-open');nav.querySelector('.sbn-close').onclick=close;backdrop.onclick=close;}
initLeftNav();
})();