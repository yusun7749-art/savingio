(function(){
'use strict';
const ARTICLE_PATH=/^\/articles\//;
const PAGE_HERO='.info-hero,.sv2-hero,.portal-hero,.page-hero,.lab-hero,.savingio-lab-hero,.about-hero,.contact-hero,.policy-hero,.calculator-hero,.category-hero,.hero,.article-hero,.article-header';
const ARTICLE_SHELL='.page-shell,.article-layout,.content-with-rail,.article-shell,.article-wrap,.post-layout,.detail-layout';
const ARTICLE_MAIN='.article-main,.article-content,.post-content,.article-column,.post-main,.content-main';
const RIGHT_RAIL='.right-rail,.article-sidebar,.sidebar-right,.right-sidebar,.post-sidebar,.detail-sidebar';
const CONTENT_SHELL='.info-shell,.portal-shell,.sv2-shell,.content-shell,.main-content,.policy-wrap,.calculator-shell,.category-shell,.categories-shell,.lab-shell';
const FOOTER='.site-footer,.savingio-footer,footer';
const LEGACY_WIDGETS='.sbn-popular,.popular-top5,.popular-posts,.sidebar-popular,.top5,.popular-list,[class*="popular-top"],#popularTop5';
const RAIL_PURPOSES=['action','tool','same-category','related','next'];
const PAGE_GRIDS={
 directory:'.article-grid,.content-grid,.directory-grid',
 calculator:'.calculator-grid,.tool-grid,.calculator-list',
 lab:'.lab-grid,.experiment-grid,.lab-list',
 category:'.category-grid,.categories-grid,.category-list',
 about:'.trust-grid,.portal-actions,.about-grid',
 standard:'.card-grid,.content-grid'
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
 if(/privacy|terms|policy|disclaimer|cookie/.test(path))return'policy';
 return'standard';
}
function removeLegacyWidgets(root=document){
 all(LEGACY_WIDGETS,root).forEach(el=>el.remove());
 all('style',root).forEach(style=>{if(/sbn-popular|popular-top5|인기 글 TOP 5/.test(style.textContent||''))style.remove()});
}
function guardLegacyWidgets(){
 removeLegacyWidgets();
 if(window.__savingioLegacyWidgetGuard)return;
 window.__savingioLegacyWidgetGuard=true;
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
 if(!hero){const h1=first('main h1');if(h1)hero=h1.parentElement}
 if(!hero)return null;
 mark(hero,'svFrame','hero');
 const title=first('h1',hero);if(title)mark(title,'svSlot','title');
 const copy=first('p,.lead,.hero-copy,.article-lead',hero);if(copy)mark(copy,'svSlot','description');
 return hero;
}
function normalizeRail(rail){
 if(!rail)return;
 mark(rail,'svRole','rail');
 const cards=all(':scope > section,:scope > aside,:scope > div',rail).filter(el=>el.children.length||el.textContent.trim());
 cards.slice(0,5).forEach((card,index)=>{mark(card,'svComponent','card');mark(card,'svRailPurpose',RAIL_PURPOSES[index])});
 cards.slice(5).forEach(card=>card.hidden=true);
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
function normalizeContent(type=pageType()){
 const shell=first(CONTENT_SHELL)||first('main');
 if(!shell)return null;
 mark(shell,'svLayout',type);
 mark(shell,'svRole','page-root');
 const gridSelector=PAGE_GRIDS[type]||PAGE_GRIDS.standard;
 all(gridSelector,shell).forEach(grid=>mark(grid,'svComponent','card-grid'));
 return shell;
}
function normalizeFooter(){
 const footer=first(FOOTER);if(!footer)return;
 mark(footer,'svFrame','footer');
 const inner=first('.footer-inner,.savingio-footer-inner,.wrap',footer)||footer.firstElementChild;
 if(inner)mark(inner,'svRole','footer-inner');
}
function normalizeComponents(){
 all('.portal-panel,.sv2-card,.lab-card,.trust-grid>div,.about-card,.content-card,.article-card,.calculator-card,.tool-card,.related-card,.rail-card,.side-card,.info-card,.category-card,.calculator-item,.lab-item,.portal-action').forEach(el=>mark(el,'svComponent','card'));
 all('.article-grid,.calculator-grid,.tool-grid,.card-grid,.lab-grid,.portal-actions,.trust-grid,.category-grid,.categories-grid,.content-grid,.directory-grid').forEach(el=>mark(el,'svComponent','card-grid'));
 all('a.btn,button.btn,.button,.cta,.primary-button,.secondary-button').forEach(el=>mark(el,'svComponent','button'));
 all('.secondary-button,.btn.secondary,.button.secondary').forEach(el=>mark(el,'variant','secondary'));
 all('input[type="search"],input[type="text"],input[type="number"],select,textarea').forEach(el=>mark(el,'svComponent','input'));
}
function install(){
 const type=pageType();
 document.documentElement.classList.add('savingio-master-ready');
 document.body.dataset.svPage=type;
 guardLegacyWidgets();
 normalizeHero();
 if(type==='article'){if(!normalizeArticle())normalizeContent(type)}else normalizeContent(type);
 normalizeFooter();
 normalizeComponents();
 document.dispatchEvent(new CustomEvent('savingio-template-ready',{detail:{pageType:type}}));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
window.SavingioTemplateEngine={install,removeLegacyWidgets,normalizeHero,normalizeArticle,normalizeContent,normalizeFooter,normalizeComponents,pageType};
})();