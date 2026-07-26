(() => {
  'use strict';

  if(window.SavingioV2CenterStoreFactory)throw new Error('Admin V2 Center Store Factory already exists');

  const clean=value=>String(value??'').trim();
  const clone=value=>JSON.parse(JSON.stringify(value));

  function create(config){
    if(!config||typeof config!=='object')throw new TypeError('Center store config is required');
    const key=clean(config.key);
    const name=clean(config.name);
    const defaults=Object.freeze(clone(config.defaults||{}));
    const states=Object.freeze({...config.states});
    if(!key||!name)throw new TypeError('Center store key and name are required');

    function read(){
      try{return {...clone(defaults),...JSON.parse(localStorage.getItem(key)||'{}')}}catch{return clone(defaults)}
    }

    function normalize(patch,current){
      const source={...current,...patch};
      const next={};
      Object.keys(defaults).forEach(field=>{
        if(field==='history')return;
        const value=source[field];
        next[field]=typeof defaults[field]==='boolean'?value===true||String(value)==='true':clean(value);
      });
      return next;
    }

    function write(patch){
      const current=read();
      const normalized=normalize(patch,current);
      const note=clean(normalized.operatorNote||normalized.note||'운영 기록');
      const historyItem={at:new Date().toISOString(),note};
      (config.historyFields||[]).forEach(field=>{historyItem[field]=normalized[field]??''});
      const next={...current,...normalized,history:[historyItem,...(current.history||[])].slice(0,Number(config.historyLimit||30))};
      localStorage.setItem(key,JSON.stringify(next));
      window.dispatchEvent(new CustomEvent('savingio:v2-center-data-changed',{detail:{center:name}}));
      return next;
    }

    function reset(){
      localStorage.removeItem(key);
      window.dispatchEvent(new CustomEvent('savingio:v2-center-data-changed',{detail:{center:name}}));
      return read();
    }

    function verify(){
      const data=read();
      const checks=(config.stateFields||[]).map(field=>!states[field]||states[field].includes(data[field]));
      const custom=typeof config.verify==='function'?config.verify(data):{};
      return Object.freeze({pass:checks.every(Boolean)&&custom.pass!==false,noFakeSuccess:custom.noFakeSuccess!==false,...custom});
    }

    return Object.freeze({read,write,reset,verify,states,defaults});
  }

  Object.defineProperty(window,'SavingioV2CenterStoreFactory',{value:Object.freeze({create}),writable:false,configurable:false,enumerable:true});
})();