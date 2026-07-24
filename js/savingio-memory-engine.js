(()=>{
'use strict';
const VERSION='1.0.0';
const STORAGE_KEY='savingio.brain.memory.v1';
const LIMIT=200;
const safeParse=value=>{try{return JSON.parse(value);}catch{return null;}};
const normalize=value=>String(value??'').toLowerCase().normalize('NFKC').replace(/\s+/g,' ').trim();
function create({storage=window.localStorage,key=STORAGE_KEY}={}){
  const read=()=>{
    const parsed=safeParse(storage.getItem(key));
    return parsed&&Array.isArray(parsed.events)?parsed:{version:VERSION,events:[]};
  };
  const write=data=>storage.setItem(key,JSON.stringify({version:VERSION,events:data.events.slice(-LIMIT)}));
  const remember=(type,payload={})=>{
    const data=read();
    const event=Object.freeze({id:`${Date.now()}-${Math.random().toString(36).slice(2,8)}`,type,at:new Date().toISOString(),query:normalize(payload.query),href:String(payload.href||''),articleId:String(payload.articleId||''),meta:payload.meta||{}});
    data.events.push(event);write(data);return event;
  };
  const recent=({type='',limit=20}={})=>read().events.filter(event=>!type||event.type===type).slice(-limit).reverse();
  const queryWeights=()=>{
    const weights=new Map();
    read().events.forEach(event=>{if(!event.query)return;weights.set(event.query,(weights.get(event.query)||0)+1);});
    return [...weights.entries()].sort((a,b)=>b[1]-a[1]).map(([query,count])=>Object.freeze({query,count}));
  };
  const articleWeights=()=>{
    const weights=new Map();
    read().events.forEach(event=>{const key=event.articleId||event.href;if(!key)return;weights.set(key,(weights.get(key)||0)+1);});
    return weights;
  };
  const clear=()=>storage.removeItem(key);
  return Object.freeze({version:VERSION,remember,recent,queryWeights,articleWeights,clear,size:()=>read().events.length});
}
window.SavingioMemoryEngine=Object.freeze({VERSION,STORAGE_KEY,create});
})();