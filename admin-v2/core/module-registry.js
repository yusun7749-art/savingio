(() => {
  'use strict';

  const modules=new Map();
  let sealed=false;

  function normalize(module){
    if(!module||typeof module!=='object')throw new TypeError('Invalid Admin V2 module');
    const id=String(module.id||'').trim();
    const title=String(module.title||'').trim();
    if(!id||!title||typeof module.render!=='function')throw new TypeError('Invalid Admin V2 module');
    return Object.freeze({...module,id,title});
  }

  function register(module){
    if(sealed)throw new Error('Admin V2 module registry is sealed');
    const normalized=normalize(module);
    if(modules.has(normalized.id))throw new Error(`Duplicate module: ${normalized.id}`);
    modules.set(normalized.id,normalized);
    return normalized;
  }

  function get(id){return modules.get(String(id||'').trim())}
  function has(id){return modules.has(String(id||'').trim())}
  function list(){return [...modules.values()].map(({id,title})=>Object.freeze({id,title}))}
  function seal(){sealed=true;return api}
  function verify(){
    const ids=[...modules.keys()];
    return Object.freeze({count:ids.length,ids:Object.freeze(ids),sealed,duplicateCount:ids.length-new Set(ids).size,pass:sealed&&ids.length>0&&ids.length===new Set(ids).size});
  }

  const api=Object.freeze({register,get,has,list,seal,verify,get sealed(){return sealed}});
  Object.defineProperty(window,'SavingioV2Modules',{value:api,writable:false,configurable:false,enumerable:true});
})();