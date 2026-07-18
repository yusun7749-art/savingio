(async()=>{
  'use strict';

  const installProblemPathFix=()=>{
    if(!document.getElementById('savingio-problem-path-fix')){
      const style=document.createElement('style');
      style.id='savingio-problem-path-fix';
      style.textContent=`
        .savingio-problem-path{margin:48px 0 34px!important;padding:28px!important;border:1px solid #dbe5f3!important;border-radius:22px!important;background:linear-gradient(180deg,#f8fbff 0%,#fff 100%)!important;box-shadow:0 12px 30px rgba(23,105,255,.06)!important}
        .savingio-problem-path>h2{margin:0 0 8px!important;font-size:clamp(25px,3vw,32px)!important;line-height:1.3!important;letter-spacing:-.7px!important}
        .savingio-problem-path>p{margin:0 0 20px!important;color:#667085!important;line-height:1.65!important}
        .savingio-path-steps{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:12px!important}
        .savingio-path-step{display:flex!important;flex-direction:column!important;justify-content:space-between!important;min-width:0!important;min-height:116px!important;padding:18px!important;border:1px solid #dbe5f3!important;border-radius:16px!important;background:#fff!important;color:#25324b!important;text-decoration:none!important;line-height:1.45!important;box-shadow:0 4px 14px rgba(15,23,42,.03)!important;transition:border-color .18s ease,box-shadow .18s ease,transform .18s ease!important}
        .savingio-path-step:hover{border-color:#1769ff!important;box-shadow:0 10px 24px rgba(23,105,255,.11)!important;transform:translateY(-2px)!important}
        .savingio-path-step strong{display:-webkit-box!important;overflow:hidden!important;color:#183153!important;font-size:16px!important;line-height:1.45!important;-webkit-box-orient:vertical!important;-webkit-line-clamp:2!important}
        .savingio-path-step span{display:inline-flex!important;align-self:flex-start!important;margin-top:12px!important;padding:5px 9px!important;border-radius:999px!important;background:#f1f5f9!important;color:#64748b!important;font-size:12px!important;font-weight:700!important}
        .savingio-path-step[aria-current="step"]{border-color:#1769ff!important;background:#eef4ff!important;box-shadow:0 8px 22px rgba(23,105,255,.12)!important}
        .savingio-path-step[aria-current="step"] strong{color:#0f58d5!important}
        .savingio-path-step[aria-current="step"] span{background:#1769ff!important;color:#fff!important}
        @media(max-width:720px){.savingio-problem-path{padding:20px!important}.savingio-path-steps{grid-template-columns:1fr!important}.savingio-path-step{min-height:0!important}}
      `;
      document.head.append(style);
    }

    document.querySelectorAll('.savingio-problem-path').forEach((section)=>{
      if(section.dataset.compacted==='true')return;
      const container=section.querySelector('.savingio-path-steps');
      if(!container)return;
      const links=[...container.querySelectorAll('.savingio-path-step')];
      if(links.length<=6){section.dataset.compacted='true';return;}
      const currentIndex=links.findIndex((link)=>link.getAttribute('aria-current')==='step');
      const preferred=[];
      const add=(index)=>{if(index>=0&&index<links.length&&!preferred.includes(links[index]))preferred.push(links[index])};
      add(currentIndex);
      add(currentIndex-1);
      add(currentIndex+1);
      add(currentIndex-2);
      add(currentIndex+2);
      links.forEach((link)=>{if(preferred.length<6&&!preferred.includes(link))preferred.push(link)});
      container.replaceChildren(...preferred.slice(0,6));
      const note=section.querySelector(':scope > p');
      if(note)note.textContent='현재 글과 바로 이어서 확인할 핵심 단계만 정리했습니다. 필요한 항목을 카드별로 선택하세요.';
      section.dataset.compacted='true';
    });
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installProblemPathFix,{once:true});
  else installProblemPathFix();

  if(document.getElementById('savingio-brain-nav'))return;
  let DATA=window.SAVINGIO_BRAIN_DATA;
  if(!DATA||!DATA.tree||typeof DATA.tree!=='object'){
    try{
      const response=await fetch('/data/savingio-brain-data.json?v=12',{cache:'no-store'});
      if(!response.ok)return;
      DATA=await response.json();
      window.SAVINGIO_BRAIN_DATA=DATA;
    }catch(_error){return;}
  }

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
    <div class="sbn-head"><strong>문제 해결 탐색</strong><small>지금 하려는 일부터 선택하세요.</small></div>
    <div class="sbn-search"><input type="search" placeholder="예: 전기세, 환급금, 퇴직금" aria-label="Savingio 문제 해결 검색" autocomplete="off"></div>
    <div class="sbn-tree"></div>`;

  const tree=nav.querySelector('.sbn-tree');
  const search=nav.querySelector('input');
  const validItems=(items)=>Array.isArray(items)?items.filter((item)=>item&&typeof item.title==='string'&&typeof item.href==='string'):[];
  const normalize=(value)=>String(value||'').toLowerCase().replace(/[^0-9a-z가-힣]+/gi,'');
  const grams=(value)=>{const text=normalize(value),out=[];for(let i=0;i<text.length-1;i++)out.push(text.slice(i,i+2));return out};
  const similarity=(left,right)=>{const a=grams(left),b=grams(right);if(!a.length||!b.length)return normalize(left)===normalize(right)?1:0;const pool=[...b];let hits=0;a.forEach((x)=>{const i=pool.indexOf(x);if(i>=0){hits++;pool.splice(i,1)}});return 2*hits/(a.length+b.length)};
  const score=(item,query)=>{const q=normalize(query);if(!q)return 1;const title=normalize(item.title),keywords=normalize(item.keywords);const rawExact=Array.isArray(item.exactQueries)?item.exactQueries:[item.exactQueries];const exact=rawExact.map(normalize).filter(Boolean);if(exact.includes(q))return 1000;if(title===q)return 900;if(title.startsWith(q))return 700;if(title.includes(q))return 600;if(keywords.includes(q))return 400;const fuzzy=Math.max(0,...[...exact,title].filter(Boolean).map((value)=>similarity(value,q)));return q.length>=3&&fuzzy>=.56?200+Math.round(fuzzy*100):0};

  function render(query=''){
    const q=normalize(query);
    let html='';
    Object.entries(DATA.tree).forEach(([large,middles])=>{
      const largeMeta=(DATA.largeMeta&&DATA.largeMeta[large])||{};
      if(!middles||typeof middles!=='object')return;
      let middleHtml='',largeHasMatch=false,largeIsCurrent=false;
      Object.entries(middles).forEach(([middle,smalls])=>{
        if(!smalls||typeof smalls!=='object')return;
        let smallHtml='',middleHasMatch=false,middleIsCurrent=false;
        Object.entries(smalls).forEach(([small,rawItems])=>{
          const items=validItems(rawItems);
          const filtered=items.map((item)=>({item,score:score({title:item.title,keywords:`${item.search_keywords||''} ${large} ${middle} ${small}`,exactQueries:item.exact_queries||[]},query)})).filter(({score})=>!q||score>0).sort((a,b)=>b.score-a.score).map(({item})=>item);
          if(!filtered.length)return;
          const smallIsCurrent=items.some(isCurrent);
          largeHasMatch=middleHasMatch=true;
          if(smallIsCurrent)largeIsCurrent=middleIsCurrent=true;
          const links=filtered.map((item)=>{const currentAttr=isCurrent(item)?' aria-current="page"':'';const isCalculator=item.type==='calculator';return `<li><a href="${esc(item.href)}"${currentAttr}><span class="sbn-type${isCalculator?' calc':''}">${isCalculator?'계':'글'}</span><span>${esc(item.title)}</span></a></li>`}).join('');
          smallHtml+=`<details class="sbn-small"${(smallIsCurrent||q)?' open':''}><summary>${esc(small)}<span class="sbn-count">${filtered.length}</span></summary><ul class="sbn-items">${links}</ul></details>`;
        });
        if(middleHasMatch)middleHtml+=`<details class="sbn-middle"${(middleIsCurrent||q)?' open':''}><summary>${esc(middle)}</summary>${smallHtml}</details>`;
      });
      if(largeHasMatch)html+=`<details class="sbn-large"${(largeIsCurrent||q)?' open':''}><summary><span class="sbn-large-title">${esc(large)}</span>${largeMeta.description?`<span class="sbn-large-desc">${esc(largeMeta.description)}</span>`:''}</summary>${middleHtml}</details>`;
    });
    tree.innerHTML=html||'<div class="sbn-empty">일치하는 주제가 없습니다.</div>';
    if(!q)tree.querySelectorAll('.sbn-large').forEach((details)=>details.addEventListener('toggle',()=>{if(!details.open)return;tree.querySelectorAll('.sbn-large[open]').forEach((other)=>{if(other!==details&&!other.querySelector('[aria-current="page"]'))other.open=false})}));
    const currentLink=tree.querySelector('[aria-current="page"]');
    if(currentLink)requestAnimationFrame(()=>{const treeRect=tree.getBoundingClientRect(),linkRect=currentLink.getBoundingClientRect();const target=tree.scrollTop+(linkRect.top-treeRect.top)-((tree.clientHeight-linkRect.height)/2);tree.scrollTo({top:Math.max(0,target),behavior:'auto'})});
  }

  document.body.prepend(nav);
  document.documentElement.classList.add('savingio-brain-ready');
  render();
  search.addEventListener('input',(event)=>render(event.target.value));

  const button=document.createElement('button');
  button.className='sbn-mobile-btn';button.type='button';button.textContent='주제 탐색';button.setAttribute('aria-label','주제 탐색 열기');document.body.append(button);
  const backdrop=document.createElement('div');backdrop.className='sbn-backdrop';document.body.append(backdrop);
  const close=()=>{document.body.classList.remove('sbn-open');button.setAttribute('aria-expanded','false')};
  const open=()=>{document.body.classList.add('sbn-open');button.setAttribute('aria-expanded','true')};
  button.setAttribute('aria-expanded','false');button.addEventListener('click',open);nav.querySelector('.sbn-close').addEventListener('click',close);backdrop.addEventListener('click',close);document.addEventListener('keydown',(event)=>{if(event.key==='Escape')close()});nav.addEventListener('click',(event)=>{if(event.target.closest('a')&&matchMedia('(max-width:1180px)').matches)close()});
})();