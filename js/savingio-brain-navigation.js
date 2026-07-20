(async()=>{
'use strict';

/* Always load the latest Explorer skin even when an older page still links v12. */
const explorerCss='/css/savingio-brain-navigation.css?v=13';
let explorerLink=document.querySelector('link[href*="savingio-brain-navigation.css"]');
if(explorerLink){
  if(explorerLink.getAttribute('href')!==explorerCss) explorerLink.setAttribute('href',explorerCss);
}else{
  explorerLink=document.createElement('link');
  explorerLink.rel='stylesheet';
  explorerLink.href=explorerCss;
  document.head.appendChild(explorerLink);
}

if(document.getElementById('savingio-brain-nav'))return;

let DATA=window.SAVINGIO_BRAIN_DATA;
if(!DATA||!DATA.tree){
  try{
    const res=await fetch('/data/savingio-brain-data.json?v=14',{cache:'no-store'});
    if(!res.ok)throw new Error('navigation data');
    DATA=await res.json();
    window.SAVINGIO_BRAIN_DATA=DATA;
  }catch(_){return;}
}

const normalizePath=(value)=>{
  let path=String(value||'/');
  try{path=decodeURI(path)}catch(_){}
  path=path.split('?')[0].split('#')[0].replace(/\/index\.html$/,'/').replace(/\.html$/,'').replace(/\/$/,'');
  return path||'/';
};
const normalize=(value)=>String(value||'').toLowerCase().replace(/[^0-9a-z가-힣]+/gi,'');
const esc=(value)=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const validHref=(href)=>typeof href==='string'&&/^\/(articles|calculators)\/[a-z0-9][a-z0-9-]*(?:\.html)?(?:[?#].*)?$/i.test(href.trim());
const current=normalizePath(location.pathname);

const largeLabels={
 '돈 아끼기':'생활비가 너무 많이 나와요','받을 돈 찾기':'받을 수 있는 돈을 찾고 싶어요',
 '세금 처리하기':'세금 신고·납부가 어려워요','급여·일 처리하기':'월급·퇴직·일 문제를 해결하고 싶어요',
 '생활 문제 해결':'집·차·건강 문제를 해결하고 싶어요','바로 계산하기':'금액을 바로 계산해 보고 싶어요'
};
const largeDescriptions={
 '돈 아끼기':'전기세·관리비·통신비·은행 수수료 줄이기','받을 돈 찾기':'지원금·환급금·연금·혜택 확인하기',
 '세금 처리하기':'신고·납부·증명·사업 세금 처리하기','급여·일 처리하기':'월급·퇴직금·실업·부업 확인하기',
 '생활 문제 해결':'주거·자동차·건강·교육 문제 해결하기','바로 계산하기':'필요한 금액을 숫자로 바로 확인하기'
};
const middleLabels={
 '전기요금':'전기세가 너무 많이 나왔어요','관리비':'관리비가 예상보다 많이 나왔어요','수도요금':'수도요금이 갑자기 늘었어요',
 '통신비':'휴대폰·인터넷 요금을 줄이고 싶어요','보험료':'보험료와 보장 내용을 점검하고 싶어요',
 '은행·카드':'은행 수수료와 카드값을 줄이고 싶어요','연금':'연금으로 얼마를 받을지 궁금해요',
 '지원금':'받을 수 있는 지원금이 궁금해요','환급금':'놓친 환급금이 있는지 찾고 싶어요',
 '근로·자녀장려금':'근로·자녀장려금을 받을 수 있을까요?','연말정산':'연말정산 환급을 제대로 받고 싶어요',
 '종합소득세':'종합소득세 신고가 어려워요','부가가치세':'부가세 신고와 납부가 궁금해요','재산세':'재산세가 얼마나 나올지 궁금해요',
 '자동차세':'자동차세를 확인하고 절약하고 싶어요','급여':'월급과 실수령액을 확인하고 싶어요','퇴직':'퇴직금과 퇴사 절차가 궁금해요',
 '실업':'실업급여를 받을 수 있는지 궁금해요','부업':'부업 수입과 신고 방법이 궁금해요','주거':'집에서 문제가 생겼어요',
 '자동차':'차에 문제가 생기거나 비용이 걱정돼요','건강':'병원비와 건강 문제를 확인하고 싶어요','교육':'교육비와 아이 관련 지원이 궁금해요'
};
const smallLabels={'처음 확인하기':'무엇부터 확인해야 할까요?','요금 구조·누진제 이해':'왜 이렇게 많이 나왔을까요?','에어컨 전기세 줄이기':'에어컨 전기세를 줄이고 싶어요','가전별 절약':'가전제품 전기세를 줄이고 싶어요','할인·지원 확인':'할인이나 지원을 받을 수 있을까요?','신청 준비':'신청 전에 무엇을 준비해야 할까요?','신청 방법':'어디서 어떻게 신청하나요?','대상·조건 확인':'제가 대상인지 확인하고 싶어요','금액 계산':'얼마를 받을지 계산하고 싶어요','문제 해결':'문제가 생겼는데 어떻게 해야 하나요?','절약 방법':'실제로 줄일 수 있는 방법이 궁금해요','기본 이해':'먼저 기본부터 알고 싶어요','계산하기':'금액을 바로 계산해 보고 싶어요'};
const displayLarge=v=>largeLabels[v]||v,displayMiddle=v=>middleLabels[v]||v,displaySmall=v=>smallLabels[v]||v;

const records=[];
const seen=new Set();
Object.entries(DATA.tree||{}).forEach(([large,middles])=>Object.entries(middles||{}).forEach(([middle,smalls])=>Object.entries(smalls||{}).forEach(([small,items])=>(Array.isArray(items)?items:[]).forEach(item=>{
  if(!item||!validHref(item.href)||!item.title)return;
  const key=normalizePath(item.href); if(seen.has(key))return; seen.add(key);
  records.push({...item,large,middle,small,key,haystack:`${item.title} ${item.search_keywords||''} ${large} ${displayLarge(large)} ${middle} ${displayMiddle(middle)} ${small} ${displaySmall(small)}`});
}))));

const score=(item,qRaw)=>{
  const q=normalize(qRaw),title=normalize(item.title),hay=normalize(item.haystack);
  if(!q)return 1;
  if(title===q)return 1000;
  if(title.startsWith(q))return 850;
  if(title.includes(q))return 700;
  if(hay.includes(q))return 500;
  const tokens=String(qRaw).trim().split(/\s+/).map(normalize).filter(Boolean);
  return tokens.reduce((sum,t)=>sum+(title.includes(t)?120:hay.includes(t)?45:0),0);
};
const currentRecord=records.find(r=>r.key===current);

const nav=document.createElement('aside');
nav.id='savingio-brain-nav';
nav.setAttribute('aria-label','Savingio 생활 문제 탐색');
nav.innerHTML=`<button class="sbn-close" type="button" aria-label="탐색 닫기">×</button>
<div class="sbn-head"><strong>지금 어떤 문제가 있으세요?</strong><small>카테고리 이름을 몰라도 괜찮아요.<br>상황이나 글 제목을 입력해 보세요.</small></div>
<form class="sbn-search" role="search"><input type="search" placeholder="예: 은행 수수료, 카드값, 전기세" aria-label="사이트 글 검색" autocomplete="off"><button type="submit">검색</button></form>
<div class="sbn-search-status" aria-live="polite"></div><div class="sbn-context"></div><div class="sbn-tree"></div>`;
const tree=nav.querySelector('.sbn-tree'),context=nav.querySelector('.sbn-context'),form=nav.querySelector('.sbn-search'),input=form.querySelector('input'),status=nav.querySelector('.sbn-search-status');

function renderContext(){
 if(!currentRecord){context.hidden=true;return;}
 const related=records.filter(r=>r.key!==current&&r.middle===currentRecord.middle).slice(0,3);
 context.hidden=false;
 context.innerHTML=`<div class="sbn-context-label">지금 보고 있는 글</div><div class="sbn-breadcrumb">${esc(displayLarge(currentRecord.large))}<span>›</span>${esc(displayMiddle(currentRecord.middle))}</div><a class="sbn-current-card" href="${esc(currentRecord.href)}" aria-current="page">${esc(currentRecord.title)}</a>${related.length?`<div class="sbn-next-label">이어서 확인하면 좋은 글</div><div class="sbn-next-list">${related.map(r=>`<a href="${esc(r.href)}">${esc(r.title)}</a>`).join('')}</div>`:''}`;
}
function renderSearch(q){
 const results=records.map(r=>({r,s:score(r,q)})).filter(x=>x.s>0).sort((a,b)=>b.s-a.s).slice(0,30).map(x=>x.r);
 context.hidden=true;
 status.textContent=results.length?`검색 결과 ${results.length}개 · 제목을 누르면 바로 이동합니다`:'검색 결과가 없습니다';
 tree.innerHTML=results.length?`<div class="sbn-results">${results.map(r=>`<a class="sbn-result-card" href="${esc(r.href)}"><span class="sbn-result-path">${esc(displayLarge(r.large))} › ${esc(displayMiddle(r.middle))}</span><strong>${esc(r.title)}</strong><em>글 열기 →</em></a>`).join('')}</div>`:`<div class="sbn-empty">일치하는 글이 없습니다.<br>검색어를 짧게 입력해 보세요.</div>`;
 return results;
}
function renderTree(){
 status.textContent='카테고리를 펼치거나 검색해 글을 찾으세요';
 let html='';
 Object.entries(DATA.tree||{}).forEach(([large,middles])=>{
  let middleHtml='';
  Object.entries(middles||{}).forEach(([middle,smalls])=>{
   const group=records.filter(r=>r.large===large&&r.middle===middle); if(!group.length)return;
   const isHere=group.some(r=>r.key===current);
   let smallHtml='';
   Object.entries(smalls||{}).forEach(([small])=>{
    const items=group.filter(r=>r.small===small); if(!items.length)return;
    const smallHere=items.some(r=>r.key===current);
    smallHtml+=`<details class="sbn-small"${smallHere?' open':''}><summary>${esc(displaySmall(small))}<span class="sbn-count">${items.length}</span></summary><ul class="sbn-items">${items.map(r=>`<li><a href="${esc(r.href)}"${r.key===current?' aria-current="page"':''}><span>${esc(r.title)}</span></a></li>`).join('')}</ul></details>`;
   });
   middleHtml+=`<details class="sbn-middle"${isHere?' open':''}><summary>${esc(displayMiddle(middle))}<span class="sbn-count">${group.length}</span></summary>${smallHtml}</details>`;
  });
  if(middleHtml)html+=`<details class="sbn-large"${records.some(r=>r.large===large&&r.key===current)?' open':''}><summary><span class="sbn-large-title">${esc(displayLarge(large))}</span><span class="sbn-large-desc">${esc(largeDescriptions[large]||'')}</span></summary>${middleHtml}</details>`;
 });
 tree.innerHTML=html;
}

document.body.append(nav);document.documentElement.classList.add('savingio-brain-ready');renderContext();renderTree();
let last=[];
input.addEventListener('input',e=>{const q=e.target.value.trim();if(!q){renderContext();renderTree();return;}last=renderSearch(q)});
form.addEventListener('submit',e=>{e.preventDefault();const q=input.value.trim();if(!q){input.focus();return;}last=renderSearch(q);if(last.length===1)location.href=last[0].href;});
nav.addEventListener('click',e=>{const a=e.target.closest('a[href]');if(!a)return;const href=a.getAttribute('href');if(validHref(href)){e.preventDefault();location.assign(href);}});

const button=document.createElement('button');button.className='sbn-mobile-btn';button.type='button';button.textContent='문제 찾기';document.body.append(button);
const backdrop=document.createElement('div');backdrop.className='sbn-backdrop';document.body.append(backdrop);
const close=()=>document.body.classList.remove('sbn-open');button.addEventListener('click',()=>document.body.classList.add('sbn-open'));nav.querySelector('.sbn-close').addEventListener('click',close);backdrop.addEventListener('click',close);document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
})();