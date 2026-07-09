
const searchInput=document.querySelector('#articleSearch');
if(searchInput){searchInput.addEventListener('input',()=>{const q=searchInput.value.toLowerCase();document.querySelectorAll('[data-article]').forEach(el=>{el.style.display=el.textContent.toLowerCase().includes(q)?'block':'none';});});}
