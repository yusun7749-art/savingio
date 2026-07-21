(function(){
 const C=window.SAVINGIO_CALCULATORS||{};
 const $=(s,r=document)=>r.querySelector(s);
 const groups=[
  ['급여·근로',[['급여 실수령액','/calculators/salary.html'],['퇴직금','/calculators/severance.html'],['주휴수당','/calculators/weekly-pay.html'],['3.3%·초과수당','/calculators/percentage.html'],['연차','/calculators/annual-leave.html']]],
  ['금융·세금',[['대출 상환','/calculators/loan.html'],['부가세','/calculators/vat.html'],['할인 가격','/calculators/discount.html']]],
  ['생활·차량',[['단위 변환','/calculators/unit-converter.html'],['연비','/calculators/fuel-efficiency.html'],['전기요금','/calculators/electricity.html'],['디데이','/calculators/dday.html']]],
  ['건강·사업',[['BMI','/calculators/bmi.html'],['배란일','/calculators/ovulation.html'],['원가율','/calculators/cost-rate.html'],['마진율','/calculators/margin.html']]]
 ];
 function calculatorTree(current){
  const aside=document.createElement('aside');aside.className='sv2-calculator-tree';aside.setAttribute('aria-label','전체 계산기');
  aside.innerHTML='<div class="sv2-tree-head"><strong>전체 계산기</strong><a href="/calculators/">목록 보기</a></div>'+groups.map(([g,items])=>`<section><h2>${g}</h2><ul>${items.map(([n,h])=>`<li><a href="${h}" class="${current===h.replace(/\/$/,'')?'active':''}">${n}</a></li>`).join('')}</ul></section>`).join('');
  return aside;
 }
 function attachBrainTree(slot){
  const move=()=>{const nav=document.getElementById('savingio-brain-nav');if(nav&&nav.parentNode!==slot){slot.appendChild(nav);nav.classList.add('sv2-embedded-search-tree');return true}return false};
  if(move())return;
  const observer=new MutationObserver(()=>{if(move())observer.disconnect()});
  observer.observe(document.body,{childList:true,subtree:true});
  setTimeout(()=>observer.disconnect(),12000);
 }
 function installBrand(){
  document.body.classList.add('savingio-main-background','savingio-calculator-page');
  const logo=document.querySelector('.site-header .logo');if(logo)logo.textContent='Savingio';
  let brand=document.querySelector('link[data-calculator-brand]');if(!brand){brand=document.createElement('link');brand.rel='stylesheet';brand.dataset.calculatorBrand='v5';document.head.appendChild(brand)}brand.href='/css/calculator-brand-v3.css?v=20260721e';
  const main=document.querySelector('.sv2-shell');
  if(main&&!document.querySelector('.sv2-calculator-layout')){
   const layout=document.createElement('div');layout.className='sv2-calculator-layout';main.parentNode.insertBefore(layout,main);
   const left=document.createElement('aside');left.className='sv2-search-tree-slot';left.setAttribute('aria-label','생활정보 검색 트리');layout.appendChild(left);
   layout.appendChild(main);
   layout.appendChild(calculatorTree(location.pathname.replace(/\/$/,'')));
   attachBrainTree(left);
  }
 }
 function today(){const d=new Date();d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,10)}
 function parseMoney(v){return Number(String(v||'').replace(/[^0-9.-]/g,''))||0}
 function field(f){const cls='sv2-field'+(f.full?' full':'');let input='';if(f.type==='select')input=`<select class="sv2-select" id="${f.id}">${f.options.map(o=>`<option value="${o[0]}" ${String(f.value)===String(o[0])?'selected':''}>${o[1]}</option>`).join('')}</select>`;else if(f.type==='radio')input=`<div class="sv2-radio-group">${f.options.map(o=>`<label class="sv2-radio"><input type="radio" name="${f.id}" value="${o[0]}" ${String(f.value)===String(o[0])?'checked':''}><span>${o[1]}</span></label>`).join('')}</div>`;else{const typ=f.type==='money'?'text':f.type;input=`<input class="sv2-input" id="${f.id}" type="${typ}" ${f.type==='money'?'data-money inputmode="numeric"':''} ${f.today?'data-today':''} ${f.min!==undefined?`min="${f.min}"`:''} ${f.max!==undefined?`max="${f.max}"`:''} ${f.step!==undefined?`step="${f.step}"`:''} ${f.value!==undefined?`value="${f.value}"`:''} ${f.placeholder?`placeholder="${f.placeholder}"`:''}>`}return `<div class="${cls}"><label for="${f.id}">${f.label}</label>${input}${f.help?`<small>${f.help}</small>`:''}</div>`}
 function shell(cfg){document.title=cfg.title+' | Savingio';const md=$('meta[name=description]');if(md)md.content=cfg.description;$('#calc-title').textContent=cfg.title;$('#calc-description').textContent=cfg.description;$('#calc-fields').innerHTML=cfg.fields.map(field).join('');if(cfg.details&&cfg.details.length){$('#calc-details').innerHTML=`<summary>더 정확하게 계산하기</summary><div class="sv2-grid">${cfg.details.map(field).join('')}</div>`}else $('#calc-details').remove();$('#calc-submit').textContent=cfg.button||'계산하기';$('#calc-notice').textContent=cfg.notice||'';if(cfg.official)$('#calc-official').innerHTML=`<a href="${cfg.official[1]}" target="_blank" rel="noopener">${cfg.official[0]} →</a>`;else $('#calc-official').remove();$('#calc-links').innerHTML=(cfg.links||[]).map(x=>`<a class="sv2-link" href="${x[2]}"><strong>${x[0]}</strong><span>${x[1]}</span></a>`).join('');enhance()}
 function enhance(){document.querySelectorAll('[data-today]').forEach(el=>{if(!el.value)el.value=today();const wrap=document.createElement('div');wrap.className='sv2-date-wrap';el.parentNode.insertBefore(wrap,el);wrap.appendChild(el);const b=document.createElement('button');b.type='button';b.className='sv2-today-btn';b.textContent='오늘';b.onclick=()=>el.value=today();wrap.appendChild(b)});document.querySelectorAll('[data-money]').forEach(el=>{const wrap=document.createElement('div');wrap.className='sv2-money-wrap';el.parentNode.insertBefore(wrap,el);wrap.appendChild(el);const u=document.createElement('span');u.className='sv2-money-unit';u.textContent='원';wrap.appendChild(u);const h=document.createElement('small');h.className='sv2-money-hint';wrap.after(h);const fmt=()=>{const n=parseMoney(el.value);el.value=n?n.toLocaleString('ko-KR'):'';h.textContent=n?korean(n):'숫자만 입력해도 자동으로 원 단위가 표시됩니다.'};el.addEventListener('input',fmt);fmt()})}
 function korean(v){let n=Math.floor(Math.abs(v));if(!n)return '';const out=[];for(const [s,l] of [[100000000,'억'],[10000,'만'],[1,'']]){const q=Math.floor(n/s);if(q){out.push(q.toLocaleString('ko-KR')+l);n%=s}}return out.join(' ')+'원'}
 function values(cfg){const out={};[...(cfg.fields||[]),...(cfg.details||[])].forEach(f=>{if(f.type==='radio')out[f.id]=document.querySelector(`[name="${f.id}"]:checked`)?.value||f.value;else{const el=document.getElementById(f.id);out[f.id]=f.type==='money'||f.type==='number'?parseMoney(el?.value):el?.value}});return out}
 function show(r){$('#sv2-main-label').textContent=r.label;$('#sv2-main-value').textContent=r.value;const b=$('#sv2-badge');b.textContent=r.badge||'';b.style.display=r.badge?'inline-block':'none';$('#sv2-breakdown').innerHTML=(r.rows||[]).map(x=>`<div class="sv2-row"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join('');$('#sv2-explain').textContent=r.explain||'';$('#sv2-result').classList.add('show');$('#sv2-result').scrollIntoView({behavior:'smooth',block:'start'})}
 document.addEventListener('DOMContentLoaded',()=>{installBrand();const id=document.body.dataset.calculator,cfg=C[id];if(!cfg){document.body.innerHTML='<p>계산기 설정을 찾을 수 없습니다.</p>';return}shell(cfg);$('#calc-form').addEventListener('submit',e=>{e.preventDefault();$('#sv2-error').style.display='none';try{show(cfg.calculate(values(cfg)))}catch(err){const box=$('#sv2-error');box.textContent=err.message||'입력값을 확인해 주세요.';box.style.display='block';box.scrollIntoView({behavior:'smooth',block:'center'})}});$('#calc-reset').onclick=()=>location.reload();document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.tagName!=='TEXTAREA'&&!e.target.closest('button'))$('#calc-form').requestSubmit()})});
})();