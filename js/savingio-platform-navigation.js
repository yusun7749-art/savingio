(function(){
'use strict';
const VERSION='20260724-search1';
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
function fireSearch(input){
 const value=input.value.trim();
 input.value=value;
 ['input','change','keyup'].forEach(type=>input.dispatchEvent(new Event(type,{bubbles:true})));
 const url=new URL(location.href);
 if(value)url.searchParams.set('q',value);else url.searchParams.delete('q');
 history.replaceState(null,'',url.pathname+url.search+url.hash);
}
function installSearchBridge(){
 document.querySelectorAll('form.search').forEach(form=>{
  form.action='/articles/';form.method='get';
  const input=form.querySelector('input[type="search"]');
  if(!input)return;
  input.name='q';
  form.addEventListener('submit',event=>{input.value=input.value.trim();if(!input.value){event.preventDefault();input.focus();}});
 });
 const input=document.getElementById('articleSearch');
 if(!input)return;
 const box=input.closest('.search-box');
 if(box&&!box.querySelector('.savingio-article-search-row')){
  const row=document.createElement('div');row.className='savingio-article-search-row';
  input.parentNode.insertBefore(row,input);row.appendChild(input);
  const button=document.createElement('button');button.type='button';button.className='savingio-article-search-button';button.setAttribute('aria-label','생활정보 검색');button.innerHTML='<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path></svg>';
  row.appendChild(button);
  button.addEventListener('click',()=>fireSearch(input));
  input.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();fireSearch(input);}});
  const style=document.createElement('style');style.textContent='.savingio-article-search-row{display:grid;grid-template-columns:minmax(0,1fr) 58px;gap:10px;align-items:center}.savingio-article-search-row #articleSearch{width:100%;margin:0}.savingio-article-search-button{height:58px;border:0;border-radius:16px;background:#132744;color:#fff;display:grid;place-items:center;cursor:pointer}.savingio-article-search-button:hover{filter:brightness(1.08)}@media(max-width:560px){.savingio-article-search-row{grid-template-columns:minmax(0,1fr) 52px}.savingio-article-search-button{height:52px}}';document.head.appendChild(style);
 }
 const query=new URLSearchParams(location.search).get('q');
 if(query!==null){input.value=query;requestAnimationFrame(()=>setTimeout(()=>fireSearch(input),0));}
}
async function install(){
 addCss(`/css/savingio-tokens.css?v=${VERSION}`,'savingioTokens');
 addCss(`/css/savingio-master-template.css?v=${VERSION}`,'savingioMaster');
 addCss(`/css/savingio-components.css?v=${VERSION}`,'savingioComponents');
 addCss(`/css/savingio-brain-navigation.css?v=${VERSION}`,'savingioExplorer');
 const header=document.querySelector('.site-header .header-inner,.savingio-dna-header-inner,.top .wrap.nav');
 if(header){
  header.querySelectorAll('.nav,.savingio-platform-nav,.savingio-unified-nav').forEach(n=>n.remove());
  header.insertAdjacentHTML('beforeend',markup('savingio-platform-nav'));
 }
 installSearchBridge();
 await addScript(`/js/savingio-template-engine.js?v=${VERSION}`,'savingioTemplateEngine');
 if(!window.SAVINGIO_BRAIN_DATA)await addScript(`/data/savingio-brain-data.js?v=${VERSION}`,'savingioBrainData');
 if(!document.querySelector('script[src*="savingio-brain-navigation.js"]'))await addScript(`/js/savingio-brain-navigation.js?v=${VERSION}`,'savingioBrainEngine');
 return true;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
window.SavingioPlatformNavigation={install,items:ITEMS.slice()};
})();