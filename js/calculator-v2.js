window.SV2={
 n(v){return Number(String(v??'').replace(/[^0-9.-]/g,''))||0},
 won(v){return Math.round(v).toLocaleString('ko-KR')+'원'},
 num(v,d=1){return Number(v).toLocaleString('ko-KR',{maximumFractionDigits:d})},
 days(a,b){return Math.floor((b-a)/86400000)+1},
 koreanMoney(v){
  const n=Math.floor(Math.abs(this.n(v)));
  if(!n)return '';
  const units=[[100000000,'억'],[10000,'만'],[1,'']];
  let left=n,out=[];
  for(const [size,label] of units){const q=Math.floor(left/size);if(q){out.push(q.toLocaleString('ko-KR')+label);left%=size}}
  return out.join(' ')+'원';
 },
 show(data){
  const box=document.querySelector('#sv2-result');
  document.querySelector('#sv2-main-label').textContent=data.label;
  document.querySelector('#sv2-main-value').textContent=data.value;
  const badge=document.querySelector('#sv2-badge');
  badge.textContent=data.badge||'';badge.style.display=data.badge?'inline-block':'none';
  document.querySelector('#sv2-breakdown').innerHTML=(data.rows||[]).map(x=>`<div class="sv2-row"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join('');
  document.querySelector('#sv2-explain').innerHTML=data.explain||'';
  box.classList.add('show');
  const toggle=box.querySelector('.sv2-breakdown-toggle');if(toggle){toggle.textContent='상세 계산 내역 접기';toggle.setAttribute('aria-expanded','true')}
  box.scrollIntoView({behavior:'smooth',block:'start'});
 },
 error(msg){const e=document.querySelector('#sv2-error');e.textContent=msg;e.style.display='block';e.scrollIntoView({behavior:'smooth',block:'center'})},
 clearError(){const e=document.querySelector('#sv2-error');if(e)e.style.display='none'},
 reset(){
  const form=document.querySelector('form');if(form)form.reset();
  const result=document.querySelector('#sv2-result');if(result)result.classList.remove('show');
  this.clearError();setToday();
  document.querySelectorAll('[data-money]').forEach(updateMoneyHint);
  window.scrollTo({top:0,behavior:'smooth'});
 }
};
function localToday(){const d=new Date();d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,10)}
function setToday(){document.querySelectorAll('[data-today]').forEach(el=>{if(!el.value)el.value=localToday()})}
function updateMoneyHint(el){
 const hint=el.closest('.sv2-field')?.querySelector('.sv2-money-hint');
 if(!hint)return;
 const n=SV2.n(el.value);hint.textContent=n?SV2.koreanMoney(n):'숫자만 입력해도 자동으로 원 단위가 표시됩니다.';
}
function formatMoneyInput(el){
 const digits=el.value.replace(/[^0-9]/g,'');el.value=digits?Number(digits).toLocaleString('ko-KR'):'';updateMoneyHint(el)
}
function enhanceMoneyFields(){
 document.querySelectorAll('[data-money]').forEach(el=>{
  if(el.dataset.enhanced)return;el.dataset.enhanced='true';
  const wrap=document.createElement('div');wrap.className='sv2-money-wrap';el.parentNode.insertBefore(wrap,el);wrap.appendChild(el);
  const suffix=document.createElement('span');suffix.className='sv2-money-unit';suffix.textContent='원';wrap.appendChild(suffix);
  const hint=document.createElement('small');hint.className='sv2-money-hint';wrap.insertAdjacentElement('afterend',hint);
  el.addEventListener('input',()=>formatMoneyInput(el));el.addEventListener('focus',()=>el.select());updateMoneyHint(el);
 })
}
function enhanceTodayFields(){
 document.querySelectorAll('[data-today]').forEach(el=>{
  if(el.dataset.todayEnhanced)return;el.dataset.todayEnhanced='true';
  const wrap=document.createElement('div');wrap.className='sv2-date-wrap';el.parentNode.insertBefore(wrap,el);wrap.appendChild(el);
  const btn=document.createElement('button');btn.type='button';btn.className='sv2-today-btn';btn.textContent='오늘';btn.addEventListener('click',()=>{el.value=localToday();el.dispatchEvent(new Event('change',{bubbles:true}))});wrap.appendChild(btn);
 })
}
function enhanceResult(){
 const result=document.querySelector('#sv2-result'),breakdown=document.querySelector('#sv2-breakdown');if(!result||!breakdown||result.querySelector('.sv2-breakdown-toggle'))return;
 const btn=document.createElement('button');btn.type='button';btn.className='sv2-breakdown-toggle';btn.textContent='상세 계산 내역 접기';btn.setAttribute('aria-expanded','true');
 btn.addEventListener('click',()=>{const hidden=breakdown.classList.toggle('is-hidden');btn.textContent=hidden?'상세 계산 내역 보기':'상세 계산 내역 접기';btn.setAttribute('aria-expanded',String(!hidden))});
 breakdown.insertAdjacentElement('beforebegin',btn);
}
document.addEventListener('DOMContentLoaded',()=>{setToday();enhanceMoneyFields();enhanceTodayFields();enhanceResult()});