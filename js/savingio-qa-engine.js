(function(){
'use strict';
const ARTICLE=/^\/articles\/(?!$|index(?:\.html)?$)/;
const q=(s,r=document)=>r.querySelector(s);
const qa=(s,r=document)=>[...r.querySelectorAll(s)];
const txt=v=>String(v||'').replace(/\s+/g,' ').trim();
const normalizePath=href=>{try{const u=new URL(href,location.origin);return u.origin===location.origin?u.pathname.replace(/index\.html$/,'').replace(/\.html$/,'').replace(/\/$/,'')||'/':''}catch{return''}};
const SELECTORS={
 breadcrumb:'.breadcrumb,[data-sv-component="breadcrumb"]',
 hero:'.hero,.article-hero,.article-header,[data-sv-component="hero"]',
 editorial:'.editorial,[data-sv-component="editorial"]',
 answer:'.emergency,#answer,[data-sv-component="quick-answer"]',
 questions:'#questions,.question-list,[data-sv-component="quick-questions"]',
 toc:'.toc,[data-sv-component="toc"]',
 faq:'.faq,[data-sv-component="faq"]',
 related:'.related-list,[data-sv-component="related"]',
 rail:'.right-rail,.article-sidebar,.sidebar-right,.right-sidebar,.post-sidebar,.detail-sidebar,[data-sv-role="rail"]',
 main:'.article-main,.article-content,.post-content,.article-column,.post-main,.content-main,main article'
};
function issue(code,severity,message,detail={}){return{code,severity,message,...detail}}
function inspectLinks(root,issues){
 const current=normalizePath(location.href),seen=new Map();let internal=0,external=0,empty=0,self=0,duplicates=0;
 qa('a',root).forEach((a,i)=>{const raw=(a.getAttribute('href')||'').trim();if(!raw||raw==='#'){empty++;issues.push(issue('LINK_EMPTY','warning','빈 링크가 있습니다.',{index:i,text:txt(a.textContent)}));return}if(/^(mailto:|tel:|javascript:)/i.test(raw))return;const path=normalizePath(raw);if(path){internal++;if(path===current&&!raw.includes('#')){self++;issues.push(issue('LINK_SELF','warning','현재 글을 다시 가리키는 링크가 있습니다.',{href:raw,text:txt(a.textContent)}))}const key=path+(raw.includes('#')?raw.slice(raw.indexOf('#')):'');const n=(seen.get(key)||0)+1;seen.set(key,n);if(n>1){duplicates++;issues.push(issue('LINK_DUPLICATE','info','동일 링크가 반복됩니다.',{href:raw,text:txt(a.textContent)}))}}else if(/^https?:/i.test(raw))external++;
 });
 return{internal,external,empty,self,duplicates};
}
function inspectToc(issues){
 const toc=q(SELECTORS.toc);if(!toc)return{links:0,broken:0};let broken=0;const links=qa('a[href^="#"]',toc);links.forEach(a=>{const id=decodeURIComponent(a.getAttribute('href').slice(1));if(!id||!document.getElementById(id)){broken++;issues.push(issue('TOC_BROKEN','error','목차 링크 대상이 없습니다.',{href:a.getAttribute('href'),text:txt(a.textContent)}))}});return{links:links.length,broken};
}
function inspectHeadings(root,issues){
 const h1=qa('h1').length,h2=qa('h2',root).length,h3=qa('h3',root).length;const ids=qa('[id]'),seen=new Set();let duplicateIds=0;
 ids.forEach(el=>{if(seen.has(el.id)){duplicateIds++;issues.push(issue('ID_DUPLICATE','error','중복 ID가 있습니다.',{id:el.id}))}seen.add(el.id)});
 if(h1!==1)issues.push(issue('H1_COUNT','error','H1은 정확히 1개여야 합니다.',{count:h1}));
 if(h2<3)issues.push(issue('H2_LOW','warning','본문 H2가 3개 미만입니다.',{count:h2}));
 return{h1,h2,h3,duplicateIds};
}
function inspectSeo(issues){
 const title=txt(document.title),description=q('meta[name="description"]')?.content?.trim()||'',canonical=q('link[rel="canonical"]')?.href||'',ogTitle=q('meta[property="og:title"]')?.content||'',ogDescription=q('meta[property="og:description"]')?.content||'',ogUrl=q('meta[property="og:url"]')?.content||'',schemas=qa('script[type="application/ld+json"]');
 if(title.length<15||title.length>70)issues.push(issue('SEO_TITLE','warning','title 길이를 확인하세요.',{length:title.length}));
 if(description.length<70||description.length>180)issues.push(issue('SEO_DESCRIPTION','warning','meta description 길이를 확인하세요.',{length:description.length}));
 if(!canonical)issues.push(issue('SEO_CANONICAL','error','canonical이 없습니다.'));
 if(!ogTitle||!ogDescription||!ogUrl)issues.push(issue('SEO_OG','warning','Open Graph 필수 항목이 누락됐습니다.',{ogTitle:!!ogTitle,ogDescription:!!ogDescription,ogUrl:!!ogUrl}));
 if(!schemas.length)issues.push(issue('SEO_SCHEMA','warning','구조화 데이터가 없습니다.'));
 return{titleLength:title.length,descriptionLength:description.length,canonical:!!canonical,ogComplete:!!(ogTitle&&ogDescription&&ogUrl),schemaCount:schemas.length};
}
function inspectContent(root,issues){
 const bodyText=txt(root?.innerText||'');const chars=bodyText.replace(/\s/g,'').length,tables=qa('table',root).length,checklists=qa('.checklist,.answer-list,.steps',root).length,faqItems=qa('.faq details,[data-sv-component="faq"] details',root).length,relatedLinks=qa('.related-list a,[data-sv-component="related"] a',root).length;
 if(chars<3500)issues.push(issue('CONTENT_SHORT','error','본문 분량이 3,500자 미만입니다.',{characters:chars}));else if(chars<5000)issues.push(issue('CONTENT_BELOW_TARGET','warning','본문이 Savingio 목표 5,000자보다 짧습니다.',{characters:chars}));
 if(!tables)issues.push(issue('CONTENT_TABLE','warning','비교표가 없습니다.'));
 if(!checklists)issues.push(issue('CONTENT_CHECKLIST','warning','체크리스트 또는 단계 목록이 없습니다.'));
 if(faqItems<3)issues.push(issue('CONTENT_FAQ','warning','FAQ가 3개 미만입니다.',{count:faqItems}));
 if(relatedLinks<3)issues.push(issue('CONTENT_RELATED','warning','관련 글 링크가 3개 미만입니다.',{count:relatedLinks}));
 return{characters:chars,tables,checklists,faqItems,relatedLinks};
}
function inspectRequired(issues){
 const result={};Object.entries({breadcrumb:SELECTORS.breadcrumb,hero:SELECTORS.hero,editorial:SELECTORS.editorial,answer:SELECTORS.answer,questions:SELECTORS.questions,toc:SELECTORS.toc,faq:SELECTORS.faq,related:SELECTORS.related,rail:SELECTORS.rail}).forEach(([key,selector])=>{result[key]=!!q(selector);if(!result[key])issues.push(issue('REQUIRED_'+key.toUpperCase(),'error',`${key} 필수 구성요소가 없습니다.`))});return result;
}
function inspectRail(issues){
 const rail=q(SELECTORS.rail);if(!rail)return{exists:false,count:0,purposes:[],missing:['action','tool','same-category','related','next'],emptyCards:0};
 const cards=qa(':scope > section,:scope > aside,:scope > div',rail).filter(el=>!el.hidden),purposes=cards.map(c=>c.dataset.svRailPurpose).filter(Boolean),required=['action','tool','same-category','related','next'],missing=required.filter(x=>!purposes.includes(x));let emptyCards=0;
 cards.forEach(card=>{if(!q('a[href],button',card)){emptyCards++;issues.push(issue('RAIL_EMPTY','warning','우측 카드에 실행 가능한 링크나 버튼이 없습니다.',{purpose:card.dataset.svRailPurpose||''}))}});
 if(cards.length!==5)issues.push(issue('RAIL_COUNT','error','우측 카드는 정확히 5개여야 합니다.',{count:cards.length}));
 if(missing.length)issues.push(issue('RAIL_PURPOSE','error','우측 카드 목적이 누락됐습니다.',{missing}));
 return{exists:true,count:cards.length,purposes,missing,emptyCards,status:rail.dataset.svRailStatus||''};
}
function inspectLegacy(issues){const selectors='.sbn-popular,.popular-top5,.popular-posts,.sidebar-popular,.top5,.popular-list,[class*="popular-top"],#popularTop5,figure.thumb';const found=qa(selectors);if(found.length)issues.push(issue('LEGACY_WIDGET','warning','삭제 대상 레거시 위젯 또는 본문 썸네일이 남아 있습니다.',{count:found.length}));return{count:found.length}}
function score(issues){let value=100;issues.forEach(i=>{value-=i.severity==='error'?10:i.severity==='warning'?4:1});return Math.max(0,value)}
function audit(){
 if(!ARTICLE.test(location.pathname))return null;const root=q(SELECTORS.main)||q('main');if(!root)return null;const issues=[];
 const report={version:'20260723-qa1',path:location.pathname,checkedAt:new Date().toISOString(),required:inspectRequired(issues),headings:inspectHeadings(root,issues),toc:inspectToc(issues),content:inspectContent(root,issues),links:inspectLinks(root,issues),rail:inspectRail(issues),seo:inspectSeo(issues),legacy:inspectLegacy(issues)};
 report.issues=issues;report.summary={errors:issues.filter(i=>i.severity==='error').length,warnings:issues.filter(i=>i.severity==='warning').length,info:issues.filter(i=>i.severity==='info').length};report.score=score(issues);report.status=report.summary.errors?'FAIL':report.summary.warnings?'WARNING':'PASS';
 document.documentElement.dataset.svQa=report.status.toLowerCase();document.body.dataset.svQaScore=String(report.score);window.SavingioQAReport=report;document.dispatchEvent(new CustomEvent('savingio-qa-audit',{detail:report}));return report;
}
function install(){return audit()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,0),{once:true});else setTimeout(install,0);
document.addEventListener('savingio-link-audit',()=>setTimeout(audit,0));
window.SavingioQAEngine={install,audit};
})();