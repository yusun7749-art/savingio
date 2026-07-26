(() => {
  'use strict';

  const KEY='savingio-admin-v2-deploy-inventory';
  const SCHEMA_VERSION=1;
  const STATUSES=Object.freeze(['draft','approved','queued','deploying','verifying','verified','failed','rolled-back']);
  const STATUS_LABELS=Object.freeze({draft:'작성 중',approved:'승인 완료',queued:'배포 대기',deploying:'배포 중',verifying:'검증 중',verified:'검증 완료',failed:'배포 실패','rolled-back':'롤백'});
  const ENVIRONMENTS=Object.freeze(['production','preview']);
  const clean=value=>String(value??'').trim();
  const bool=value=>value===true||value==='true'||value===1||value==='1'||value==='on';
  const now=()=>new Date().toISOString();
  const makeId=()=>`DEP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;

  const seed=Object.freeze([
    {id:'DEP-ADMIN-V2',title:'Admin V2 운영본부',targetUrl:'/admin-v2/',environment:'production',status:'verifying',approved:true,github:true,cloudflare:true,liveUrl:false,rollbackReady:true,commitSha:'',deploymentId:'',note:'실제 운영 URL 런타임 검증 대기',updatedAt:'2026-07-26T00:00:00.000Z'}
  ]);

  function normalize(item={}){
    return {
      id:clean(item.id)||makeId(),
      title:clean(item.title)||'배포 제목 없음',
      targetUrl:clean(item.targetUrl),
      environment:ENVIRONMENTS.includes(item.environment)?item.environment:'production',
      status:STATUSES.includes(item.status)?item.status:'draft',
      approved:bool(item.approved),github:bool(item.github),cloudflare:bool(item.cloudflare),liveUrl:bool(item.liveUrl),rollbackReady:bool(item.rollbackReady),
      commitSha:clean(item.commitSha),deploymentId:clean(item.deploymentId),note:clean(item.note),updatedAt:clean(item.updatedAt)||now()
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
    window.dispatchEvent(new CustomEvent('savingio:v2-deploy-inventory-changed',{detail:{count:payload.items.length}}));
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
    const status=clean(filters.status);
    const environment=clean(filters.environment);
    return readAll().filter(item=>{
      const haystack=`${item.title} ${item.targetUrl} ${item.commitSha} ${item.deploymentId} ${item.note}`.toLowerCase();
      return (!keyword||haystack.includes(keyword))&&(!status||item.status===status)&&(!environment||item.environment===environment);
    }).sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt));
  }

  function summary(items=readAll()){
    const status=Object.fromEntries(STATUSES.map(key=>[key,items.filter(item=>item.status===key).length]));
    return Object.freeze({total:items.length,status,approved:items.filter(item=>item.approved).length,verified:items.filter(item=>item.status==='verified'&&item.liveUrl).length,failed:items.filter(item=>item.status==='failed').length});
  }

  function verify(){
    const items=readAll();
    const ids=items.map(item=>item.id);
    const valid=items.every(item=>item.id&&item.title&&STATUSES.includes(item.status)&&ENVIRONMENTS.includes(item.environment));
    return Object.freeze({pass:valid&&new Set(ids).size===ids.length,count:items.length,schemaVersion:SCHEMA_VERSION});
  }

  Object.defineProperty(window,'SavingioV2DeployInventoryStore',{value:Object.freeze({readAll,get,query,summary,upsert,remove,verify,statuses:STATUSES,statusLabels:STATUS_LABELS,environments:ENVIRONMENTS,schemaVersion:SCHEMA_VERSION}),writable:false,configurable:false});
})();