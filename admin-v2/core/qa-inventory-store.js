(() => {
  'use strict';

  const KEY='savingio-admin-v2-qa-inventory';
  const SCHEMA_VERSION=1;
  const RESULTS=Object.freeze(['pending','pass','fail','blocked']);
  const RESULT_LABELS=Object.freeze({pending:'대기',pass:'PASS',fail:'FAIL',blocked:'중지'});
  const clean=value=>String(value??'').trim();
  const now=()=>new Date().toISOString();
  const makeId=()=>`QA-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
  const bool=value=>value===true||value==='true'||value===1||value==='1'||value==='on';

  const seed=Object.freeze([
    {id:'QA-CAR-AIRCON',title:'자동차 에어컨 연비 절약',url:'/articles/car-aircon-fuel-saving',content:true,seo:true,image:true,links:true,responsive:true,liveUrl:true,result:'pass',note:'공식 DNA 기준 페이지',updatedAt:'2026-07-26T00:00:00.000Z'},
    {id:'QA-ELECTRICITY',title:'전기요금 절약 가이드',url:'/articles/electricity-bill-saving',content:true,seo:true,image:false,links:true,responsive:true,liveUrl:true,result:'fail',note:'대표 이미지 재확인 필요',updatedAt:'2026-07-26T00:00:00.000Z'}
  ]);

  function computedResult(item){
    const checks=['content','seo','image','links','responsive','liveUrl'];
    if(item.result==='blocked')return 'blocked';
    return checks.every(key=>Boolean(item[key]))?'pass':checks.some(key=>Boolean(item[key]))?'fail':'pending';
  }

  function normalize(item={}){
    const normalized={
      id:clean(item.id)||makeId(),title:clean(item.title)||'제목 없음',url:clean(item.url),
      content:bool(item.content),seo:bool(item.seo),image:bool(item.image),links:bool(item.links),responsive:bool(item.responsive),liveUrl:bool(item.liveUrl),
      result:RESULTS.includes(item.result)?item.result:'pending',note:clean(item.note),updatedAt:clean(item.updatedAt)||now()
    };
    normalized.result=computedResult(normalized);
    return normalized;
  }

  function readAll(){
    try{
      const raw=JSON.parse(localStorage.getItem(KEY)||'null');
      if(!raw||Number(raw.schemaVersion)!==SCHEMA_VERSION||!Array.isArray(raw.items)){
        const initial={schemaVersion:SCHEMA_VERSION,items:seed.map(normalize)};
        localStorage.setItem(KEY,JSON.stringify(initial));
        return initial.items;
      }
      return raw.items.map(normalize);
    }catch{return seed.map(normalize);}
  }

  function persist(items){
    const payload={schemaVersion:SCHEMA_VERSION,items:items.map(normalize)};
    localStorage.setItem(KEY,JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent('savingio:v2-qa-inventory-changed',{detail:{count:payload.items.length}}));
    return payload.items;
  }

  function upsert(input){
    const item=normalize({...input,updatedAt:now()});
    const items=readAll();
    const index=items.findIndex(row=>row.id===item.id);
    if(index>=0)items[index]=item;else items.unshift(item);
    persist(items);
    return item;
  }

  function remove(id){
    const items=readAll();
    const next=items.filter(item=>item.id!==clean(id));
    if(next.length===items.length)return false;
    persist(next);return true;
  }

  function get(id){return readAll().find(item=>item.id===clean(id))||null;}
  function query(filters={}){
    const keyword=clean(filters.keyword).toLowerCase();
    const result=clean(filters.result);
    return readAll().filter(item=>{
      const haystack=`${item.title} ${item.url} ${item.note}`.toLowerCase();
      return (!keyword||haystack.includes(keyword))&&(!result||item.result===result);
    }).sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt));
  }

  function summary(items=readAll()){
    const result=Object.fromEntries(RESULTS.map(key=>[key,items.filter(item=>item.result===key).length]));
    const checkKeys=['content','seo','image','links','responsive','liveUrl'];
    const checkRates=Object.fromEntries(checkKeys.map(key=>[key,items.length?Math.round(items.filter(item=>item[key]).length/items.length*100):0]));
    return Object.freeze({total:items.length,result,checkRates});
  }

  function verify(){
    const items=readAll();
    const ids=items.map(item=>item.id);
    const valid=items.every(item=>item.id&&item.title&&RESULTS.includes(item.result));
    return Object.freeze({pass:valid&&new Set(ids).size===ids.length,count:items.length,schemaVersion:SCHEMA_VERSION});
  }

  Object.defineProperty(window,'SavingioV2QaInventoryStore',{value:Object.freeze({readAll,get,query,summary,upsert,remove,verify,results:RESULTS,resultLabels:RESULT_LABELS,schemaVersion:SCHEMA_VERSION}),writable:false,configurable:false});
})();