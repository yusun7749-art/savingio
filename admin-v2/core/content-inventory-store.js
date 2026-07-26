(() => {
  'use strict';

  const KEY='savingio-admin-v2-content-inventory';
  const SCHEMA_VERSION=1;
  const STATUSES=Object.freeze(['draft','review','ready','published','blocked']);
  const STATUS_LABELS=Object.freeze({draft:'초안',review:'검수 중',ready:'발행 준비',published:'발행 완료',blocked:'중지'});
  const clean=value=>String(value??'').trim();
  const clampScore=value=>Math.max(0,Math.min(100,Number(value)||0));
  const now=()=>new Date().toISOString();
  const makeId=()=>`CNT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;

  const seed=Object.freeze([
    {id:'CNT-CAR-AIRCON',title:'자동차 에어컨 연비 절약',slug:'car-aircon-fuel-saving',url:'/articles/car-aircon-fuel-saving',category:'자동차·보험',status:'published',qualityScore:100,updatedAt:'2026-07-26T00:00:00.000Z',note:'Savingio 공식 글 DNA 기준 페이지'},
    {id:'CNT-ELECTRICITY',title:'전기요금 절약 가이드',slug:'electricity-bill-saving',url:'/articles/electricity-bill-saving',category:'생활비 절약',status:'published',qualityScore:90,updatedAt:'2026-07-26T00:00:00.000Z',note:'대표 운영 글'}
  ]);

  function normalize(item={}){
    const status=STATUSES.includes(item.status)?item.status:'draft';
    return {
      id:clean(item.id)||makeId(),
      title:clean(item.title)||'제목 없음',
      slug:clean(item.slug),
      url:clean(item.url),
      category:clean(item.category)||'미분류',
      status,
      qualityScore:clampScore(item.qualityScore),
      updatedAt:clean(item.updatedAt)||now(),
      note:clean(item.note)
    };
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
    }catch{
      return seed.map(normalize);
    }
  }

  function persist(items){
    const payload={schemaVersion:SCHEMA_VERSION,items:items.map(normalize)};
    localStorage.setItem(KEY,JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent('savingio:v2-content-inventory-changed',{detail:{count:payload.items.length}}));
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
    const key=clean(id);
    const items=readAll();
    const next=items.filter(item=>item.id!==key);
    if(next.length===items.length)return false;
    persist(next);
    return true;
  }

  function get(id){return readAll().find(item=>item.id===clean(id))||null;}

  function query(filters={}){
    const keyword=clean(filters.keyword).toLowerCase();
    const status=clean(filters.status);
    const category=clean(filters.category);
    return readAll().filter(item=>{
      const haystack=`${item.title} ${item.slug} ${item.url} ${item.category} ${item.note}`.toLowerCase();
      return (!keyword||haystack.includes(keyword))&&(!status||item.status===status)&&(!category||item.category===category);
    }).sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt));
  }

  function summary(items=readAll()){
    const status=Object.fromEntries(STATUSES.map(key=>[key,items.filter(item=>item.status===key).length]));
    const scores=items.map(item=>item.qualityScore);
    const categories=[...new Set(items.map(item=>item.category).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ko'));
    return Object.freeze({total:items.length,status,averageQuality:items.length?Math.round(scores.reduce((sum,value)=>sum+value,0)/items.length):0,categories});
  }

  function verify(){
    const items=readAll();
    const ids=items.map(item=>item.id);
    const valid=items.every(item=>item.id&&item.title&&STATUSES.includes(item.status)&&item.qualityScore>=0&&item.qualityScore<=100);
    return Object.freeze({pass:valid&&new Set(ids).size===ids.length,count:items.length,schemaVersion:SCHEMA_VERSION});
  }

  Object.defineProperty(window,'SavingioV2ContentInventoryStore',{value:Object.freeze({readAll,get,query,summary,upsert,remove,verify,statuses:STATUSES,statusLabels:STATUS_LABELS,schemaVersion:SCHEMA_VERSION}),writable:false,configurable:false});
})();