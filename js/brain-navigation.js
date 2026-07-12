(() => {
  if (document.querySelector('[data-site-explorer]') || document.querySelector('.sv-brain-sidebar')) return;
  const current = location.pathname.replace(/\/$/, '') || '/';
  const sidebar = document.createElement('aside');
  sidebar.className = 'sv-brain-sidebar';
  sidebar.setAttribute('aria-label','Savingio 주제 탐색');
  sidebar.innerHTML = `<div class="sv-brain-head"><div><strong>주제 탐색</strong><small>검색어를 몰라도 직접 찾아보세요</small></div><button class="sv-brain-close" type="button" aria-label="주제 탐색 닫기">×</button></div><nav class="sv-brain-tree" aria-label="대분류 중분류 소분류"><div class="sv-brain-error">목차를 불러오는 중입니다.</div></nav>`;
  const backdrop = document.createElement('div'); backdrop.className='sv-brain-backdrop';
  document.body.prepend(backdrop); document.body.prepend(sidebar); document.body.classList.add('sv-brain-enabled');
  const nav = document.querySelector('header .nav, header nav, header');
  if (nav) {
    const button=document.createElement('button'); button.type='button'; button.className='sv-brain-toggle'; button.innerHTML='☰ <span>주제 탐색</span>'; button.setAttribute('aria-expanded','false');
    const links=nav.querySelector('.navlinks'); nav.insertBefore(button, links || nav.lastChild);
    button.addEventListener('click',()=>toggle(true));
  }
  function toggle(open){document.body.classList.toggle('sv-brain-open',open);const b=document.querySelector('.sv-brain-toggle');if(b)b.setAttribute('aria-expanded',String(open));}
  sidebar.querySelector('.sv-brain-close').addEventListener('click',()=>toggle(false)); backdrop.addEventListener('click',()=>toggle(false));
  document.addEventListener('keydown',e=>{if(e.key==='Escape')toggle(false)});
  fetch('/data/brain-navigation.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error();return r.json()}).then(tree=>{
    const html=Object.entries(tree).map(([major,middles],idx)=>{
      const hasCurrent=Object.values(middles).flat().some(item=>(item.url.replace(/\/$/,'')||'/')===current);
      return `<details class="sv-brain-major" ${(hasCurrent||idx===0)?'open':''}><summary>${major}</summary>${Object.entries(middles).map(([middle,items])=>`<div class="sv-brain-middle"><span class="sv-brain-middle-title">${middle}</span><ul class="sv-brain-list">${items.map(item=>{const u=item.url.replace(/\/$/,'')||'/';const icon=item.type==='calculator'?'계':item.type==='category'?'분':'글';return `<li><a href="${item.url}" data-kind="${item.type||'article'}" ${u===current?'aria-current="page"':''}><span class="sv-brain-kind">${icon}</span><span>${item.label}</span></a></li>`}).join('')}</ul></div>`).join('')}</details>`
    }).join('');
    sidebar.querySelector('.sv-brain-tree').innerHTML=html;
    const active=sidebar.querySelector('[aria-current="page"]'); if(active) active.scrollIntoView({block:'center'});
  }).catch(()=>{sidebar.querySelector('.sv-brain-tree').innerHTML='<p class="sv-brain-error">주제 탐색을 불러오지 못했습니다.</p>'});
})();
