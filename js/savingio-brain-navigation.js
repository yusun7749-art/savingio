(()=>{
'use strict';

const init=()=>{
  if(document.getElementById('savingio-brain-nav')) return;

  const DATA=window.SAVINGIO_BRAIN_DATA;
  const normalizePath=(p)=>{
    try{p=decodeURI(p||'')}catch(e){}
    p=String(p||'').split('?')[0].split('#')[0]
      .replace(/\/index\.html$/,'/')
      .replace(/\.html$/,'')
      .replace(/\/$/,'');
    return p||'/';
  };
  const current=normalizePath(location.pathname);
  const isCurrent=(x)=>x&&normalizePath(x.href)===current;

  const nav=document.createElement('aside');
  nav.id='savingio-brain-nav';
  nav.setAttribute('aria-label','Savingio 주제 탐색');
  nav.innerHTML='<button class="sbn-close" type="button" aria-label="주제 탐색 닫기">×</button><div class="sbn-head"><a class="sbn-home" href="/">Savingio</a><strong>주제 탐색</strong><small>대분류부터 필요한 정보를 찾아보세요</small></div><div class="sbn-search"><input type="search" placeholder="주제 안에서 찾기" aria-label="주제 탐색 검색"></div><div class="sbn-tree" aria-live="polite"></div>';

  const tree=nav.querySelector('.sbn-tree');
  const source=DATA&&DATA.tree&&typeof DATA.tree==='object'?DATA.tree:{};

  const esc=(value)=>String(value??'').replace(/[&<>"']/g,(ch)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

  function render(query=''){
    const q=String(query).trim().toLowerCase();
    let out='';
    let largeIndex=0;

    Object.entries(source).forEach(([large,middles])=>{
      if(!middles||typeof middles!=='object') return;
      let middleHtml='';
      let largeHas=false;
      let largeCurrent=false;

      Object.entries(middles).forEach(([middle,smalls])=>{
        if(!smalls||typeof smalls!=='object') return;
        let smallHtml='';
        let middleHas=false;
        let middleCurrent=false;

        Object.entries(smalls).forEach(([small,items])=>{
          if(!Array.isArray(items)) return;
          const filtered=items.filter((x)=>{
            if(!x||!x.href||!x.title) return false;
            return !q||`${x.title} ${large} ${middle} ${small}`.toLowerCase().includes(q);
          });
          if(!filtered.length) return;

          middleHas=true;
          largeHas=true;
          const smallCurrent=filtered.some(isCurrent);
          if(smallCurrent){middleCurrent=true;largeCurrent=true;}

          smallHtml+=`<details class="sbn-small" ${(smallCurrent||q)?'open':''}><summary>${esc(small)}<span class="sbn-count">${filtered.length}</span></summary><ul class="sbn-items">${filtered.map((x)=>`<li><a href="${esc(x.href)}" ${isCurrent(x)?'aria-current="page"':''}><span class="sbn-type ${x.type==='calculator'?'calc':''}">${x.type==='calculator'?'계':'글'}</span><span>${esc(x.title)}</span></a></li>`).join('')}</ul></details>`;
        });

        if(middleHas) middleHtml+=`<details class="sbn-middle" ${(middleCurrent||q)?'open':''}><summary>${esc(middle)}</summary>${smallHtml}</details>`;
      });

      if(largeHas){
        out+=`<details class="sbn-large" ${(largeCurrent||q||largeIndex===0)?'open':''}><summary>${esc(large)}</summary>${middleHtml}</details>`;
        largeIndex+=1;
      }
    });

    tree.innerHTML=out||'<div class="sbn-empty">탐색 데이터를 불러오지 못했습니다. 페이지를 새로고침해 주세요.</div>';
    const cur=tree.querySelector('[aria-current="page"]');
    if(cur) requestAnimationFrame(()=>cur.scrollIntoView({block:'center'}));
  }

  document.body.insertBefore(nav,document.body.firstChild);
  document.documentElement.classList.add('savingio-brain-ready');
  render();

  const input=nav.querySelector('input');
  input.addEventListener('input',(e)=>render(e.target.value));

  const btn=document.createElement('button');
  btn.type='button';
  btn.className='sbn-mobile-btn';
  btn.textContent='주제 탐색';
  btn.setAttribute('aria-label','주제 탐색 열기');
  document.body.appendChild(btn);

  const back=document.createElement('div');
  back.className='sbn-backdrop';
  document.body.appendChild(back);

  const close=()=>{
    document.body.classList.remove('sbn-open');
    btn.setAttribute('aria-expanded','false');
  };
  btn.setAttribute('aria-expanded','false');
  btn.addEventListener('click',()=>{
    document.body.classList.add('sbn-open');
    btn.setAttribute('aria-expanded','true');
  });
  nav.querySelector('.sbn-close').addEventListener('click',close);
  back.addEventListener('click',close);
  document.addEventListener('keydown',(e)=>{if(e.key==='Escape')close();});
};

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
})();
