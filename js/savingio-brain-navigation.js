(async()=>{
'use strict';
const VERSION='20260723-master5';
const CATEGORIES=['금융','생활비 절약','정부혜택','세금·환급','직장·급여','자동차·교통','연금·노후','아이·교육','주거','생활정보'];
const RULES=[
 ['아이·교육',['아이','어린이','아동','자녀','육아','교육','학교','학원','돌봄']],
 ['연금·노후',['연금','노후','노인','고령','장기요양']],
 ['자동차·교통',['자동차','차량','운전','교통','과태료','범칙금','주차','연비','주유']],
 ['주거',['장기수선','관리비','아파트','주거','월세','전세','임대차','누수','보증금']],
 ['직장·급여',['실업급여','퇴직금','급여','월급','임금','연봉','시급','근로','주휴수당']],
 ['세금·환급',['종합소득세','부가세','재산세','자동차세','연말정산','세금','국세','지방세','환급','홈택스','위택스']],
 ['정부혜택',['정부지원','정부혜택','지원금','보조금','복지','바우처','장려금','수당','감면']],
 ['금융',['보험','은행','카드','대출','계좌','통장','이자','금리','수수료','예금','적금']],
 ['생활비 절약',['전기요금','전기세','통신비','수도요금','가스요금','난방비','에어컨','생활비','절약','고정비','구독']],
 ['생활정보',['병원','의료비','건강','생활','계약','여행','호텔']]
];
const norm=v=>String(v||'').toLowerCase().replace(/\s+/g,' ').trim();
const compact=v=>norm(v).replace(/[^0-9a-z가-힣]+/gi,'');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function ensureCss(){
 if(!document.querySelector('link[data-savingio-master]')){
  const l=document.createElement('link');l.rel='stylesheet';l.href=`/css/savingio-master-template.css?v=${VERSION}`;l.dataset.savingioMaster='true';document.head.appendChild(l);
 }
 if(!document.querySelector('link[data-savingio-explorer]')){
  const l=document.createElement('link');l.rel='stylesheet';l.href=`/css/savingio-brain-navigation.css?v=${VERSION}`;l.dataset.savingioExplorer='true';document.head.appendChild(l);
 }
}
function classify(title,original='생활정보'){
 const t=compact(title);for(const [cat,words] of RULES){if(words.some(w=>t.includes(compact(w))))return cat;}
 return CATEGORIES.includes(original)?original:'생활정보';
}
function scoreRecord(r,q){
 const query=compact(q);if(!query)return 1;
 const title=compact(r.title),desc=compact(r.desc),keys=compact(r.keywords),href=compact(r.href);
 if(title===query)return 100000;
 if(title.startsWith(query))return 90000;
 if(title.includes(query))return 80000;
 if(keys.includes(query))return 30000;
 if(desc.includes(query))return 10000;
 if(href.includes(query))return 5000;
 return 0;
}
function rank(list,q,cat='전체'){
 return list.map((r,i)=>({r,i,s:scoreRecord(r,q)})).filter(x=>x.s>0&&(cat==='전체'||x.r.category===cat)).sort((a,b)=>b.s-a.s||a.i-b.i);
}
function installHeader(){
 const header=document.querySelector('.site-header,.top,.savingio-dna-header');if(!header)return;
 const path=location.pathname.replace(/index\.html$/,'').replace(/\.html$/,'');
 const items=[['홈','/'],['생활정보','/articles/'],['계산기','/calculators/'],['Savingio Lab','/lab/'],['사이트 탐색','/categories/'],['About','/about.html']];
 header.className='savingio-dna-header';
 header.innerHTML=`<div class="savingio-dna-header-inner"><a class="savingio-dna-logo" href="/">Savingio</a><nav class="savingio-dna-nav" aria-label="Savingio 주요 메뉴">${items.map(([label,href])=>{const target=href.replace(/index\.html$/,'').replace(/\.html$/,'');const active=href==='/'?(path==='/'||path===''):path.startsWith(target);return `<a href="${href}"${label==='Savingio Lab'?' class="lab-link"':''}${active?' aria-current="page"':''}>${label}</a>`}).join('')}</nav></div>`;
}
function collectDirectory(){
 const grid=document.getElementById('articleGrid');if(!grid)return {grid:null,records:[]};
 const records=[...grid.querySelectorAll('.article-card')].map((card,index)=>{
  const title=card.querySelector('h2')?.textContent?.trim()||'';
  const desc=card.querySelector('p')?.textContent?.trim()||'';
  const href=card.getAttribute('href')||'';
  const original=card.dataset.category||card.querySelector('.card-category')?.textContent||'생활정보';
  const category=classify(title,original);card.dataset.category=category;
  const badge=card.querySelector('.card-category');if(badge)badge.textContent=category;
  return{card,index,title,desc,href,category,keywords:card.dataset.search||''};
 });
 return{grid,records};
}
function initDirectory(grid,records){
 const input=document.getElementById('articleSearch'),count=document.getElementById('resultCount');if(!grid||!input||!count||!records.length)return null;
 const buttons=[...document.querySelectorAll('.category-row button[data-cat]')],pager=document.querySelector('.pager');
 let state={query:new URLSearchParams(location.search).get('q')||'',category:'전체'};
 const paint=source=>{
  const ranked=rank(records,state.query,state.category),visible=new Set(ranked.map(x=>x.r.card));
  records.forEach(r=>r.card.hidden=!visible.has(r.card));ranked.forEach(x=>grid.appendChild(x.r.card));
  count.textContent=`검색 결과 ${ranked.length}개`;if(pager)pager.hidden=Boolean(state.query||state.category!=='전체');
  buttons.forEach(b=>b.classList.toggle('active',(b.dataset.cat||'전체')===state.category));input.value=state.query;
  const u=new URL(location.href);state.query?u.searchParams.set('q',state.query):u.searchParams.delete('q');history.replaceState(null,'',u);
  dispatchEvent(new CustomEvent('savingio-unified-search',{detail:{query:state.query,category:state.category,ranked,source}}));
 };
 input.addEventListener('input',()=>{state.query=input.value.trim();state.category='전체';paint('center')});
 buttons.forEach(b=>b.addEventListener('click',()=>{state.query='';state.category=b.dataset.cat||'전체';paint('category')}));paint('initial');
 return{setQuery(q){state.query=String(q||'').trim();state.category='전체';paint('left')}};
}
async function loadRecords(local){
 if(local.length)return local;
 let data=window.SAVINGIO_BRAIN_DATA;
 try{if(!data?.tree){const res=await fetch(`/data/savingio-brain-data.json?v=${VERSION}`,{cache:'no-store'});if(!res.ok)return[];data=await res.json();}}catch{return[];}
 const seen=new Set(),out=[];
 Object.entries(data.tree||{}).forEach(([large,mids])=>Object.entries(mids||{}).forEach(([middle,smalls])=>Object.entries(smalls||{}).forEach(([small,items])=>(items||[]).forEach(item=>{
  if(!item?.href||!item?.title||seen.has(item.href))return;seen.add(item.href);out.push({title:item.title,desc:item.description||'',href:item.href,category:classify(item.title,middle),keywords:item.search_keywords||'',large,middle,small});
 }))));return out;
}
async function initExplorer(records,controller){
 document.querySelectorAll('#savingio-brain-nav').forEach((el,i)=>{if(i)el.remove()});if(document.getElementById('savingio-brain-nav'))return;
 const source=await loadRecords(records),nav=document.createElement('aside');nav.id='savingio-brain-nav';
 nav.innerHTML='<button class="sbn-close" type="button" aria-label="탐색 닫기">×</button><div class="sbn-head"><strong>지금 어떤 문제가 있으세요?</strong><small>상황이나 찾는 글 제목을 입력해 보세요.</small></div><form class="sbn-search"><input type="search" placeholder="예: 아이, 세금, 장기수선충당금" autocomplete="off"></form><div class="sbn-search-status"></div><div class="sbn-tree"></div>';
 const input=nav.querySelector('input'),status=nav.querySelector('.sbn-search-status'),tree=nav.querySelector('.sbn-tree');
 const showCategories=()=>{status.textContent='카테고리를 선택하거나 검색해 글을 찾으세요';tree.innerHTML=CATEGORIES.map(cat=>{const items=source.filter(r=>r.category===cat);return `<details class="sbn-large"><summary><span class="sbn-large-title">${esc(cat)}</span><span class="sbn-count">${items.length}</span></summary><ul class="sbn-items">${items.map(r=>`<li><a href="${esc(r.href)}">${esc(r.title)}</a></li>`).join('')}</ul></details>`}).join('')};
 const showResults=ranked=>{status.textContent=`검색 결과 ${ranked.length}개`;tree.innerHTML=ranked.length?`<div class="sbn-results">${ranked.slice(0,30).map(({r})=>`<a class="sbn-result-card" href="${esc(r.href)}"><span class="sbn-result-path">${esc(r.category)}</span><strong>${esc(r.title)}</strong><span>${esc(r.desc||'관련 내용을 확인합니다.')}</span></a>`).join('')}</div>`:'<div class="sbn-empty">검색 결과가 없습니다.</div>'};
 const search=q=>q?showResults(rank(source,q)):showCategories();
 document.body.appendChild(nav);document.documentElement.classList.add('savingio-brain-ready');showCategories();
 input.addEventListener('input',()=>controller?controller.setQuery(input.value):search(input.value.trim()));
 nav.querySelector('form').addEventListener('submit',e=>e.preventDefault());
 addEventListener('savingio-unified-search',e=>{const d=e.detail||{};input.value=d.query||'';d.query?showResults(d.ranked||[]):showCategories()});
 const button=document.createElement('button');button.className='sbn-mobile-btn';button.type='button';button.textContent='문제 찾기';document.body.appendChild(button);
 const backdrop=document.createElement('div');backdrop.className='sbn-backdrop';document.body.appendChild(backdrop);
 const close=()=>document.body.classList.remove('sbn-open');button.onclick=()=>document.body.classList.add('sbn-open');nav.querySelector('.sbn-close').onclick=close;backdrop.onclick=close;
}
ensureCss();
if(document.readyState==='loading')await new Promise(r=>document.addEventListener('DOMContentLoaded',r,{once:true}));
installHeader();
const {grid,records}=collectDirectory();
const controller=initDirectory(grid,records);
await initExplorer(records,controller);
})();