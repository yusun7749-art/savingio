
function money(value){
  const n = Number(value || 0);
  return Math.round(n).toLocaleString('ko-KR') + '원';
}
function numberValue(id){
  const el=document.getElementById(id);
  return Number((el?.value||'').replace(/,/g,''))||0;
}
function showResult(html){
  const box=document.getElementById('result');
  box.innerHTML=html; box.classList.add('show');
}
function resetCalc(){
  document.querySelectorAll('input').forEach(el=>el.value='');
  const box=document.getElementById('result'); if(box){box.innerHTML='';box.classList.remove('show');}
}
function searchCards(){
  const q=(document.getElementById('siteSearch')?.value||'').trim().toLowerCase();
  document.querySelectorAll('[data-search]').forEach(card=>{
    card.style.display=card.dataset.search.toLowerCase().includes(q)?'flex':'none';
  });
}
