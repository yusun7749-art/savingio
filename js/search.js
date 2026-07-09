
(function(){
  const searchInput=document.querySelector('#articleSearch');
  const categorySelect=document.querySelector('#categoryFilter');
  const resultCount=document.querySelector('#resultCount');
  const cards=[...document.querySelectorAll('[data-article]')];
  const pills=[...document.querySelectorAll('[data-filter]')];
  let activeCategory='all';
  function apply(){
    const q=(searchInput?.value||'').toLowerCase().trim();
    activeCategory=categorySelect?.value||activeCategory;
    let visible=0;
    cards.forEach(card=>{
      const matchText=card.textContent.toLowerCase().includes(q);
      const matchCat=activeCategory==='all'||card.dataset.category===activeCategory;
      const show=matchText&&matchCat;
      card.style.display=show?'block':'none';
      if(show) visible++;
    });
    if(resultCount) resultCount.textContent=`${visible} guide${visible===1?'':'s'} found`;
    pills.forEach(btn=>btn.classList.toggle('active',btn.dataset.filter===activeCategory));
  }
  function setCategory(cat){
    activeCategory=cat;
    if(categorySelect) categorySelect.value=cat;
    apply();
  }
  searchInput?.addEventListener('input',apply);
  categorySelect?.addEventListener('change',()=>setCategory(categorySelect.value));
  pills.forEach(btn=>btn.addEventListener('click',()=>setCategory(btn.dataset.filter)));
  const params=new URLSearchParams(location.search);
  if(params.get('category')) setCategory(params.get('category'));
  else apply();
})();
