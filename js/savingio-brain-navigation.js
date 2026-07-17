(()=>{
  'use strict';

  const DATA=window.SAVINGIO_BRAIN_DATA;
  if(!DATA||!DATA.tree||typeof DATA.tree!=='object')return;

  const normalizePath=(value)=>{
    let path=value||'/';
    try{path=decodeURI(path)}catch(_error){}
    path=path.split('?')[0].split('#')[0];
    path=path.replace(/\/index\.html$/,'/').replace(/\.html$/,'').replace(/\/$/,'');
    return path||'/';
  };

  const current=normalizePath(location.pathname);
  const isCurrent=(item)=>item&&normalizePath(item.href)===current;
  const esc=(value)=>String(value??'').replace(/[&<>"']/g,(char)=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[char]);

  const nav=document.createElement('aside');
  nav.id='savingio-brain-nav';
  nav.setAttribute('aria-label','Savingio 주제 탐색');
  nav.innerHTML=`
    <button class="sbn-close" type="button" aria-label="주제 탐색 닫기">×</button>
    <div class="sbn-head">
      <strong>문제 해결 탐색</strong>
      <small>지금 하려는 일부터 선택하세요.</small>
    </div>
    <div class="sbn-search">
      <input type="search" placeholder="예: 전기세, 환급금, 퇴직금" aria-label="Savingio 문제 해결 검색" autocomplete="off">
    </div>
    <div class="sbn-tree"></div>`;

  const tree=nav.querySelector('.sbn-tree');
  const search=nav.querySelector('input');

  function validItems(items){
    return Array.isArray(items)
      ? items.filter((item)=>item&&typeof item.title==='string'&&typeof item.href==='string')
      : [];
  }

  const compactSearch=(value)=>String(value||'').toLowerCase().replace(/[^0-9a-z가-힣]+/gi,'');

  function render(query=''){
    const q=compactSearch(query);
    let html='';

    Object.entries(DATA.tree).forEach(([large,middles])=>{
      const largeMeta=(DATA.largeMeta&&DATA.largeMeta[large])||{};
      if(!middles||typeof middles!=='object')return;
      let middleHtml='';
      let largeHasMatch=false;
      let largeIsCurrent=false;

      Object.entries(middles).forEach(([middle,smalls])=>{
        if(!smalls||typeof smalls!=='object')return;
        let smallHtml='';
        let middleHasMatch=false;
        let middleIsCurrent=false;

        Object.entries(smalls).forEach(([small,rawItems])=>{
          const items=validItems(rawItems);
          const filtered=items.filter((item)=>{
            if(!q)return true;
            return compactSearch(`${item.title} ${item.search_keywords||''} ${large} ${middle} ${small}`).includes(q);
          });
          if(!filtered.length)return;

          const smallIsCurrent=items.some(isCurrent);
          largeHasMatch=middleHasMatch=true;
          if(smallIsCurrent)largeIsCurrent=middleIsCurrent=true;

          const links=filtered.map((item)=>{
            const currentAttr=isCurrent(item)?' aria-current="page"':'';
            const isCalculator=item.type==='calculator';
            return `<li><a href="${esc(item.href)}"${currentAttr}><span class="sbn-type${isCalculator?' calc':''}">${isCalculator?'계':'글'}</span><span>${esc(item.title)}</span></a></li>`;
          }).join('');

          smallHtml+=`<details class="sbn-small"${(smallIsCurrent||q)?' open':''}><summary>${esc(small)}<span class="sbn-count">${filtered.length}</span></summary><ul class="sbn-items">${links}</ul></details>`;
        });

        if(middleHasMatch){
          middleHtml+=`<details class="sbn-middle"${(middleIsCurrent||q)?' open':''}><summary>${esc(middle)}</summary>${smallHtml}</details>`;
        }
      });

      if(largeHasMatch){
        html+=`<details class="sbn-large"${(largeIsCurrent||q)?' open':''}><summary><span class="sbn-large-title">${esc(large)}</span>${largeMeta.description?`<span class="sbn-large-desc">${esc(largeMeta.description)}</span>`:''}</summary>${middleHtml}</details>`;
      }
    });

    tree.innerHTML=html||'<div class="sbn-empty">일치하는 주제가 없습니다.</div>';

    if(!q){
      tree.querySelectorAll('.sbn-large').forEach((details)=>{
        details.addEventListener('toggle',()=>{
          if(!details.open)return;
          tree.querySelectorAll('.sbn-large[open]').forEach((other)=>{
            if(other!==details&&!other.querySelector('[aria-current="page"]'))other.open=false;
          });
        });
      });
    }

    const currentLink=tree.querySelector('[aria-current="page"]');
    if(currentLink){
      requestAnimationFrame(()=>{
        const treeRect=tree.getBoundingClientRect();
        const linkRect=currentLink.getBoundingClientRect();
        const target=tree.scrollTop+(linkRect.top-treeRect.top)-((tree.clientHeight-linkRect.height)/2);
        tree.scrollTo({top:Math.max(0,target),behavior:'auto'});
      });
    }
  }

  document.body.prepend(nav);
  document.documentElement.classList.add('savingio-brain-ready');
  render();

  search.addEventListener('input',(event)=>render(event.target.value));

  const button=document.createElement('button');
  button.className='sbn-mobile-btn';
  button.type='button';
  button.textContent='주제 탐색';
  button.setAttribute('aria-label','주제 탐색 열기');
  document.body.append(button);

  const backdrop=document.createElement('div');
  backdrop.className='sbn-backdrop';
  document.body.append(backdrop);

  const close=()=>{
    document.body.classList.remove('sbn-open');
    button.setAttribute('aria-expanded','false');
  };
  const open=()=>{
    document.body.classList.add('sbn-open');
    button.setAttribute('aria-expanded','true');
  };

  button.setAttribute('aria-expanded','false');
  button.addEventListener('click',open);
  nav.querySelector('.sbn-close').addEventListener('click',close);
  backdrop.addEventListener('click',close);
  document.addEventListener('keydown',(event)=>{if(event.key==='Escape')close()});
  nav.addEventListener('click',(event)=>{
    if(event.target.closest('a')&&matchMedia('(max-width:1180px)').matches)close();
  });
})();
