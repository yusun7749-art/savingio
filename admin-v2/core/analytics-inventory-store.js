(() => {
  'use strict';

  const KEY='savingio-admin-v2-analytics-inventory';
  const SCHEMA_VERSION=1;
  const SOURCES=Object.freeze(['manual','search-console','analytics','cloudflare']);
  const STATUSES=Object.freeze(['unverified','collecting','review','verified','blocked']);
  const STATUS_LABELS=Object.freeze({unverified:'미확인',collecting:'수집 중',review:'분석 중',verified:'검증 완료',blocked:'중지'});
  const clean=value=>String(value??'').trim();
  const number=value=>Math.max(0,Number(value)||0);
  const ratio=value=>Math.max(0,Math.min(100,Number(value)||0));
  const now=()=>new Date().toISOString();
  const makeId=()=>`ANA-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;

  const seed=Object.freeze([
    {id:'ANA-CAR-AIRCON',title:'자동차 에어컨 연비 절약',url:'/articles/car-aircon-fuel-saving',source:'manual',status:'unverified',views:0,clicks:0,impressions:0,ctr:0,avgSeconds:0,conversions:0,revenueSignal:0,period:'',note:'외부 데이터 연결 전 수치 미입력',updatedAt:'2026-07-26T00:00:00.000Z'}
  ]);

  function normalize(item={}){
    return {
      id:clean(item.id)||makeId(), title:clean(item.title)||'제목 없음', url:clean(item.url),
      source:SOURCES.includes(item.source)?item.source:'manual', status:STATUSES.includes(item.status)?item.status:'unverified',
      views:number(item.views), clicks:number(item.clicks), impressions:number(item.impressions), ctr:ratio(item.ctr),
      avgSeconds:number(item.avgSeconds), conversions:number(item.conversions), revenueSignal:number(item.revenueSignal),
      period:clean(item.period), note:clean(item.note), updatedAt:clean(item.updatedAt)||now()
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
    }catch{return seed.map(normalize);}
  }

  function persist(items){
    const payload={schemaVersion:SCHEMA_VERSION,items:items.map(normalize)};
    localStorage.setItem(KEY,JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent('savingio:v2-analytics-inventory-changed',{detail:{count:payload.items.length}}));
    return payload.items;
  }

  function upsert(input){
    const item=normalize({...input,updatedAt:now()});
    const items=readAll();
    const index=items.findIndex(row=>row.id===item.id);
    if(index>=0)items[index]=item;else items.unshift(item);
    persist(items);return item;
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
    const status=clean(filters.status);
    const source=clean(filters.source);
    return readAll().filter(item=>{
      const haystack=`${item.title} ${item.url} ${item.period} ${item.note}`.toLowerCase();
      return (!keyword||haystack.includes(keyword))&&(!status||item.status===status)&&(!source||item.source===source);
    }).sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt));
  }

  function summary(items=readAll()){
    const status=Object.fromEntries(STATUSES.map(key=>[key,items.filter(item=>item.status===key).length]));
    const total=key=>items.reduce((sum,item)=>sum+number(item[key]),0);
    return Object.freeze({total:items.length,status,views:total('views'),clicks:total('clicks'),impressions:total('impressions'),conversions:total('conversions'),revenueSignal:total('revenueSignal'),verified:items.filter(item=>item.status==='verified').length});
  }

  function verify(){
    const items=readAll();
    const ids=items.map(item=>item.id);
    const valid=items.every(item=>item.id&&item.title&&SOURCES.includes(item.source)&&STATUSES.includes(item.status)&&item.ctr>=0&&item.ctr<=100);
    return Object.freeze({pass:valid&&new Set(ids).size===ids.length,count:items.length,schemaVersion:SCHEMA_VERSION});
  }

  Object.defineProperty(window,'SavingioV2AnalyticsInventoryStore',{value:Object.freeze({readAll,get,query,summary,upsert,remove,verify,sources:SOURCES,statuses:STATUSES,statusLabels:STATUS_LABELS,schemaVersion:SCHEMA_VERSION}),writable:false,configurable:false});
})();