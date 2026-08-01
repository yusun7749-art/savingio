(()=>{
'use strict';
const prefetched=new Set();
const DIRECTORY='/search.html';
const FIXED_ROUTES={
 '홈':'/',
 '생활정보':'/search.html',
 '전체 글':'/articles/',
 '계산기':'/calculators/',
 'Savingio Lab':'/lab/',
 '사이트 탐색':'/categories/',
 '카테고리':'/categories/',
 'About':'/about.html',
 '소개':'/about.html',
 '문의':'/contact.html'
};
function openDirectory(value){const q=String(value||'').trim();if(!q)return;window.location.assign(DIRECTORY+'?q='+encodeURIComponent(q));}
function runDirectorySearch(input){const value=input.value.trim();input.value=value;if(window.SavingioDirectorySearch?.setQuery){window.SavingioDirectorySearch.setQuery(value);return}input.dispatchEvent(new Event('input',{bubbles:true}));}
function installHome(){document.querySelectorAll('form.search').forEach(form=>{const input=form.querySelector('input[type="search"]');if(!input)return;form.action=DIRECTORY;form.method='get';input.name='q';if(form.dataset.searchLocked)return;form.dataset.searchLocked='1';form.addEventListener('submit',event=>{event.preventDefault();event.stopImmediatePropagation();const value=input.value.trim();input.value=value;if(!value){input.focus();return}openDirectory(value);},true);});}
function installExplorer(){document.querySelectorAll('.sbn-search').forEach(form=>{const input=form.querySelector('input[type="search"]');if(!input||form.dataset.searchLocked)return;form.dataset.searchLocked='1';form.action=DIRECTORY;form.method='get';input.name='q';form.addEventListener('submit',event=>{event.preventDefault();event.stopImmediatePropagation();const value=input.value.trim();input.value=value;if(!value){input.focus();return}openDirectory(value);},true);input.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();event.stopImmediatePropagation();openDirectory(input.value);}},true);});}
function installHeaderRoutes(){
 document.querySelectorAll('.savingio-dna-nav a,.savingio-platform-nav a,.site-header nav a,.site-header .nav a').forEach(anchor=>{
  const label=(anchor.textContent||'').replace(/\s+/g,' ').trim();
  const route=FIXED_ROUTES[label];
  if(route){anchor.setAttribute('href',route);anchor.dataset.savingioFixedRoute=route;}
 });
 if(document.documentElement.dataset.savingioRouteGuard==='1')return;
 document.documentElement.dataset.savingioRouteGuard='1';
 document.addEventListener('click',event=>{
  const anchor=event.target.closest?.('a[data-savingio-fixed-route]');
  if(!anchor)return;
  const route=anchor.dataset.savingioFixedRoute;
  if(!route)return;
  event.preventDefault();
  event.stopImmediatePropagation();
  window.location.assign(route);
 },true);
}
function removeDuplicateCategoryRow(){document.querySelectorAll('.search-box .category-row').forEach(row=>row.remove());}
function installDirectory(){removeDuplicateCategoryRow();const input=document.getElementById('articleSearch');if(!input)return;const box=input.closest('.search-box');if(!box)return;if(box.querySelector('#standaloneSearch'))return;let row=box.querySelector('.savingio-search-lock-row');if(!row){row=document.createElement('form');row.className='savingio-search-lock-row';row.setAttribute('role','search');input.parentNode.insertBefore(row,input);row.appendChild(input);const button=document.createElement('button');button.type='submit';button.className='savingio-search-lock-button';button.setAttribute('aria-label','검색 실행');button.textContent='검색';row.appendChild(button);row.addEventListener('submit',event=>{event.preventDefault();runDirectorySearch(input);});}}
function prefetchHref(href){try{const url=new URL(href,location.href);if(url.origin!==location.origin||url.pathname===location.pathname||prefetched.has(url.href))return;prefetched.add(url.href);const link=document.createElement('link');link.rel='prefetch';link.as='document';link.href=url.href;document.head.appendChild(link);}catch(_){}}
function installRoutePrefetch(){if(document.documentElement.dataset.routePrefetch==='1')return;document.documentElement.dataset.routePrefetch='1';const handler=event=>{const anchor=event.target.closest?.('a[href]');if(anchor)prefetchHref(anchor.href);};document.addEventListener('pointerenter',handler,true);document.addEventListener('focusin',handler,true);document.addEventListener('touchstart',handler,{capture:true,passive:true});}
function style(){if(document.getElementById('savingio-search-lock-style'))return;const s=document.createElement('style');s.id='savingio-search-lock-style';s.textContent='.search-box .category-row{display:none!important}.savingio-search-lock-row{display:grid!important;grid-template-columns:minmax(0,1fr) 58px!important;gap:10px!important;align-items:center!important;margin:0!important}.savingio-search-lock-row #articleSearch{width:100%!important;margin:0!important}.savingio-search-lock-button{height:58px!important;border:0!important;border-radius:16px!important;background:#132744!important;color:#fff!important;display:grid!important;place-items:center!important;cursor:pointer!important}';document.head.appendChild(s);}
function install(){style();installHome();installExplorer();installDirectory();installHeaderRoutes();installRoutePrefetch();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
window.addEventListener('pageshow',install);
setInterval(()=>{installExplorer();installHeaderRoutes();},1000);
})();