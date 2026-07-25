(() => {
  'use strict';

  const STORAGE_KEY='savingio-admin-v2-departments';
  const DEPARTMENT_IDS=Object.freeze(['cms','content','seo','image','qa','deploy','analytics','revenue']);
  const defaults=Object.freeze({
    cms:{label:'CMS',status:'ready',items:0,updated:'미연결',connections:{content:'ready',approval:'ready',publish:'pending',version:'pending'}},
    content:{label:'콘텐츠',status:'ready',items:0,updated:'미연결',connections:{planning:'ready',writing:'ready',media:'pending',approval:'ready'}},
    seo:{label:'SEO',status:'pending',items:0,updated:'미연결',connections:{}},
    image:{label:'이미지',status:'pending',items:0,updated:'미연결',connections:{}},
    qa:{label:'QA',status:'pending',items:0,updated:'미연결',connections:{}},
    deploy:{label:'배포',status:'pending',items:0,updated:'미연결',connections:{}},
    analytics:{label:'분석',status:'pending',items:0,updated:'미연결',connections:{}},
    revenue:{label:'수익',status:'pending',items:0,updated:'미연결',connections:{}}
  });

  const clone=value=>JSON.parse(JSON.stringify(value));
  const normalizeState=value=>['ready','running','pending','error','done'].includes(value)?value:'pending';
  function normalizeRecord(id,value={}){
    const base=defaults[id];
    if(!base)throw new Error(`Unknown department: ${id}`);
    return {
      id,
      label:String(value.label||base.label),
      status:normalizeState(value.status||base.status),
      items:Math.max(0,Number(value.items||0)),
      updated:String(value.updated||base.updated),
      connections:{...clone(base.connections),...(value.connections&&typeof value.connections==='object'?clone(value.connections):{})}
    };
  }
  function readAll(){
    let stored=null;
    try{stored=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null')}catch{}
    return Object.freeze(Object.fromEntries(DEPARTMENT_IDS.map(id=>[id,Object.freeze(normalizeRecord(id,stored?.[id]))])));
  }
  function read(id){
    const key=String(id||'').replace(/^dept-/,'');
    return readAll()[key]||null;
  }
  function write(id,patch){
    const key=String(id||'').replace(/^dept-/,'');
    if(!DEPARTMENT_IDS.includes(key))throw new Error(`Unknown department: ${key}`);
    const all=clone(readAll());
    all[key]=normalizeRecord(key,{...all[key],...(patch||{})});
    localStorage.setItem(STORAGE_KEY,JSON.stringify(all));
    window.dispatchEvent(new CustomEvent('savingio:v2-departments-changed',{detail:{department:key,record:clone(all[key])}}));
    return Object.freeze(clone(all[key]));
  }
  function summary(){
    const records=Object.values(readAll());
    const state=records.reduce((acc,item)=>{acc[item.status]=(acc[item.status]||0)+1;return acc},{ready:0,running:0,pending:0,error:0,done:0});
    return Object.freeze({total:records.length,state:Object.freeze(state),items:records.reduce((sum,item)=>sum+item.items,0)});
  }
  function verify(){
    const all=readAll();
    const missing=DEPARTMENT_IDS.filter(id=>!all[id]);
    return Object.freeze({storageKey:STORAGE_KEY,expected:DEPARTMENT_IDS.length,registered:Object.keys(all).length,missing:Object.freeze(missing),pass:missing.length===0});
  }
  const api=Object.freeze({read,readAll,write,summary,verify,ids:DEPARTMENT_IDS,storageKey:STORAGE_KEY});
  if(window.SavingioV2DepartmentStore)throw new Error('Department Store already exists');
  Object.defineProperty(window,'SavingioV2DepartmentStore',{value:api,writable:false,configurable:false,enumerable:true});
})();