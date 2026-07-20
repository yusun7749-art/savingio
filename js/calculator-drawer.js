(function(){
  const normalize=(value)=>String(value||'').toLowerCase().replace(/\s+/g,' ').trim();

  const installArticleSearchFix=()=>{
    const input=document.getElementById('articleSearch');
    const grid=document.getElementById('articleGrid');
    const count=document.getElementById('resultCount');
    if(!input||!grid||!count)return;

    const cards=[...grid.querySelectorAll('.article-card')];
    const buttons=[...document.querySelectorAll('.category-row button[data-cat]')];
    const pager=document.querySelector('.pager');
    const PAGE_SIZE=12;
    let page=1;
    let activeCategory='전체';

    const aliases={
      '보험':'금융 보험 실손 자동차보험 운전자보험 보장 보험료 환급금',
      '금융생활':'금융 은행 카드 보험 대출 신용 수수료',
      '은행':'금융 은행 수수료 통장 이체',
      '카드':'금융 카드 포인트 결제 수수료',
      '자동차':'자동차 교통 보험 과태료 범칙금 차량',
      '정부지원':'정부혜택 지원금 복지 장려금 바우처',
      '환급':'환급금 세금 보험 건강보험',
      '전기세':'전기요금 생활비 절약 에어컨',
      '관리비':'생활비 절약 관리비 아파트'
    };

    const expandedQuery=(raw)=>{
      const q=normalize(raw);
      const alias=Object.entries(aliases).find(([key])=>q.includes(key));
      return normalize(alias?`${q} ${alias[1]}`:q);
    };

    const cardText=(card)=>normalize([
      card.dataset.search,
      card.dataset.category,
      card.querySelector('h2')?.textContent,
      card.querySelector('p')?.textContent
    ].join(' '));

    const matchesQuery=(card,raw)=>{
      const q=expandedQuery(raw);
      if(!q)return true;
      const text=cardText(card);
      const tokens=q.split(' ').filter(Boolean);
      return tokens.some(token=>text.includes(token));
    };

    const matchesCategory=(card)=>activeCategory==='전체'||normalize(card.dataset.category)===normalize(activeCategory);

    const renderPager=(totalPages)=>{
      if(!pager)return;
      pager.innerHTML='';
      if(totalPages<=1){pager.hidden=true;return;}
      pager.hidden=false;
      for(let i=1;i<=totalPages;i++){
        const button=document.createElement('button');
        button.type='button';
        button.textContent=String(i);
        if(i===page)button.classList.add('active');
        button.addEventListener('click',()=>{page=i;render();window.scrollTo({top:Math.max(0,grid.offsetTop-120),behavior:'smooth'});});
        pager.append(button);
      }
    };

    const render=()=>{
      const filtered=cards.filter(card=>matchesCategory(card)&&matchesQuery(card,input.value));
      const totalPages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));
      if(page>totalPages)page=1;
      const start=(page-1)*PAGE_SIZE;
      const visible=new Set(filtered.slice(start,start+PAGE_SIZE));
      cards.forEach(card=>{card.hidden=!visible.has(card);card.style.display=visible.has(card)?'grid':'none';});
      count.textContent=`검색 결과 ${filtered.length}개`;
      renderPager(totalPages);
    };

    buttons.forEach(button=>button.addEventListener('click',(event)=>{
      event.preventDefault();
      activeCategory=button.dataset.cat||'전체';
      buttons.forEach(item=>item.classList.toggle('active',item===button));
      page=1;
      render();
    },true));

    input.addEventListener('input',()=>{page=1;render();},true);
    input.addEventListener('keydown',(event)=>{
      if(event.key!=='Enter')return;
      event.preventDefault();
      const visible=cards.filter(card=>!card.hidden&&card.style.display!=='none');
      if(visible.length===1)location.href=visible[0].href;
    },true);

    const params=new URLSearchParams(location.search);
    const q=params.get('q')||'';
    if(q){
      input.value=q;
      const categoryMap={'보험':'금융','금융':'금융','금융생활':'금융','자동차':'자동차·교통','교통':'자동차·교통','정부지원':'정부혜택','지원금':'정부혜택','생활비':'생활비 절약','전기세':'생활비 절약','세금':'세금·환급','환급':'세금·환급','급여':'직장·급여','연금':'연금·노후','아이':'아이·교육','교육':'아이·교육','주거':'주거'};
      const matched=Object.entries(categoryMap).find(([key])=>q.includes(key));
      if(matched){
        activeCategory=matched[1];
        buttons.forEach(button=>button.classList.toggle('active',button.dataset.cat===activeCategory));
      }
    }
    page=1;
    render();
    setTimeout(render,300);
  };

  const removeReleaseBadge=()=>{
    document.querySelectorAll('body *').forEach((element)=>{
      if(element.children.length)return;
      const text=(element.textContent||'').replace(/\s+/g,' ').trim();
      if(/V2\.177/i.test(text)||/RELEASE\s*READY/i.test(text))element.remove();
    });
  };

  const boot=()=>{removeReleaseBadge();installArticleSearchFix();};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
  new MutationObserver(removeReleaseBadge).observe(document.documentElement,{childList:true,subtree:true});

  const body=document.body;
  const trigger=document.querySelector('.sv-calc-trigger');
  const drawer=document.querySelector('.sv-calc-drawer');
  const backdrop=document.querySelector('.sv-calc-backdrop');
  const close=document.querySelector('.sv-drawer-close');
  if(!trigger||!drawer||!backdrop||!close)return;
  const open=()=>{body.classList.add('sv-calc-open');trigger.setAttribute('aria-expanded','true');drawer.setAttribute('aria-hidden','false');close.focus();};
  const shut=()=>{body.classList.remove('sv-calc-open');trigger.setAttribute('aria-expanded','false');drawer.setAttribute('aria-hidden','true');trigger.focus();};
  trigger.addEventListener('click',open);close.addEventListener('click',shut);backdrop.addEventListener('click',shut);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&body.classList.contains('sv-calc-open'))shut();});
})();