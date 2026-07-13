(() => {
  const DATA_URL = '/data/site-navigation.json';
  const current = decodeURI(location.pathname.replace(/\/+$/, '') || '/');
  const normalize = value => decodeURI(String(value || '').replace(/https?:\/\/[^/]+/i, '').replace(/\/+$/, '') || '/');

  function ensureExplorerShell() {
    let shell = document.querySelector('[data-savingio-explorer-shell]');
    if (shell) return shell;
    shell = document.createElement('aside');
    shell.className = 'savingio-site-explorer';
    shell.setAttribute('data-savingio-explorer-shell','');
    shell.innerHTML = `<div class="savingio-explorer-head"><div><strong>주제 탐색</strong><small>검색어를 몰라도 직접 찾아보세요</small></div><button type="button" data-savingio-explorer-close aria-label="닫기">×</button></div><nav data-site-explorer aria-label="Savingio 주제 탐색"><p class="savingio-explorer-loading">목차를 불러오는 중입니다.</p></nav>`;
    document.body.insertAdjacentElement('afterbegin', shell);
    const backdrop=document.createElement('button');
    backdrop.type='button'; backdrop.className='savingio-explorer-backdrop'; backdrop.setAttribute('data-savingio-explorer-close',''); backdrop.setAttribute('aria-label','탐색 메뉴 닫기');
    document.body.insertAdjacentElement('afterbegin',backdrop);
    if (!document.querySelector('[data-savingio-explorer-toggle]')) {
      const toggle=document.createElement('button');
      toggle.type='button'; toggle.className='savingio-explorer-fab'; toggle.setAttribute('data-savingio-explorer-toggle',''); toggle.textContent='☰ 주제 탐색';
      document.body.append(toggle);
    }
    document.body.classList.add('has-savingio-explorer');
    return shell;
  }

  function isItemArray(value){ return Array.isArray(value) && value.every(item => Array.isArray(item) && item.length >= 2); }
  function branchContains(node){
    if (isItemArray(node)) return node.some(([,url]) => normalize(url) === current);
    if (node && typeof node === 'object') return Object.values(node).some(branchContains);
    return false;
  }
  function renderItems(items){
    return `<ul class="savingio-explorer-items">${items.map(([label,url])=>{const active=normalize(url)===current;return `<li><a href="${url}" ${active?'aria-current="page" class="is-current"':''}>${label}</a></li>`}).join('')}</ul>`;
  }
  function renderTree(tree){
    const entries=Object.entries(tree || {});
    return entries.map(([large,middles],li)=>{
      const largeOpen=branchContains(middles) || li===0;
      return `<details class="savingio-explorer-large" ${largeOpen?'open':''}><summary>${large}</summary><div class="savingio-explorer-large-body">${Object.entries(middles).map(([middle,smalls])=>{
        const middleOpen=branchContains(smalls);
        return `<details class="savingio-explorer-middle" ${middleOpen?'open':''}><summary>${middle}</summary><div class="savingio-explorer-middle-body">${Object.entries(smalls).map(([small,items])=>{
          const smallOpen=branchContains(items);
          return `<details class="savingio-explorer-small" ${smallOpen?'open':''}><summary>${small}</summary>${renderItems(items)}</details>`;
        }).join('')}</div></details>`;
      }).join('')}</div></details>`;
    }).join('');
  }

  async function loadExplorer(){
    const shell=ensureExplorerShell();
    const explorer=shell.querySelector('[data-site-explorer]');
    try{
      const res=await fetch(DATA_URL,{cache:'no-store'});
      if(!res.ok) throw new Error(`HTTP ${res.status}`);
      const data=await res.json();
      const tree=data.tree || data;
      explorer.innerHTML=renderTree(tree);
      const active=explorer.querySelector('[aria-current="page"]');
      if(active) setTimeout(()=>active.scrollIntoView({block:'center'}),0);
    }catch(err){
      explorer.innerHTML='<p class="savingio-explorer-error">주제 탐색을 불러오지 못했습니다.</p>';
      console.error('[Savingio Explorer]',err);
    }
  }

  document.addEventListener('click',event=>{
    if(event.target.closest('[data-savingio-explorer-toggle]')) document.body.classList.add('savingio-explorer-open');
    if(event.target.closest('[data-savingio-explorer-close]')) document.body.classList.remove('savingio-explorer-open');
  });
  document.addEventListener('keydown',event=>{if(event.key==='Escape') document.body.classList.remove('savingio-explorer-open')});
  loadExplorer();
})();
