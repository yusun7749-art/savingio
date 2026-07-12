(()=>{
const DATA=window.SAVINGIO_BRAIN_DATA;if(!DATA||!DATA.tree)return;
const current=decodeURI(location.pathname.replace(/\/$/,'/index.html'));
const norm=p=>decodeURI(p.replace(/\/$/,'/index.html'));
function contains(group){return Object.values(group).flat().some(x=>norm(x.href)===current)}
const nav=document.createElement('aside');nav.id='savingio-brain-nav';nav.setAttribute('aria-label','Savingio 주제 탐색');
nav.innerHTML='<button class="sbn-close" aria-label="주제 탐색 닫기">×</button><div class="sbn-head"><strong>주제 탐색</strong><small>검색어를 몰라도 대분류부터 직접 찾아보세요</small></div><div class="sbn-search"><input type="search" placeholder="주제 안에서 찾기" aria-label="주제 탐색 검색"></div><div class="sbn-tree"></div>';
const tree=nav.querySelector('.sbn-tree');
function render(q=''){
 q=q.trim().toLowerCase();let out='';
 Object.entries(DATA.tree).forEach(([large,middles],li)=>{
  let inner='';let largeHas=false;
  Object.entries(middles).forEach(([middle,items])=>{
   const filtered=items.filter(x=>!q||(x.title+' '+large+' '+middle).toLowerCase().includes(q));
   if(!filtered.length)return; largeHas=true;
   const midCurrent=filtered.some(x=>norm(x.href)===current);
   inner+=`<details class="sbn-middle" ${(midCurrent||q)?'open':''}><summary>${middle}<span class="sbn-count">${filtered.length}</span></summary><ul class="sbn-items">${filtered.map(x=>`<li><a href="${x.href}" ${norm(x.href)===current?'aria-current="page"':''}><span class="sbn-type ${x.type==='calculator'?'calc':''}">${x.type==='calculator'?'계':'글'}</span><span>${x.title}</span></a></li>`).join('')}</ul></details>`;
  });
  if(largeHas){const open=contains(middles)||q||li===0;out+=`<details class="sbn-large" ${open?'open':''}><summary>${large}</summary>${inner}</details>`}
 });
 tree.innerHTML=out||'<div class="sbn-empty">일치하는 주제가 없습니다.</div>';
 const cur=tree.querySelector('[aria-current="page"]');if(cur)setTimeout(()=>cur.scrollIntoView({block:'center'}),80);
}
render();nav.querySelector('input').addEventListener('input',e=>render(e.target.value));
document.body.prepend(nav);document.documentElement.classList.add('savingio-brain-ready');
const btn=document.createElement('button');btn.className='sbn-mobile-btn';btn.textContent='주제 탐색';btn.setAttribute('aria-label','주제 탐색 열기');document.body.append(btn);
const back=document.createElement('div');back.className='sbn-backdrop';document.body.append(back);
const close=()=>document.body.classList.remove('sbn-open');btn.onclick=()=>document.body.classList.add('sbn-open');nav.querySelector('.sbn-close').onclick=close;back.onclick=close;
})();
