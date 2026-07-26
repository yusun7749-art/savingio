(() => {
  'use strict';

  const KEY='savingio-admin-v2-image-inventory';
  const SCHEMA_VERSION=1;
  const TYPES=Object.freeze(['thumbnail','article','infographic','shorts','logo','watermark','other']);
  const TYPE_LABELS=Object.freeze({thumbnail:'대표 이미지',article:'본문 이미지',infographic:'인포그래픽',shorts:'쇼츠 자산',logo:'로고',watermark:'워터마크',other:'기타'});
  const STATUSES=Object.freeze(['draft','review','ready','published','blocked']);
  const STATUS_LABELS=Object.freeze({draft:'제작 중',review:'검수 중',ready:'사용 준비',published:'사용 중',blocked:'중지'});
  const clean=value=>String(value??'').trim();
  const bool=value=>value===true||value==='true'||value===1||value==='1'||value==='on';
  const number=value=>Math.max(0,Number(value)||0);
  const now=()=>new Date().toISOString();
  const makeId=()=>`IMG-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;

  const seed=Object.freeze([
    {id:'IMG-CAR-AIRCON',title:'자동차 에어컨 연비 절약 대표 이미지',path:'/images/articles/car-aircon-fuel-saving.svg',targetUrl:'/articles/car-aircon-fuel-saving',type:'thumbnail',status:'published',alt:'자동차 에어컨 사용과 연비 절약을 설명하는 대표 이미지',width:1200,height:630,watermark:false,optimized:true,brandChecked:true,note:'Savingio 기준 글 대표 이미지',updatedAt:'2026-07-26T00:00:00.000Z'},
    {id:'IMG-ELECTRICITY',title:'전기요금 절약 대표 이미지',path:'',targetUrl:'/articles/electricity-bill-saving',type:'thumbnail',status:'blocked',alt:'',width:0,height:0,watermark:false,optimized:false,brandChecked:false,note:'이미지 경로와 ALT 확인 필요',updatedAt:'2026-07-26T00:00:00.000Z'}
  ]);

  function normalize(item={}){
    return {
      id:clean(item.id)||makeId(),title:clean(item.title)||'이미지 제목 없음',path:clean(item.path),targetUrl:clean(item.targetUrl),
      type:TYPES.includes(item.type)?item.type:'other',status:STATUSES.includes(item.status)?item.status:'draft',alt:clean(item.alt),
      width:number(item.width),height:number(item.height),watermark:bool(item.watermark),optimized:bool(item.optimized),brandChecked:bool(item.brandChecked),
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
    window.dispatchEvent(new CustomEvent('savingio:v2-image-inventory-changed',{detail:{count:payload.items.length}}));
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
    const type=clean(filters.type);
    const status=clean(filters.status);
    return readAll().filter(item=>{
      const haystack=`${item.title} ${item.path} ${item.targetUrl} ${item.alt} ${item.note}`.toLowerCase();
      return (!keyword||haystack.includes(keyword))&&(!type||item.type===type)&&(!status||item.status===status);
    }).sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt));
  }

  function quality(item){
    let score=0;
    if(item.path)score+=25;
    if(item.alt)score+=20;
    if(item.width>0&&item.height>0)score+=15;
    if(item.optimized)score+=20;
    if(item.brandChecked)score+=20;
    return score;
  }

  function summary(items=readAll()){
    const status=Object.fromEntries(STATUSES.map(key=>[key,items.filter(item=>item.status===key).length]));
    const type=Object.fromEntries(TYPES.map(key=>[key,items.filter(item=>item.type===key).length]));
    const altMissing=items.filter(item=>!item.alt).length;
    const averageQuality=items.length?Math.round(items.reduce((sum,item)=>sum+quality(item),0)/items.length):0;
    return Object.freeze({total:items.length,status,type,altMissing,averageQuality});
  }

  function verify(){
    const items=readAll();
    const ids=items.map(item=>item.id);
    const valid=items.every(item=>item.id&&item.title&&TYPES.includes(item.type)&&STATUSES.includes(item.status)&&item.width>=0&&item.height>=0);
    return Object.freeze({pass:valid&&new Set(ids).size===ids.length,count:items.length,schemaVersion:SCHEMA_VERSION});
  }

  Object.defineProperty(window,'SavingioV2ImageInventoryStore',{value:Object.freeze({readAll,get,query,summary,upsert,remove,verify,quality,types:TYPES,typeLabels:TYPE_LABELS,statuses:STATUSES,statusLabels:STATUS_LABELS,schemaVersion:SCHEMA_VERSION}),writable:false,configurable:false});
})();