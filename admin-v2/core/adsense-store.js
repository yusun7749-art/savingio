(() => {
  'use strict';

  const config=window.SavingioV2AdSenseConfig;
  if(!config)throw new Error('AdSense Config is not loaded');
  if(window.SavingioV2AdSenseStore)throw new Error('AdSense Store already exists');

  const STORAGE_KEY='savingio-admin-v2-adsense';
  const SITE_STATES=Object.freeze(['unverified','preparing','reviewing','ready','needs-attention']);
  const ADS_TXT_STATES=Object.freeze(['unknown','found','missing','mismatch']);
  const AD_STATES=Object.freeze(['unknown','inactive','limited','active']);
  const POLICY_STATES=Object.freeze(['unknown','clear','warning','violation']);
  const clone=value=>JSON.parse(JSON.stringify(value));
  const now=()=>new Date().toISOString();
  const normalize=(value={})=>({
    site:config.site,
    publisherId:config.publisherId,
    clientId:config.clientId,
    adsTxtLine:config.adsTxtLine,
    siteStatus:SITE_STATES.includes(value.siteStatus)?value.siteStatus:'unverified',
    adsTxtStatus:ADS_TXT_STATES.includes(value.adsTxtStatus)?value.adsTxtStatus:'unknown',
    adServingStatus:AD_STATES.includes(value.adServingStatus)?value.adServingStatus:'unknown',
    policyStatus:POLICY_STATES.includes(value.policyStatus)?value.policyStatus:'unknown',
    revenueConnected:Boolean(value.revenueConnected),
    lastChecked:String(value.lastChecked||''),
    note:String(value.note||''),
    history:Array.isArray(value.history)?value.history.slice(0,30).map(item=>({at:String(item.at||''),siteStatus:SITE_STATES.includes(item.siteStatus)?item.siteStatus:'unverified',adsTxtStatus:ADS_TXT_STATES.includes(item.adsTxtStatus)?item.adsTxtStatus:'unknown',adServingStatus:AD_STATES.includes(item.adServingStatus)?item.adServingStatus:'unknown',policyStatus:POLICY_STATES.includes(item.policyStatus)?item.policyStatus:'unknown',note:String(item.note||'')})):[]
  });
  function read(){let raw={};try{raw=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')}catch{}return Object.freeze(clone(normalize(raw)));}
  function write(patch={}){const current=read();const next=normalize({...current,...patch,lastChecked:now()});next.history=[{at:next.lastChecked,siteStatus:next.siteStatus,adsTxtStatus:next.adsTxtStatus,adServingStatus:next.adServingStatus,policyStatus:next.policyStatus,note:next.note},...current.history].slice(0,30);localStorage.setItem(STORAGE_KEY,JSON.stringify(next));window.dispatchEvent(new CustomEvent('savingio:v2-adsense-changed',{detail:clone(next)}));return Object.freeze(clone(next));}
  function reset(){localStorage.removeItem(STORAGE_KEY);window.dispatchEvent(new CustomEvent('savingio:v2-adsense-changed',{detail:read()}));return read();}
  function verify(){const data=read();const publisherLock=data.publisherId===config.publisherId&&data.clientId===config.clientId&&data.adsTxtLine===config.adsTxtLine;return Object.freeze({storageKey:STORAGE_KEY,publisherLock,history:data.history.length,pass:publisherLock});}

  Object.defineProperty(window,'SavingioV2AdSenseStore',{value:Object.freeze({read,write,reset,verify,siteStates:SITE_STATES,adsTxtStates:ADS_TXT_STATES,adStates:AD_STATES,policyStates:POLICY_STATES,storageKey:STORAGE_KEY}),writable:false,configurable:false,enumerable:true});
})();
