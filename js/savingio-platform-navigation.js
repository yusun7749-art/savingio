(function(){
'use strict';
const VERSION='20260731-search-final1';
const DIRECTORY='/search.html';
const ITEMS=[
 {label:'홈',href:'/'},{label:'생활정보',href:DIRECTORY},{label:'계산기',href:'/calculators/'},
 {label:'사이트 탐색',href:'/categories/'},{label:'About',href:'/about.html'}
];
const path=location.pathname.replace(/index\.html$/,'').replace(/\.html$/,'');
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function addCss(href,key){if(document.querySelector(`link[data-${key}]`))return;const l=document.createElement('link');l.rel='stylesheet';l.href=href;l.dataset[key]='true';document.head.appendChild(l)}
function addScript(src,key){return new Promise(resolve=>{if(document.querySelector(`script[data-${key}]`)){resolve();return}const s=document.createElement('script');s.src=src;s.dataset[key]='true';s.onload=resolve;s.onerror=resolve;document.body.appendChild(s)})}
function current(href){if(href==='/')return path==='/';return path.startsWith(href.replace(/index\.html$/,'').replace(/\.html$/,''))}
function markup(cls){return `<nav class="${cls}" aria-label="Savingio 주요 메뉴">${ITEMS.map(i=>`<a href="${esc(i.href)}"${current(i.href)?' aria-current="page"':''}>${esc(i.label)}</a>`).join('')}</nav>`}
function openDirectory(value){const q=String(value||'').trim();if(!q)return false;window.location.assign(DIRECTORY+'?q='+encodeURIComponent(q));return true;}
function fireSearch(input){const value=input.value.trim();input.value=value;if(window.SavingioDirectorySearch?.setQuery){window.SavingioDirectorySearch.setQuery(value);return}input.dispatchEvent(new Event('input',{bubbles:true}));}
function installSearchBridge(){
 document.querySelectorAll('form.search').forEach(form=>{form.action=DIRECTORY;form.method='get';const input=form.querySelector('input[type="search"]');if(!input)return;input.name='q';if(form.dataset.routeFixed)return;form.dataset.routeFixed='1';form.addEventListener('submit',event=>{event.preventDefault();event.stopImmediatePropagation();const value=input.value.trim();input.value=value;if(!value){input.focus();return}openDirectory(value);},true);});
 const input=document.getElementById('articleSearch');if(!input)return;
 const query=new URLSearchParams(location.search).get('q');if(query!==null){input.value=query;requestAnimationFrame(()=>setTimeout(()=>fireSearch(input),0));}
}
function explorerAllowed(){return path.startsWith('/articles/')||path==='/articles'||path.startsWith('/categories/')||path==='/categories';}
function removeExplorer(){document.querySelectorAll('#savingio-brain-nav,.sbn-mobile-btn,.sbn-backdrop').forEach(node=>node.remove());document.documentElement.classList.remove('savingio-brain-ready');document.body.classList.remove('sbn-open');}
async function install(){
 const header=document.querySelector('.site-header .header-inner,.savingio-dna-header-inner,.top .wrap.nav');
 if(header){header.querySelectorAll('.nav,.savingio-platform-nav,.savingio-unified-nav').forEach(n=>n.remove());header.insertAdjacentHTML('beforeend',markup('savingio-platform-nav'));}
 installSearchBridge();
 if(!explorerAllowed()){removeExplorer();return true;}
 addCss(`/css/savingio-tokens.css?v=${VERSION}`,'savingioTokens');addCss(`/css/savingio-master-template.css?v=${VERSION}`,'savingioMaster');addCss(`/css/savingio-components.css?v=${VERSION}`,'savingioComponents');addCss(`/css/savingio-brain-navigation.css?v=${VERSION}`,'savingioExplorer');
 await addScript(`/js/savingio-template-engine.js?v=${VERSION}`,'savingioTemplateEngine');
 if(!window.SAVINGIO_BRAIN_DATA)await addScript(`/data/savingio-brain-data.js?v=${VERSION}`,'savingioBrainData');
 if(!document.querySelector('script[src*="savingio-brain-navigation.js"]'))await addScript(`/js/savingio-brain-navigation.js?v=${VERSION}`,'savingioBrainEngine');
 return true;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
window.SavingioPlatformNavigation={install,items:ITEMS.slice()};
})();