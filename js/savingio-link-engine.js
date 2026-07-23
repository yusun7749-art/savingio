(async function(){
'use strict';
const ARTICLE=/^\/articles\/(?!$|index(?:\.html)?$)/;
if(!ARTICLE.test(location.pathname))return;
const VERSION='20260723-link1';
const compact=v=>String(v||'').toLowerCase().replace(/[^0-9a-z가-힣]+/gi,'');
const text=v=>String(v||'').replace(/\s+/g,' ').trim();
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const current=location.pathname.replace(/index\.html$/,'').replace(/\.html$/,'');
const CALCULATORS=[
 ['급여|월급|연봉|시급|주휴수당','/calculators/salary-net-pay.html','실수령액 계산기'],
 ['퇴직금|퇴사','/calculators/severance-pay.html','퇴직금 계산기'],
 ['전기|전기요금|에어컨','/calculators/electricity-cost.html','전기요금 계산기'],
 ['대출|이자|금리|원리금','/calculators/loan-payment.html','대출 상환 계산기'],
 ['자동차|연비|주유|유류비','/calculators/fuel-cost.html','유류비 계산기']
];
const OFFICIAL=[
 ['세금|환급|연말정산|종합소득세|부가세|홈택스','https://www.hometax.go.kr/','국세청 홈택스'],
 ['지방세|재산세|자동차세|위택스','https://www.wetax.go.kr/','위택스'],
 ['보험|실손|건강보험|보험료','https://www.nhis.or.kr/','국민건강보험공단'],
 ['실업급여|근로|퇴직|임금','https://www.work24.go.kr/','고용24'],
 ['복지|지원금|바우처|수당','https://www.bokjiro.go.kr/','복지로']
];
function tokens(v){return [...new Set(text(v).split(/[^0-9a-z가-힣]+/i).map(compact).filter(x=>x.length>1))]}
function pageContext(){
 const h1=text(document.querySelector('h1')?.textContent),badge=text(document.querySelector('.badge,.category,.article-category')?.textContent),desc=text(document.querySelector('meta[name="description"]')?.content),body=text(document.querySelector('.article-main,.article-content,.post-content,main')?.textContent).slice(0,4000);
 return{h1,badge,desc,body,all:`${h1} ${badge} ${desc} ${body}`,words:tokens(`${h1} ${badge} ${desc}`)};
}
async function loadRecords(){
 let data=window.SAVINGIO_BRAIN_DATA;
 try{if(!data?.tree){const r=await fetch(`/data/savingio-brain-data.json?v=${VERSION}`,{cache:'no-store'});if(!r.ok)return[];data=await r.json()}}catch{return[]}
 const out=[],seen=new Set();
 Object.entries(data.tree||{}).forEach(([large,mids])=>Object.entries(mids||{}).forEach(([middle,smalls])=>Object.entries(smalls||{}).forEach(([small,items])=>(items||[]).forEach(item=>{
  const href=String(item?.href||'');if(!href||!item?.title||seen.has(href))return;seen.add(href);out.push({title:item.title,desc:item.description||'',keywords:item.search_keywords||'',href,large,middle,small});
 }))));return out;
}
function normalizedPath(href){try{return new URL(href,location.origin).pathname.replace(/index\.html$/,'').replace(/\.html$/,'')}catch{return href}}
function score(r,ctx){
 if(normalizedPath(r.href)===current)return-1;
 const hay=compact(`${r.title} ${r.desc} ${r.keywords} ${r.large} ${r.middle} ${r.small}`);let s=0;
 ctx.words.forEach(w=>{if(compact(r.title).includes(w))s+=12;else if(hay.includes(w))s+=4});
 const badge=compact(ctx.badge);if(badge&&(compact(r.middle).includes(badge)||badge.includes(compact(r.middle))))s+=18;
 return s;
}
function rank(records,ctx){return records.map(r=>({r,s:score(r,ctx)})).filter(x=>x.s>0).sort((a,b)=>b.s-a.s||a.r.title.localeCompare(b.r.title,'ko'))}
function rail(){return document.querySelector('.right-rail,.article-sidebar,.sidebar-right,.right-sidebar,.post-sidebar,.detail-sidebar,[data-sv-role="rail"]')}
function card(purpose){return rail()?.querySelector(`[data-sv-rail-purpose="${purpose}"]`)}
function usefulLinks(root){return [...(root?.querySelectorAll('a[href]')||[])].filter(a=>!a.getAttribute('href').startsWith('#'))}
function ensureList(root){let list=root.querySelector('ul,.rail-links');if(!list){list=document.createElement('ul');list.className='rail-links';root.appendChild(list)}return list}
function fillCard(root,items,max=3){
 if(!root||usefulLinks(root).length)return 0;const list=ensureList(root);const seen=new Set();let n=0;
 items.forEach(item=>{if(n>=max||!item?.href||seen.has(item.href)||normalizedPath(item.href)===current)return;seen.add(item.href);const li=document.createElement('li');li.innerHTML=`<a href="${esc(item.href)}"${/^https?:\/\//.test(item.href)?' target="_blank" rel="noopener noreferrer"':''}>${esc(item.title)}</a>`;list.appendChild(li);n++});return n;
}
function categoryItems(ranked,ctx){const key=compact(ctx.badge);return ranked.filter(x=>key&&(compact(x.r.middle).includes(key)||key.includes(compact(x.r.middle)))).map(x=>x.r)}
function relatedItems(ranked,same){const used=new Set(same.map(x=>x.href));return ranked.map(x=>x.r).filter(r=>!used.has(r.href))}
function matchedCalculators(ctx){return CALCULATORS.filter(([pattern])=>new RegExp(pattern).test(ctx.all)).map(([,href,title])=>({href,title}))}
function matchedOfficial(ctx){return OFFICIAL.filter(([pattern])=>new RegExp(pattern).test(ctx.all)).map(([,href,title])=>({href,title}))}
function audit(detail){
 const report={path:location.pathname,status:detail.missing.length?'incomplete':'complete',counts:detail.counts,missing:detail.missing,duplicateLinks:detail.duplicates,checkedAt:new Date().toISOString()};
 window.SavingioLinkEngineReport=report;document.documentElement.dataset.svLinkEngine=report.status;document.dispatchEvent(new CustomEvent('savingio-link-audit',{detail:report}));return report;
}
async function install(){
 const r=rail();if(!r)return audit({counts:{},missing:['rail'],duplicates:[]});
 const ctx=pageContext(),records=await loadRecords(),ranked=rank(records,ctx),same=categoryItems(ranked,ctx).slice(0,6),related=relatedItems(ranked,same).slice(0,8);
 const counts={sameCategory:fillCard(card('same-category'),same,3),related:fillCard(card('related'),related,3),tool:fillCard(card('tool'),[...matchedCalculators(ctx),...matchedOfficial(ctx)],3)};
 const all=[...r.querySelectorAll('a[href]')].map(a=>normalizedPath(a.href)),duplicates=[...new Set(all.filter((v,i)=>all.indexOf(v)!==i))];
 const missing=['same-category','related','tool'].filter(p=>!card(p)||!usefulLinks(card(p)).length);
 r.dataset.svLinkStatus=missing.length?'incomplete':'complete';return audit({counts,missing,duplicates});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
window.SavingioLinkEngine={install,audit};
})();