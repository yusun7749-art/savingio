(function(){
  const normalize=(value)=>String(value||'').toLowerCase().replace(/[·ㆍ/,_()\-]+/g,' ').replace(/\s+/g,' ').trim();

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

    const synonymGroups={
      '아이':['아이','아동','어린이','자녀','초등','학생','청소년','육아','양육','보육','돌봄','학부모','교육','학교','학원','방과후','출산','임신','영유아','기저귀','아동수당','자녀장려금','아이돌봄'],
      '교육':['교육','학교','학생','초등','중등','고등','학원','방과후','교육비','학자금','장학금','교복','급식','돌봄','학부모','자녀','아이'],
      '노인':['노인','어르신','고령자','시니어','60세','65세','노후','기초연금','노령연금','장기요양','경로'],
      '자동차':['자동차','차량','승용차','운전자','교통','주유','연비','자동차세','과태료','범칙금','렌터카','보험'],
      '보험':['보험','실손','실비','자동차보험','운전자보험','보험료','보장','해지환급금','중복가입'],
      '금융':['금융','은행','카드','대출','신용','통장','이체','수수료','포인트','캐시백','이자','상환'],
      '정부지원':['정부지원','정부혜택','지원금','복지','보조금','장려금','바우처','감면','수당','정부24','복지로'],
      '환급':['환급','환급금','과오납','과납','돌려받기','숨은돈','보험료환급','세금환급','건강보험환급'],
      '세금':['세금','세액','소득세','부가세','종합소득세','재산세','자동차세','연말정산','홈택스','국세','지방세','공제'],
      '생활비':['생활비','절약','전기요금','전기세','가스요금','수도요금','관리비','통신비','에너지','냉방비','난방비','자동이체'],
      '급여':['급여','월급','임금','실수령액','퇴직금','주휴수당','연차','근로','직장','고용','실업급여'],
      '연금':['연금','국민연금','기초연금','노령연금','추납','노후','연금수령'],
      '주거':['주거','주택','아파트','전세','월세','임대','관리비','재산세','토지','건축물','이사'],
      '생활정보':['생활정보','생활','건강','안전','일상','신청','조회','확인','방법','가이드']
    };

    const categoryTerms={
      '금융':['금융','은행','카드','대출','신용','보험','이자','수수료','포인트','캐시백','상환'],
      '생활비 절약':['생활비','절약','전기','가스','수도','관리비','통신비','에너지','냉방','난방','자동이체','요금'],
      '정부혜택':['정부혜택','정부지원','지원금','복지','보조금','장려금','바우처','수당','감면','정부24','복지로'],
      '세금·환급':['세금','환급','소득세','부가세','종합소득세','재산세','자동차세','연말정산','홈택스','공제','과오납'],
      '직장·급여':['직장','급여','월급','임금','근로','퇴직금','주휴수당','연차','고용','실업급여','실수령액'],
      '자동차·교통':['자동차','차량','교통','운전자','주유','연비','자동차세','과태료','범칙금','렌터카','자동차보험'],
      '연금·노후':['연금','노후','노인','어르신','고령자','기초연금','국민연금','노령연금','장기요양','60세','65세'],
      '아이·교육':['아이','아동','어린이','자녀','학생','초등','청소년','육아','양육','보육','돌봄','학부모','교육','학교','학원','방과후','출산','임신','영유아','아동수당','자녀장려금'],
      '주거':['주거','주택','아파트','전세','월세','임대','관리비','재산세','토지','건축물','이사'],
      '생활정보':['생활정보','생활','건강','안전','일상','신청','조회','확인','가이드']
    };

    const expandTokens=(raw)=>{
      const q=normalize(raw);
      if(!q)return [];
      const source=q.split(' ').filter(Boolean);
      const expanded=new Set(source);
      source.forEach(token=>{
        Object.entries(synonymGroups).forEach(([key,terms])=>{
          if(token.includes(key)||terms.some(term=>token.includes(normalize(term))||normalize(term).includes(token))){
            terms.forEach(term=>expanded.add(normalize(term)));
          }
        });
      });
      return [...expanded].filter(Boolean);
    };

    const cardText=(card)=>normalize([
      card.dataset.search,
      card.dataset.exactSearch,
      card.dataset.category,
      card.querySelector('h2')?.textContent,
      card.querySelector('p')?.textContent
    ].join(' '));

    const cardCategoryMatches=(card)=>{
      if(activeCategory==='전체')return true;
      const declared=normalize(card.dataset.category);
      const selected=normalize(activeCategory);
      if(declared===selected||declared.includes(selected)||selected.includes(declared))return true;
      const text=cardText(card);
      return (categoryTerms[activeCategory]||[]).some(term=>text.includes(normalize(term)));
    };

    const cardQueryMatches=(card,raw)=>{
      const tokens=expandTokens(raw);
      if(!tokens.length)return true;
      const text=cardText(card);
      return tokens.some(token=>token.length>1&&text.includes(token));
    };

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
      const filtered=cards.filter(card=>cardCategoryMatches(card)&&cardQueryMatches(card,input.value));
      const totalPages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));
      if(page>totalPages)page=1;
      const start=(page-1)*PAGE_SIZE;
      const visible=new Set(filtered.slice(start,start+PAGE_SIZE));
      cards.forEach(card=>{const show=visible.has(card);card.hidden=!show;card.style.display=show?'grid':'none';});
      count.textContent=`검색 결과 ${filtered.length}개`;
      renderPager(totalPages);
    };

    buttons.forEach(button=>button.addEventListener('click',(event)=>{
      event.preventDefault();
      event.stopImmediatePropagation();
      activeCategory=button.dataset.cat||'전체';
      buttons.forEach(item=>item.classList.toggle('active',item===button));
      page=1;
      render();
    },true));

    input.addEventListener('input',(event)=>{event.stopImmediatePropagation();page=1;render();},true);
    input.addEventListener('keydown',(event)=>{
      if(event.key!=='Enter')return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const visible=cards.filter(card=>!card.hidden&&card.style.display!=='none');
      if(visible.length===1)location.href=visible[0].href;
    },true);

    const params=new URLSearchParams(location.search);
    const q=params.get('q')||'';
    if(q)input.value=q;
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