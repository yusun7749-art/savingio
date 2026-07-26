(() => {
  'use strict';

  const KEY='savingio-admin-v2-revenue-inventory';
  const SCHEMA_VERSION=1;
  const CHANNELS=Object.freeze(['adsense','affiliate','sponsorship','product','other']);
  const STATUSES=Object.freeze(['unverified','estimated','confirmed','settled','blocked']);
  const STATUS_LABELS=Object.freeze({unverified:'미확인',estimated:'추정',confirmed:'확정',settled:'정산 완료',blocked:'중지'});
  const clean=value=>String(value??'').trim();
  const number=value=>Math.max(0,Number(value)||0);
  const now=()=>new Date().toISOString();
  const makeId=()=>`REV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;

  const seed=Object.freeze([
    {id:'REV-ADSENSE-SITE',title:'Savingio AdSense',url:'/',channel:'adsense',status:'unverified',period:'',estimatedRevenue:0,confirmedRevenue:0,settledRevenue:0,clicks:0,conversions:0,currency:'KRW',source:'manual',note:'AdSense 외부 수익 데이터 연결 전',updatedAt:'2026-07-26T00:00:00.000Z'}
  ]);

  function normalize(item={}){
    const status=STATUSES.includes(item.status)?item.status:'unverified';
    return {
      id:clean(item.id)||makeId(),title:clean(item.title)||'수익 항목 없음',url:clean(item.url),
      channel:CHANNELS.includes(item.channel)?item.channel:'other',status,period:clean(item.period),
      estimatedRevenue:number(item.estimatedRevenue),confirmedRevenue:number(item.confirmedRevenue),settledRevenue:number(item.settledRevenue),
      clicks:number(item.clicks),conversions:number(item.conversions),currency:clean(item.currency)||'KRW',source:clean(item.source)||'manual',
      note:clean(item.note),updatedAt:clean(item.updatedAt)||now()
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
    window.dispatchEvent(new CustomEvent('savingio:v2-revenue-inventory-changed',{detail:{count:payload.items.length}}));
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
    const channel=clean(filters.channel);
    return readAll().filter(item=>{
      const haystack=`${item.title} ${item.url} ${item.period} ${item.source} ${item.note}`.toLowerCase();
      return (!keyword||haystack.includes(keyword))&&(!status||item.status===status)&&(!channel||item.channel===channel);
    }).sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt));
  }

  function summary(items=readAll()){
    const status=Object.fromEntries(STATUSES.map(key=>[key,items.filter(item=>item.status===key).length]));
    const total=key=>items.reduce((sum,item)=>sum+number(item[key]),0);
    return Object.freeze({total:items.length,status,estimatedRevenue:total('estimatedRevenue'),confirmedRevenue:total('confirmedRevenue'),settledRevenue:total('settledRevenue'),clicks:total('clicks'),conversions:total('conversions')});
  }

  function verify(){
    const items=readAll();
    const ids=items.map(item=>item.id);
    const valid=items.every(item=>item.id&&item.title&&CHANNELS.includes(item.channel)&&STATUSES.includes(item.status)&&item.confirmedRevenue<=item.estimatedRevenue+item.confirmedRevenue+item.settledRevenue);
    return Object.freeze({pass:valid&&new Set(ids).size===ids.length,count:items.length,schemaVersion:SCHEMA_VERSION});
  }

  Object.defineProperty(window,'SavingioV2RevenueInventoryStore',{value:Object.freeze({readAll,get,query,summary,upsert,remove,verify,channels:CHANNELS,statuses:STATUSES,statusLabels:STATUS_LABELS,schemaVersion:SCHEMA_VERSION}),writable:false,configurable:false});
})();