const input=document.querySelector('#articleSearch');
if(input){input.addEventListener('input',()=>{const q=input.value.toLowerCase();document.querySelectorAll('.article-item').forEach(item=>{item.style.display=item.textContent.toLowerCase().includes(q)?'block':'none';});});}
