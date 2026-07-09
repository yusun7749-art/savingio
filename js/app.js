
function filterArticles(category){
  const cards=[...document.querySelectorAll('[data-category]')];
  const buttons=[...document.querySelectorAll('.category-row button')];
  buttons.forEach(b=>b.classList.toggle('active', b.textContent.trim()===category || (category==='all' && b.textContent.trim()==='전체')));
  cards.forEach(card=>{card.style.display=(category==='all'||card.dataset.category===category)?'block':'none';});
}
function searchArticles(){
  const q=(document.getElementById('searchInput')?.value||'').toLowerCase().trim();
  document.querySelectorAll('[data-category]').forEach(card=>{card.style.display=card.textContent.toLowerCase().includes(q)?'block':'none';});
}
