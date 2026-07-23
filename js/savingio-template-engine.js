(function(){
'use strict';
const ARTICLE_PATH=/^\/articles\//;
const PAGE_HERO='.info-hero,.sv2-hero,.portal-hero,.page-hero,.lab-hero,.savingio-lab-hero,.about-hero,.contact-hero,.policy-hero,.hero,.article-hero,.article-header';
const ARTICLE_SHELL='.page-shell,.article-layout,.article-grid,.content-with-rail,.article-shell,.article-wrap,.post-layout,.detail-layout';
const ARTICLE_MAIN='.article-main,.article-content,.post-content,.article-column,.post-main,.content-main';
const RIGHT_RAIL='.right-rail,.article-sidebar,.sidebar-right,.right-sidebar,.post-sidebar,.detail-sidebar';
const CONTENT_SHELL='.info-shell,.portal-shell,.sv2-shell,.lab-grid,.content-shell,.main-content,.policy-wrap,.calculator-shell,.category-shell,.categories-shell';
const FOOTER='.site-footer,.savingio-footer,footer';
const LEGACY_WIDGETS='.sbn-popular,.popular-top5,.popular-posts,.sidebar-popular,.top5,.popular-list,[class*="popular-top"],#popularTop5';
const RAIL_PURPOSES=['action','tool','same-category','related','next'];
const RAIL_LABELS={
 action:'지금 해야 할 행동',
 tool:'계산기/점검도구',
 'same-category':'같은 카테고리 글',
 related:'함께 볼 관련 글',
 next:'다음 단계/주의사항'
};
const RAIL_HINTS={
 action:['지금 해야','바로 해야','먼저 할','행동','확인부터'],
 tool:['계산기','점검도구','도구','체크 도구','공식기관'],
 'same-category':['같은 카테고리','카테고리 글','같은 주제'],
 related:['함께 볼','관련 글','관련글','이어지는 글'],
 next:['다음 단계','주의사항','주의할 점','마지막 확인']
};
function first(selector,root=document){return root.querySelector(selector)}
function all(selector,root=document){return [...root.querySelectorAll(selector)]}
function mark(el,key,value){if(el)el.dataset[key]=value;return el}
function pageType(){
 const path=location.pathname;
 if(ARTICLE_PATH.test(path)&&!/^\/articles\/?$/.test(path))return'article';
 if(/^\/calculators\//.test(path))return'calculator';
 if(/^\/lab\//.test(path))return'lab';
 if(/^\/categories\//.test(path))return'category';
 if(/^\/articles\/?$/.test(path))return'directory';
 if(/about/.test(path))return'about';
 if(/contact/.test(path))return'contact';
 if(/privacy|policy|terms|editorial/.test(path))return'policy';
 return'standard';
}
function removeLegacyWidgets(root=document){
 all(LEGACY_WIDGETS,root).forEach(el=>el.remove());
 all('style',root).forEach(style=>{if(/sbn-popular|popular-top5|인기 글 TOP 5/.test(style.textContent||''))style.remove()});
}
function guardLegacyWidgets(){
 removeLegacyWidgets();
 if(window.__savingioLegacyGuard)return;
 window.__savingioLegacyGuard=true;
 const observer=new MutationObserver(mutations=>{
  for(const mutation of mutations){
   for(const node of mutation.addedNodes){
    if(!(node instanceof Element))continue;
    if(node.matches(LEGACY_WIDGETS))node.remove();else removeLegacyWidgets(node);
   }
  }
 });
 observer.observe(document.documentElement,{childList:true,subtree:true});
}
function normalizeHero(){
 let hero=first(PAGE_HERO);
 if(!hero){const candidate=first('main>section:first-child');if(candidate&&first('h1',candidate))hero=candidate}
 if(!hero&&ARTICLE_PATH.test(location.pathname)){const h1=first('main h1');if(h1)hero=h1.closest('header,section,article,div')}
 if(hero){mark(hero,'svFrame','hero');const title=first('h1',hero);if(title)mark(title,'svSlot','title');const copy=first('p,.lead,.hero-copy,.article-lead',hero);if(copy)mark(copy,'svSlot','description')}
}
function railText(card){return (first('h1,h2,h3,h4,strong,.rail-kicker',card)?.textContent||card.textContent||'').replace(/\s+/g,' ').trim()}
function inferRailPurpose(card,used){
 const explicit=card.dataset.svRailPurpose||card.dataset.railPurpose;
 if(RAIL_PURPOSES.includes(explicit)&&!used.has(explicit))return explicit;
 const text=railText(card);
 for(const purpose of RAIL_PURPOSES){
  if(used.has(purpose))continue;
  if(RAIL_HINTS[purpose].some(hint=>text.includes(hint)))return purpose;
 }
 return RAIL_PURPOSES.find(purpose=>!used.has(purpose))||'extra';
}
function normalizeRail(rail){
 if(!rail)return null;
 mark(rail,'svRole','rail');
 const cards=all(':scope > section,:scope > aside,:scope > div',rail).filter(el=>el.children.length||el.textContent.trim());
 const used=new Set(),mapped=new Map(),extras=[];
 cards.forEach(card=>{
  const purpose=inferRailPurpose(card,used);
  mark(card,'svComponent','card');
  if(purpose==='extra'){extras.push(card);return}
  used.add(purpose);mapped.set(purpose,card);mark(card,'svRailPurpose',purpose);card.hidden=false;
  const heading=first('h1,h2,h3,h4',card);if(heading&&!heading.dataset.svOriginalTitle)heading.dataset.svOriginalTitle=heading.textContent.trim();
 });
 RAIL_PURPOSES.forEach(purpose=>{const card=mapped.get(purpose);if(card)rail.appendChild(card)});
 extras.forEach(card=>{card.hidden=true;mark(card,'svRailPurpose','extra');rail.appendChild(card)});
 const missing=RAIL_PURPOSES.filter(purpose=>!mapped.has(purpose));
 rail.dataset.svRailCount=String(mapped.size);
 rail.dataset.svRailStatus=missing.length?'incomplete':'complete';
 missing.length?rail.dataset.svRailMissing=missing.join(','):delete rail.dataset.svRailMissing;
 document.body.dataset.svRailStatus=rail.dataset.svRailStatus;
 document.dispatchEvent(new CustomEvent('savingio-rail-audit',{detail:{status:rail.dataset.svRailStatus,count:mapped.size,missing,labels:missing.map(key=>RAIL_LABELS[key])}}));
 return{status:rail.dataset.svRailStatus,count:mapped.size,missing};
}
function normalizeArticle(){
 let shell=first(ARTICLE_SHELL);
 let rail=first(RIGHT_RAIL,shell||document);
 if(!shell&&rail)shell=rail.parentElement;
 if(!shell||!rail)return false;
 mark(shell,'svLayout','article');
 const main=first(ARTICLE_MAIN,shell)||[...shell.children].find(el=>el!==rail)||first('main');
 mark(main,'svRole','main');
 normalizeRail(rail);
 return true;
}
function normalizeContent(){const shell=first(CONTENT_SHELL)||first('main');if(shell)mark(shell,'svLayout',pageType())}
function normalizeFooter(){
 const footer=first(FOOTER);if(!footer)return;
 mark(footer,'svFrame','footer');
 const inner=first('.footer-inner,.savingio-footer-inner,.wrap',footer)||footer.firstElementChild;
 if(inner)mark(inner,'svRole','footer-inner');
}
function normalizeComponents(){
 all('.portal-panel,.sv2-card,.lab-card,.trust-grid>div,.about-card,.content-card,.article-card,.calculator-card,.tool-card,.related-card,.rail-card,.side-card,.info-card,.category-card,.calculator-item,.lab-item').forEach(el=>mark(el,'svComponent','card'));
 all('.article-grid,.calculator-grid,.tool-grid,.card-grid,.lab-grid,.portal-actions,.trust-grid,.category-grid,.categories-grid').forEach(el=>mark(el,'svComponent','card-grid'));
 all('a.btn,button.btn,.button,.cta,.primary-button,.secondary-button').forEach(el=>mark(el,'svComponent','button'));
 all('.secondary-button,.btn.secondary,.button.secondary').forEach(el=>mark(el,'variant','secondary'));
 all('input[type="search"],input[type="text"],input[type="number"],select,textarea').forEach(el=>mark(el,'svComponent','input'));
}
function install(){
 document.documentElement.classList.add('savingio-master-ready');
 document.body.dataset.svPage=pageType();
 guardLegacyWidgets();
 normalizeHero();
 if(!normalizeArticle())normalizeContent();
 normalizeFooter();
 normalizeComponents();
 document.dispatchEvent(new CustomEvent('savingio-template-ready'));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
window.SavingioTemplateEngine={install,removeLegacyWidgets,normalizeHero,normalizeArticle,normalizeRail,normalizeFooter,normalizeComponents,pageType};
})();