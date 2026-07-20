(async()=>{
'use strict';

const explorerCss='/css/savingio-brain-navigation.css?v=17';
let explorerLink=document.querySelector('link[href*="savingio-brain-navigation.css"]');
if(explorerLink){explorerLink.setAttribute('href',explorerCss);}else{explorerLink=document.createElement('link');explorerLink.rel='stylesheet';explorerLink.href=explorerCss;document.head.appendChild(explorerLink);}

if(!document.getElementById('sbn-search-layout-guard')){
 const style=document.createElement('style');
 style.id='sbn-search-layout-guard';
 style.textContent=`
 .info-shell .article-card[hidden],.info-shell .article-card.savingio-filter-hidden{display:none!important}
 #savingio-brain-nav .sbn-results{display:grid!important;grid-template-columns:1fr!important;gap:9px!important;width:100%!important}
 #savingio-brain-nav .sbn-result-card{display:grid!important;grid-template-columns:1fr auto!important;grid-template-areas:"path path" "title arrow" "desc desc"!important;gap:5px 10px!important;width:100%!important;padding:13px 14px!important;border:1px solid rgba(117,96,67,.16)!important;border-radius:12px!important;background:#fff!important;color:#32363a!important;text-decoration:none!important;overflow:hidden!important}
 #savingio-brain-nav .sbn-result-path{grid-area:path!important;color:#9a7040!important;font-size:10px!important;font-weight:800!important}
 #savingio-brain-nav .sbn-result-title{grid-area:title!important;color:#132744!important;font-size:13px!important;font-weight:800!important;line-height:1.5!important}
 #savingio-brain-nav .sbn-result-desc{grid-area:desc!important;color:#77746f!important;font-size:11px!important;line-height:1.55!important;display:-webkit-box!important;-webkit-line-clamp:2!important;-webkit-box-orient:vertical!important;overflow:hidden!important}
 #savingio-brain-nav .sbn-result-arrow{grid-area:arrow!important;display:grid!important;place-items:center!important;width:25px!important;height:25px!important;border-radius:50%!important;background:rgba(185,130,56,.10)!important;color:#8f6532!important}
 #savingio-brain-nav .sbn-search{grid-template-columns:minmax(0,1fr)!important}
 #savingio-brain-nav .sbn-search button{display:none!important}`;
 document.head.appendChild(style);
}

const norm=v=>String(v||'').toLowerCase().replace(/\s+/g,' ').trim();
const compact=v=>norm(v).replace(/[^0-9a-z가-힣]+/gi,'');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const SEARCH_GROUPS={
 정부:['정부','정부24','정부혜택','정부지원','국가지원','공공지원','지원제도','복지','복지로','보조금','지원금','수당','장려금','바우처','급여지원','생활지원','민생지원','지자체','행정복지센터','주민센터'],
 지원:['지원','지원금','보조금','혜택','복지','수당','장려금','바우처','감면','할인','면제','신청','대상','조건','지급','지급일'],
 환급:['환급','환급금','돌려받기','돌려받','과납','과오납','정산','미수령','숨은돈','미환급','환급계좌','환급신청'],
 자동차:['자동차','차','차량','운전','운전자','교통','자동차보험','차보험','보험료','자동차세','연납','마일리지','주행거리','블랙박스','자녀할인','교통사고','과태료','범칙금','벌금','주차','주차비','렌터카','렌트카','연비','기름값','주유비','엔진오일','타이어','정기검사','자동차검사','폐차','명의이전','번호판'],
 보험:['보험','보험료','보장','특약','자동차보험','실손보험','실비','건강보험','해지환급금','과납보험료','중복보험','갱신','청구','보험금'],
 은행:['은행','계좌','통장','수수료','이체','송금','예금','적금','카드','체크카드','신용카드','카드값','현금서비스','카드론','자동이체','금리','이자','대출'],
 세금:['세금','세액','납부','신고','공제','감면','국세','지방세','종합소득세','부가가치세','재산세','자동차세','소득세','원천징수','연말정산','홈택스','위택스'],
 급여:['급여','월급','임금','실수령액','연봉','시급','수당','상여금','퇴직금','퇴사','근로계약','급여명세서','4대보험','실업급여'],
 연금:['연금','국민연금','기초연금','노령연금','노후','연금수령','추납','추가납부','연금액','고령'],
 아이:['아이','애기','아기','아동','자녀','초등학생','학생','육아','보육','교육','돌봄','아동수당','양육수당','보육료','학원비','교육비','자녀장려금'],
 노인:['노인','고령','어르신','시니어','기초연금','노후','장기요양','요양','65세','60세','경로'],
 전기:['전기','전기세','전기요금','에어컨','냉방','에너지','누진제','사용량','한전','절전','전력','제습기','선풍기','냉장고','건조기'],
 수도:['수도','수도세','수도요금','상하수도','누수','물사용량','계량기'],
 관리비:['관리비','아파트관리비','공동관리비','난방비','전기료','수도료','장기수선충당금','관리비고지서'],
 통신:['통신','통신비','휴대폰','핸드폰','스마트폰','인터넷','와이파이','알뜰폰','요금제','결합할인','데이터'],
 주거:['주거','집','아파트','월세','전세','임대','주택','부동산','관리비','누수','보증금','전세보증','임대차','이사'],
 건강:['건강','병원','병원비','의료비','건강보험','실손','실비','진료비','약값','본인부담금','과오납','검진','치료'],
 사업:['사업','사업자','개인사업자','자영업','소상공인','홈택스','사업용카드','비용처리','경비','부가세','종소세','폐업','매출','세금계산서'],
 부업:['부업','재택','재택근무','온라인수입','추가수입','사이드잡','AI부업','N잡','프리랜서','수익'],
 생활비:['생활비','절약','아끼기','고정비','가계부','예산','지출','소비','할인','캐시백','포인트'],
 카드:['카드','신용카드','체크카드','카드값','카드포인트','캐시백','할인카드','현금서비스','카드론','자동납부'],
 장려금:['장려금','근로장려금','자녀장려금','근로자녀장려금','지급일','신청','계좌변경','심사','결과조회'],
 벌금:['벌금','범칙금','과태료','교통벌금','고지서','사전통지','이파인','교통민원24','미납','납부'],
 계산기:['계산기','계산','예상금액','실수령액계산','퇴직금계산','대출계산','전기요금계산','월급계산']
};

function relatedTerms(query){
 const q=norm(query);const out=new Set([q]);
 Object.entries(SEARCH_GROUPS).forEach(([key,values])=>{
  const all=[key,...values].map(norm);
  if(all.some(v=>q.includes(v)||v.includes(q)))all.forEach(v=>out.add(v));
 });
 return [...out].filter(Boolean);
}

function initArticleDirectorySearch(){
 const search=document.getElementById('articleSearch');
 const grid=document.getElementById('articleGrid');
 const count=document.getElementById('resultCount');
 if(!search||!grid||!count)return;
 const cards=[...grid.querySelectorAll('.article-card')];
 const pager=document.querySelector('.pager');
 const buttons=[...document.querySelectorAll('.category-row button[data-cat]')];
 let activeCategory='전체';
 const records=cards.map(card=>({
  card,
  title:card.querySelector('h2')?.textContent||'',
  desc:card.querySelector('p')?.textContent||'',
  category:card.dataset.category||card.querySelector('.card-category')?.textContent||'',
  href:card.getAttribute('href')||''
 }));
 const matches=(r,q)=>{
  if(!q)return true;
  const fields=[r.title,r.desc,r.category,r.href].map(compact);
  return relatedTerms(q).some(term=>{const t=compact(term);return t&&fields.some(f=>f.includes(t));});
 };
 const apply=()=>{
  const q=search.value.trim();let shown=0;
  records.forEach(r=>{
   const visible=(activeCategory==='전체'||r.category===activeCategory)&&matches(r,q);
   r.card.hidden=!visible;
   r.card.classList.toggle('savingio-filter-hidden',!visible);
   if(visible)shown++;
  });
  count.textContent=`검색 결과 ${shown}개`;
  if(pager)pager.style.display=(q||activeCategory!=='전체')?'none':'';
 };
 search.addEventListener('input',apply);
 search.addEventListener('search',apply);
 buttons.forEach(btn=>btn.addEventListener('click',()=>{activeCategory=btn.dataset.cat||'전체';buttons.forEach(b=>b.classList.toggle('active',b===btn));apply();}));
 apply();
}
initArticleDirectorySearch();

if(document.getElementById('savingio-brain-nav'))return;
let DATA=window.SAVINGIO_BRAIN_DATA;
if(!DATA||!DATA.tree){try{const r=await fetch('/data/savingio-brain-data.json?v=14',{cache:'no-store'});if(!r.ok)return;DATA=await r.json();window.SAVINGIO_BRAIN_DATA=DATA;}catch(_){return;}}
const normalizePath=v=>{let p=String(v||'/');try{p=decodeURI(p)}catch(_){}p=p.split('?')[0].split('#')[0].replace(/\/index\.html$/,'/').replace(/\.html$/,'').replace(/\/$/,'');return p||'/';};
const current=normalizePath(location.pathname);
const validHref=h=>typeof h==='string'&&/^\/(articles|calculators)\/[a-z0-9][a-z0-9-]*(?:\.html)?(?:[?#].*)?$/i.test(h.trim());
const largeLabels={'돈 아끼기':'생활비가 너무 많이 나와요','받을 돈 찾기':'받을 수 있는 돈을 찾고 싶어요','세금 처리하기':'세금 신고·납부가 어려워요','급여·일 처리하기':'월급·퇴직·일 문제를 해결하고 싶어요','생활 문제 해결':'집·차·건강 문제를 해결하고 싶어요','바로 계산하기':'금액을 바로 계산해 보고 싶어요'};
const middleLabels={'전기요금':'전기세가 너무 많이 나왔어요','관리비':'관리비가 예상보다 많이 나왔어요','통신비':'휴대폰·인터넷 요금을 줄이고 싶어요','보험료':'보험료와 보장 내용을 점검하고 싶어요','은행·카드':'은행 수수료와 카드값을 줄이고 싶어요','연금':'연금으로 얼마를 받을지 궁금해요','지원금':'받을 수 있는 지원금이 궁금해요','환급금':'놓친 환급금이 있는지 찾고 싶어요','자동차세':'자동차세를 확인하고 절약하고 싶어요','자동차':'차에 문제가 생기거나 비용이 걱정돼요','건강':'병원비와 건강 문제를 확인하고 싶어요','교육':'교육비와 아이 관련 지원이 궁금해요'};
const dL=v=>largeLabels[v]||v,dM=v=>middleLabels[v]||v;
const records=[];const seen=new Set();
Object.entries(DATA.tree||{}).forEach(([large,mids])=>Object.entries(mids||{}).forEach(([middle,smalls])=>Object.entries(smalls||{}).forEach(([small,items])=>(Array.isArray(items)?items:[]).forEach(item=>{if(!item||!validHref(item.href)||!item.title)return;const key=normalizePath(item.href);if(seen.has(key))return;seen.add(key);records.push({...item,large,middle,small,key,haystack:`${item.title} ${item.description||''} ${item.search_keywords||''} ${large} ${middle} ${small}`});}))));
const nav=document.createElement('aside');nav.id='savingio-brain-nav';nav.innerHTML=`<button class="sbn-close" type="button">×</button><div class="sbn-head"><strong>지금 어떤 문제가 있으세요?</strong><small>카테고리 이름을 몰라도 괜찮아요.<br>상황이나 글 제목을 입력해 보세요.</small></div><form class="sbn-search"><input type="search" placeholder="예: 은행 수수료, 카드값, 전기세"><button type="submit">검색</button></form><div class="sbn-search-status"></div><div class="sbn-context"></div><div class="sbn-tree"></div>`;
const tree=nav.querySelector('.sbn-tree'),context=nav.querySelector('.sbn-context'),form=nav.querySelector('.sbn-search'),input=form.querySelector('input'),status=nav.querySelector('.sbn-search-status');
const renderTree=()=>{let html='';Object.entries(DATA.tree||{}).forEach(([large,mids])=>{let mh='';Object.entries(mids||{}).forEach(([middle,smalls])=>{const group=records.filter(r=>r.large===large&&r.middle===middle);if(!group.length)return;let sh='';Object.entries(smalls||{}).forEach(([small])=>{const items=group.filter(r=>r.small===small);if(!items.length)return;sh+=`<details class="sbn-small"><summary>${esc(small)}<span class="sbn-count">${items.length}</span></summary><ul class="sbn-items">${items.map(r=>`<li><a href="${esc(r.href)}"${r.key===current?' aria-current="page"':''}>${esc(r.title)}</a></li>`).join('')}</ul></details>`;});mh+=`<details class="sbn-middle"><summary>${esc(dM(middle))}<span class="sbn-count">${group.length}</span></summary>${sh}</details>`;});if(mh)html+=`<details class="sbn-large"><summary><span class="sbn-large-title">${esc(dL(large))}</span></summary>${mh}</details>`;});tree.innerHTML=html;status.textContent='카테고리를 펼치거나 검색해 글을 찾으세요';};
const renderSearch=q=>{const terms=relatedTerms(q).map(compact);const found=records.filter(r=>{const hay=compact(r.haystack);return terms.some(t=>t&&hay.includes(t));}).slice(0,50);context.hidden=true;status.textContent=found.length?`검색 결과 ${found.length}개`:'검색 결과가 없습니다';tree.innerHTML=found.length?`<div class="sbn-results">${found.map(r=>`<a class="sbn-result-card" href="${esc(r.href)}"><span class="sbn-result-path">${esc(dL(r.large))} · ${esc(dM(r.middle))}</span><strong class="sbn-result-title">${esc(r.title)}</strong><span class="sbn-result-desc">${esc(r.description||'관련 내용을 확인합니다.')}</span><em class="sbn-result-arrow">›</em></a>`).join('')}</div>`:'<div class="sbn-empty">검색 결과가 없습니다.</div>';};
document.body.append(nav);document.documentElement.classList.add('savingio-brain-ready');renderTree();
input.addEventListener('input',()=>input.value.trim()?renderSearch(input.value):renderTree());form.addEventListener('submit',e=>e.preventDefault());
nav.addEventListener('click',e=>{const a=e.target.closest('a[href]');if(a&&validHref(a.getAttribute('href'))){e.preventDefault();location.assign(a.getAttribute('href'));}});
const button=document.createElement('button');button.className='sbn-mobile-btn';button.type='button';button.textContent='문제 찾기';document.body.append(button);const backdrop=document.createElement('div');backdrop.className='sbn-backdrop';document.body.append(backdrop);const close=()=>document.body.classList.remove('sbn-open');button.onclick=()=>document.body.classList.add('sbn-open');nav.querySelector('.sbn-close').onclick=close;backdrop.onclick=close;
})();