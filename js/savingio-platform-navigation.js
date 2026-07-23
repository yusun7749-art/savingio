(function(){
'use strict';
const VERSION='20260723-master6';
const ITEMS=[
 {label:'홈',href:'/'},{label:'생활정보',href:'/articles/'},{label:'계산기',href:'/calculators/'},
 {label:'Savingio Lab',href:'/lab/',lab:true},{label:'사이트 탐색',href:'/categories/'},{label:'About',href:'/about.html'}
];
const path=location.pathname.replace(/index\.html$/,'').replace(/\.html$/,'');
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function addCss(href,key){if(document.querySelector(`link[data-${key}]`))return;const l=document.createElement('link');l.rel='stylesheet';l.href=href;l.dataset[key]='true';document.head.appendChild(l)}
function addScript(src,key){return new Promise(resolve=>{if(document.querySelector(`script[data-${key}]`)){resolve();return}const s=document.createElement('script');s.src=src;s.dataset[key]='true';s.onload=resolve;s.onerror=resolve;document.body.appendChild(s)})}
function current(href){if(href==='/')return path==='/';return path.startsWith(href.replace(/index\.html$/,'').replace(/\.html$/,''))}
function markup(cls){return `<nav class="${cls}" aria-label="Savingio 주요 메뉴">${ITEMS.map(i=>`<a href="${esc(i.href)}"${i.lab?' class="spn-lab"':''}${current(i.href)?' aria-current="page"':''}>${esc(i.label)}</a>`).join('')}</nav>`}
async function install(){
 addCss(`/css/savingio-master-template.css?v=${VERSION}`,'savingioMaster');
 addCss(`/css/savingio-brain-navigation.css?v=${VERSION}`,'savingioExplorer');
 const header=document.querySelector('.site-header .header-inner,.savingio-dna-header-inner,.top .wrap.nav');
 if(header){
  header.querySelectorAll('.nav,.savingio-platform-nav,.savingio-unified-nav').forEach(n=>n.remove());
  header.insertAdjacentHTML('beforeend',markup('savingio-platform-nav'));
 }
 if(!window.SAVINGIO_BRAIN_DATA)await addScript(`/data/savingio-brain-data.js?v=${VERSION}`,'savingioBrainData');
 if(!document.querySelector('script[src*="savingio-brain-navigation.js"]'))await addScript(`/js/savingio-brain-navigation.js?v=${VERSION}`,'savingioBrainEngine');
 return true;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
window.SavingioPlatformNavigation={install,items:ITEMS.slice()};
})();
