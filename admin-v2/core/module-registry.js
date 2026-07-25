(() => {
  'use strict';
  const modules=new Map();
  function register(module){
    if(!module||typeof module.id!=='string'||typeof module.title!=='string'||typeof module.render!=='function')throw new TypeError('Invalid Admin V2 module');
    if(modules.has(module.id))throw new Error(`Duplicate module: ${module.id}`);
    modules.set(module.id,Object.freeze({...module}));
  }
  function get(id){return modules.get(id)}
  function list(){return [...modules.values()].map(({id,title})=>({id,title}))}
  window.SavingioV2Modules=Object.freeze({register,get,list});
})();