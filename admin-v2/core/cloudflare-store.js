(() => {
  'use strict';
  const KEY='savingio-admin-v2-cloudflare';
  const defaults=Object.freeze({accountStatus:'unknown',pagesStatus:'unknown',productionStatus:'unknown',dnsStatus:'unknown',sslStatus:'unknown',cacheStatus:'unknown',lastDeployId:'',lastDeployAt:'',apiConnected:'false',operatorNote:'',history:[]});
  const connectionStates=Object.freeze(['unknown','connected','disconnected','error']);
  const stateValues=Object.freeze(['unknown','pending','healthy','warning','failed']);
  const clean=value=>String(value??'').trim();
  function read(){try{return {...defaults,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{return {...defaults}}}
  function write(patch){const current=read();const next={...current,...patch,apiConnected:String(patch.apiConnected??current.apiConnected)==='true'?'true':'false',history:[{at:new Date().toISOString(),note:clean(patch.operatorNote||current.operatorNote),productionStatus:clean(patch.productionStatus||current.productionStatus),sslStatus:clean(patch.sslStatus||current.sslStatus)},...(current.history||[])].slice(0,30)};localStorage.setItem(KEY,JSON.stringify(next));window.dispatchEvent(new CustomEvent('savingio:v2-center-data-changed',{detail:{center:'cloudflare'}}));return next}
  function reset(){localStorage.removeItem(KEY);window.dispatchEvent(new CustomEvent('savingio:v2-center-data-changed',{detail:{center:'cloudflare'}}));return read()}
  function verify(){const data=read();return Object.freeze({pass:connectionStates.includes(data.accountStatus)&&stateValues.includes(data.pagesStatus)&&stateValues.includes(data.productionStatus)&&stateValues.includes(data.dnsStatus)&&stateValues.includes(data.sslStatus)&&stateValues.includes(data.cacheStatus),domainLock:true,projectLock:true,noFakeDeploy:data.productionStatus!=='healthy'||Boolean(clean(data.lastDeployId)||clean(data.lastDeployAt))});}
  Object.defineProperty(window,'SavingioV2CloudflareStore',{value:Object.freeze({read,write,reset,verify,connectionStates,stateValues,domain:'savingio.com',project:'savingio'}),writable:false,configurable:false});
})();