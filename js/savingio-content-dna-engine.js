(function(){
'use strict';
const ARTICLE=/^\/articles\/(?!$|index(?:\.html)?$)/;
const SELECTORS={
 shell:'.page-shell,.article-layout,.article-grid,.content-with-rail,.article-shell,.article-wrap,.post-layout,.detail-layout',
 main:'.article-main,.article-content,.post-content,.article-column,.post-main,.content-main',
 hero:'.hero,.article-hero,.article-header',
 breadcrumb:'.breadcrumb,[data-sv-component="breadcrumb"]',
 editorial:'.editorial,[data-sv-component="editorial"]',
 answer:'.emergency,#answer,[data-sv-component="quick-answer"]',
 questions:'#questions,.question-list,[data-sv-component="quick-questions"]',
 toc:'.toc,[data-sv-component="toc"]',
 faq:'.faq,[data-sv-component="faq"]',
 related:'.related-list,[data-sv-component="related"]'
};
const first=(s,r=document)=>r.querySelector(s);
const all=(s,r=document)=>[...r.querySelectorAll(s)];
const text=v=>String(v||'').replace(/\s+/g,' ').trim();
const slug=v=>text(v).toLowerCase().replace(/[^0-9a-z가-힣]+/gi,'-').replace(/^-+|-+$/g,'').slice(0,72);
function mark(el,component){if(el&&!el.dataset.svComponent)el.dataset.svComponent=component;return el}
function articleMain(){return first(SELECTORS.main)||first('main article')||first('main')}
function ensureHeadingIds(root){
 const used=new Set(all('[id]').map(el=>el.id));
 all('h2,h3',root).forEach((h,i)=>{if(h.closest(SELECTORS.toc))return;if(h.id){used.add(h.id);return}let id=slug(h.textContent)||`section-${i+1}`,base=id,n=2;while(used.has(id))id=`${base}-${n++}`;h.id=id;used.add(id)});
}
function ensureBreadcrumb(){
 let el=first(SELECTORS.breadcrumb);if(el)return mark(el,'breadcrumb');
 const hero=first(SELECTORS.hero),main=articleMain();if(!hero&&!main)return null;
 const title=text(first('h1')?.textContent)||'글';
 const category=text(first('.badge,.category,.article-category')?.textContent).split('·')[0].trim()||'생활정보';
 el=document.createElement('nav');el.className='breadcrumb';el.setAttribute('aria-label','현재 위치');el.innerHTML=`<a href="/">홈</a> › <a href="/articles/">글 목록</a> › <span>${category}</span> › <span aria-current="page">${title}</span>`;
 (hero||main).parentNode.insertBefore(el,hero||main);return mark(el,'breadcrumb');
}
function ensureToc(root){
 let toc=first(SELECTORS.toc,root);if(toc)return mark(toc,'toc');
 const headings=all('h2',root).filter(h=>!h.closest('.faq,.related-list,.right-rail,[data-sv-role="rail"]'));
 if(headings.length<3)return null;
 ensureHeadingIds(root);toc=document.createElement('nav');toc.className='toc';toc.setAttribute('aria-label','글 목차');toc.innerHTML=`<strong>목차</strong><ul>${headings.map(h=>`<li><a href="#${h.id}">${text(h.textContent)}</a></li>`).join('')}</ul>`;
 const anchor=first(SELECTORS.questions,root)||first(SELECTORS.answer,root)||first(SELECTORS.editorial,root);anchor?anchor.insertAdjacentElement('afterend',toc):root.insertBefore(toc,root.firstElementChild);return mark(toc,'toc');
}
function markExisting(root){
 const map=[['hero',SELECTORS.hero],['editorial',SELECTORS.editorial],['quick-answer',SELECTORS.answer],['quick-questions',SELECTORS.questions],['toc',SELECTORS.toc],['faq',SELECTORS.faq],['related',SELECTORS.related]];
 map.forEach(([name,sel])=>all(sel).forEach(el=>mark(el,name)));
 all('.table-wrap,table',root).forEach(el=>mark(el,el.tagName==='TABLE'?'table':'table-wrap'));
 all('.checklist,.answer-list,.steps',root).forEach(el=>mark(el,'checklist'));
}
function audit(root){
 const required={breadcrumb:SELECTORS.breadcrumb,hero:SELECTORS.hero,editorial:SELECTORS.editorial,answer:SELECTORS.answer,questions:SELECTORS.questions,toc:SELECTORS.toc,faq:SELECTORS.faq,related:SELECTORS.related};
 const missing=Object.entries(required).filter(([,sel])=>!first(sel)).map(([key])=>key);
 const h1=all('h1').length,sections=all(':scope > section',root).length,links=all('a[href]',root).length;
 const report={path:location.pathname,status:missing.length||h1!==1?'incomplete':'complete',missing,h1Count:h1,sectionCount:sections,internalLinkCount:links,checkedAt:new Date().toISOString()};
 document.documentElement.dataset.svContentDna=report.status;document.body.dataset.svContentMissing=missing.join(',');
 window.SavingioContentDNAReport=report;document.dispatchEvent(new CustomEvent('savingio-content-dna-audit',{detail:report}));return report;
}
function install(){
 if(!ARTICLE.test(location.pathname))return null;
 const root=articleMain();if(!root)return null;
 document.documentElement.classList.add('savingio-content-dna-ready');mark(root,'article-body');markExisting(root);ensureHeadingIds(root);ensureBreadcrumb();ensureToc(root);return audit(root);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
window.SavingioContentDNAEngine={install,audit,ensureToc,ensureBreadcrumb,ensureHeadingIds};
})();