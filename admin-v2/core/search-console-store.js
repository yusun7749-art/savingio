(() => {
  'use strict';

  if(window.SavingioV2SearchConsoleStore)throw new Error('Search Console Store already exists');

  const STORAGE_KEY='savingio-admin-v2-search-console';
  const PROPERTY='https://savingio.com/';
  const STATES=Object.freeze(['unverified','verified','warning','error']);
  const clone=value=>JSON.parse(JSON.stringify(value));
  const now=()=>new Date().toISOString();
  const defaults=Object.freeze({
    property:PROPERTY,
    connection:'unverified',
    sitemap:'unverified',
    urlInspection:'unverified',
    indexing:'unverified',
    crawl:'unverified',
    indexedPages:null,
    excludedPages:null,
    lastChecked:'',
    note:'외부 API 미연결 · 운영자 확인 필요',
    history:[]
  });

  function normalizeState(value){return STATES.includes(value)?value:'unverified';}
  function normalize(value={}){
    return {
      property:PROPERTY,
      connection:normalizeState(value.connection),
      sitemap:normalizeState(value.sitemap),
      urlInspection:normalizeState(value.urlInspection),
      indexing:normalizeState(value.indexing),
      crawl:normalizeState(value.crawl),
      indexedPages:Number.isFinite(Number(value.indexedPages))?Math.max(0,Number(value.indexedPages)):null,
      excludedPages:Number.isFinite(Number(value.excludedPages))?Math.max(0,Number(value.excludedPages)):null,
      lastChecked:String(value.lastChecked||''),
      note:String(value.note||defaults.note),
      history:Array.isArray(value.history)?clone(value.history).slice(-30):[]
    };
  }
  function read(){let value=null;try{value=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null')}catch{}return Object.freeze(normalize(value||defaults));}
  function write(patch={},event='운영자 상태 갱신'){
    const current=read();
    const next=normalize({...current,...patch,lastChecked:now(),history:[...current.history,{at:now(),event:String(event),note:String(patch.note||current.note)}]});
    localStorage.setItem(STORAGE_KEY,JSON.stringify(next));
    window.dispatchEvent(new CustomEvent('savingio:v2-search-console-changed',{detail:clone(next)}));
    return Object.freeze(clone(next));
  }
  function reset(){localStorage.removeItem(STORAGE_KEY);window.dispatchEvent(new CustomEvent('savingio:v2-search-console-changed',{detail:clone(defaults)}));return read();}
  function verify(){const value=read();const invalid=['connection','sitemap','urlInspection','indexing','crawl'].filter(key=>!STATES.includes(value[key]));return Object.freeze({property:value.property,invalid:Object.freeze(invalid),history:value.history.length,externalApiConnected:false,pass:invalid.length===0});}

  Object.defineProperty(window,'SavingioV2SearchConsoleStore',{value:Object.freeze({read,write,reset,verify,states:STATES,property:PROPERTY,storageKey:STORAGE_KEY}),writable:false,configurable:false,enumerable:true});
})();