(()=>{
'use strict';
const DATA_URL='/data/savingio-brain-data.json?v=20260731-directory2';
const PAGE_SIZE=12;
const ALIASES={
 '누쉬':['누수','물샘','천장누수','벽누수'],'누쑤':['누수','물샘','천장누수'],'누스':['누수','물샘'],'물샘':['누수','천장누수','배관누수'],
 '장충금':['장기수선충당금','장기수선','관리비'],'장기충당금':['장기수선충당금','장기수선','관리비'],
 '차보험':['자동차보험','자동차사고','사고접수','보험처리'],'사고보험':['자동차보험','자동차사고','사고접수','보험처리'],
 '자동차보험':['자동차보험','자동차사고','사고접수','보험처리','대인','대물','마일리지'],
 '전기세':['전기요금','전기세','누진제','전력사용량'],'전기':['전기요금','전기세','에어컨','냉방비'],
 '돌려받을돈':['환급','미환급금','국세환급','지방세환급','건강보험환급'],'환급':['환급','미환급금','국세환급','지방세환급','건강보험환급'],
 '카드포인트':['카드포인트','포인트현금화','캐시백','카드혜택'],'캐시백':['캐시백','카드포인트','전월실적','적립한도'],
 '과태료':['과태료','범칙금','벌점','교통위반','주정차','속도위반'],'계약':['계약','임대차','전세','월세','보증금','갱신','해지'],
 '관리비':['관리비','장기수선충당금','아파트관리비'],'지원금':['정부지원','정부혜택','지원금','보조금','복지','바우처']
};
const clean=v=>String(v??'').toLowerCase().normalize('NFKC').replace(/[^0-9a-z가-힣]+/gi,'');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function flatten(data){const out=[],seen=new Set();Object.entries(data.tree||{}).forEach(([large,middles])=>Object.entries(middles||{}).forEach(([middle,smalls])=>Object.entries(smalls||{}).forEach(([small,items])=>(items||[]).forEach(item=>{if(!item?.title||!item?.href||item.type==='hub'||seen.has(item.href))return;seen.add(item.href);out.push({title:item.title,href:item.href,category:middle,large,small,description:item.description||'',keywords:item.search_keywords||'',exact:Array.isArray(item.exact_queries)?item.exact_queries.join(' '):(item.exact_queries||'')});}))));return out;}
function terms(query){const q=clean(query);if(!q)return[];return [...new Set([q,...(ALIASES[q]||[]).map(clean)])];}
function score(r,query){const q=clean(query);if(!q)return 1;const ts=terms(query),title=clean(r.title),exact=clean(r.exact),keywords=clean(r.keywords),desc=clean(r.description),path=clean(`${r.large} ${r.category} ${r.small}`),href=clean(r.href);let best=0;for(const t of ts){if(!t)continue;if(title===t)best=Math.max(best,100000);else if(title.startsWith(t))best=Math.max(best,80000);else if(title.includes(t))best=Math.max(best,65000);else if(exact.includes(t))best=Math.max(best,50000);else if(keywords.includes(t))best=Math.max(best,25000);else if(desc.includes(t))best=Math.max(best,12000);else if(path.includes(t))best=Math.max(best,7000);else if(href.includes(t))best=Math.max(best,3000);}return best;}
async function init(){const grid=document.getElementById('articleGrid'),input=document.getElementById('articleSearch'),count=document.getElementById('resultCount'),pager=document.querySelector('.pager'),form=document.getElementById('directorySearchForm');if(!grid||!input||!count)return;let records=[];try{const res=await fetch(DATA_URL,{cache:'no-store'});if(!res.ok)throw new Error(String(res.status));records=flatten(await res.json());}catch(e){count.textContent='정보를 불러오지 못했습니다.';grid.innerHTML='<p>잠시 후 다시 시도해 주세요.</p>';return;}let query=new URLSearchParams(location.search).get('q')||'',page=1;function render(){const rows=records.map((r,i)=>({r,i,s:score(r,query)})).filter(x=>!query||x.s>0).sort((a,b)=>b.s-a.s||a.i-b.i),pages=Math.max(1,Math.ceil(rows.length/PAGE_SIZE));page=Math.min(page,pages);const visible=rows.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);grid.innerHTML=visible.map(({r})=>`<a class="article-card" href="${esc(r.href)}"><span class="card-category">${esc(r.category||r.large||'생활정보')}</span><h2>${esc(r.title)}</h2><p>${esc(r.description||'관련 내용을 확인합니다.')}</p><b>읽기 →</b></a>`).join('')||'<p>검색 결과가 없습니다. 다른 표현으로 검색해 보세요.</p>';count.textContent=query?`“${query}” 검색 결과 ${rows.length}개`:`전체 생활정보 ${rows.length}개`;pager.innerHTML=pages>1?Array.from({length:pages},(_,i)=>`<button type="button" data-page="${i+1}" class="${i+1===page?'active':''}">${i+1}</button>`).join(''):'';input.value=query;const u=new URL(location.href);query?u.searchParams.set('q',query):u.searchParams.delete('q');history.replaceState(null,'',u.pathname+u.search);}
function searchNow(){query=input.value.trim();page=1;render();}form?.addEventListener('submit',e=>{e.preventDefault();searchNow();});input.addEventListener('input',()=>{clearTimeout(input._t);input._t=setTimeout(searchNow,180);});pager?.addEventListener('click',e=>{const b=e.target.closest('button[data-page]');if(!b)return;page=Number(b.dataset.page)||1;render();scrollTo({top:Math.max(0,grid.offsetTop-110),behavior:'smooth'});});render();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();