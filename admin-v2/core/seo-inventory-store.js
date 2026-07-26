(() => {
  'use strict';

  const KEY='savingio-admin-v2-seo-inventory';
  const SCHEMA_VERSION=1;
  const INDEX_STATES=Object.freeze(['unknown','requested','indexed','excluded','error']);
  const PRIORITIES=Object.freeze(['low','normal','high','urgent']);
  const now=()=>new Date().toISOString();
  const clean=value=>String(value??'').trim();
  const bool=value=>value===true||value==='true'||value==='1'||value==='on';
  const makeId=()=>`SEO-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;

  const seed=Object.freeze([
    {id:'SEO-CAR-AIRCON',title:'자동차 에어컨 연비 절약',url:'/articles/car-aircon-fuel-saving',indexState:'indexed',metaTitle:true,metaDescription:true,canonical:true,schema:true,internalLinks:8,priority:'normal',updatedAt:'2026-07-26T00:00:00.000Z',note:'공식 DNA 기준 페이지'},
    {id:'SEO-ELECTRICITY',title:'전기요금 절약 가이드',url:'/articles/electricity-bill-saving',indexState:'requested',metaTitle:true,metaDescription:true,canonical:true,schema:true,internalLinks:5,priority:'high',updatedAt:'2026-07-26T00:00:00.000Z',note:'색인 상태 재확인 필요'}
  ]);

  function score(item){
    const checks=[item.metaTitle,item.metaDescription,item.canonical,item.schema];
    const technical=checks.filter(Boolean).length*20;
    const links=Math.min(20,Math.max(0,Number(item.internalLinks)||0)*4);
    return technical+links;
  }

  function normalize(item={}){
    const normalized={
      id:clean(item.id)||makeId(),
      title:clean(item.title)||'제목 없음',
      url:clean(item.url),
      indexState:INDEX_STATES.includes(item.indexState)?item.indexState:'unknown',
      metaTitle:bool(item.metaTitle),
      metaDescription:bool(item.metaDescription),
      canonical:bool(item.canonical),
      schema:bool(item.schema),
      internalLinks:Math.max(0,Number(item.internalLinks)||0),
      priority:PRIORITIES.includes(item.priority)?item.priority:'normal',
      updatedAt:clean(item.updatedAt)||now(),
      note:clean(item.note)
    };
    normalized.score=score(normalized);
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
    window.dispatchEvent(new CustomEvent('savingio:v2-seo-inventory-changed',{detail:{count:payload.items.length}}));
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
    persist(next);
    return true;
  }

  function get(id){return readAll().find(item=>item.id===clean(id))||null;}

  function query(filters={}){
    const keyword=clean(filters.keyword).toLowerCase();
    const indexState=clean(filters.indexState);
    const priority=clean(filters.priority);
    return readAll().filter(item=>{
      const haystack=`${item.title} ${item.url} ${item.note}`.toLowerCase();
      return (!keyword||haystack.includes(keyword))&&(!indexState||item.indexState===indexState)&&(!priority||item.priority===priority);
    }).sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt));
  }

  function summary(items=readAll()){
    const indexed=items.filter(item=>item.indexState==='indexed').length;
    const excluded=items.filter(item=>item.indexState==='excluded'||item.indexState==='error').length;
    const incomplete=items.filter(item=>item.score<100).length;
    const average=items.length?Math.round(items.reduce((sum,item)=>sum+item.score,0)/items.length):0;
    return Object.freeze({total:items.length,indexed,excluded,incomplete,average});
  }

  function verify(){
    const items=readAll();
    const ids=items.map(item=>item.id);
    const valid=items.every(item=>item.id&&item.title&&INDEX_STATES.includes(item.indexState)&&PRIORITIES.includes(item.priority)&&item.score>=0&&item.score<=100);
    return Object.freeze({pass:valid&&new Set(ids).size===ids.length,count:items.length,schemaVersion:SCHEMA_VERSION});
  }

  Object.defineProperty(window,'SavingioV2SeoInventoryStore',{value:Object.freeze({readAll,get,query,summary,upsert,remove,verify,indexStates:INDEX_STATES,priorities:PRIORITIES,schemaVersion:SCHEMA_VERSION}),writable:false,configurable:false});
})();