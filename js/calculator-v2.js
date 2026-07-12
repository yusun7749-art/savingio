
window.SV2={
 n(v){return Number(String(v??'').replace(/[^0-9.-]/g,''))||0},
 won(v){return Math.round(v).toLocaleString('ko-KR')+'원'},
 num(v,d=1){return Number(v).toLocaleString('ko-KR',{maximumFractionDigits:d})},
 days(a,b){return Math.floor((b-a)/86400000)+1},
 show(data){const box=document.querySelector('#sv2-result');document.querySelector('#sv2-main-label').textContent=data.label;document.querySelector('#sv2-main-value').textContent=data.value;document.querySelector('#sv2-badge').textContent=data.badge||'';document.querySelector('#sv2-badge').style.display=data.badge?'inline-block':'none';document.querySelector('#sv2-breakdown').innerHTML=(data.rows||[]).map(x=>`<div class="sv2-row"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join('');document.querySelector('#sv2-explain').innerHTML=data.explain||'';box.classList.add('show');box.scrollIntoView({behavior:'smooth',block:'start'})},
 error(msg){const e=document.querySelector('#sv2-error');e.textContent=msg;e.style.display='block'},
 clearError(){document.querySelector('#sv2-error').style.display='none'},
 reset(){document.querySelector('form').reset();document.querySelector('#sv2-result').classList.remove('show');this.clearError();setToday()}
};
function setToday(){document.querySelectorAll('[data-today]').forEach(el=>{if(!el.value)el.value=new Date().toISOString().slice(0,10)})}
document.addEventListener('DOMContentLoaded',()=>{setToday();document.querySelectorAll('[data-money]').forEach(el=>el.addEventListener('input',()=>{const p=el.selectionStart,v=el.value.replace(/\D/g,'');el.value=v?Number(v).toLocaleString('ko-KR'):''}));});
