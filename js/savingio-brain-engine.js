(()=>{
'use strict';
const VERSION='1.0.0';
const normalize=value=>String(value??'').toLowerCase().normalize('NFKC').replace(/\s+/g,' ').trim();
const words=value=>[...new Set(normalize(value).replace(/[^0-9a-z가-힣\s]/gi,' ').split(/\s+/).filter(word=>word.length>1))];
function build(registry){
  const records=registry?.records||[],byId=new Map(),byHref=new Map(),groups=new Map(),edges=new Map();
  records.forEach(record=>{byId.set(record.id,record);byHref.set(record.href,record);const keys=[record.category,record.large,record.middle,record.small].filter(Boolean);keys.forEach(key=>{if(!groups.has(key))groups.set(key,[]);groups.get(key).push(record.id);});edges.set(record.id,new Map());});
  const connect=(from,to,type,weight)=>{if(!from||!to||from===to)return;const bucket=edges.get(from);const current=bucket.get(to);if(!current||current.weight<weight)bucket.set(to,{to,type,weight});};
  records.forEach(record=>{
    const candidates=new Map();
    [record.category,record.large,record.middle,record.small].filter(Boolean).forEach((key,level)=>{
      (groups.get(key)||[]).forEach(id=>{if(id===record.id)return;candidates.set(id,(candidates.get(id)||0)+[2,3,5,7][level]);});
    });
    const sourceWords=new Set(words(`${record.title} ${record.keywords} ${(record.exactQueries||[]).join(' ')}`));
    records.forEach(other=>{if(other.id===record.id)return;let shared=0;words(`${other.title} ${other.keywords}`).forEach(word=>{if(sourceWords.has(word))shared+=1;});if(shared)candidates.set(other.id,(candidates.get(other.id)||0)+Math.min(shared,8));});
    [...candidates.entries()].sort((a,b)=>b[1]-a[1]).slice(0,20).forEach(([id,weight])=>connect(record.id,id,'related',weight));
  });
  const api={
    version:VERSION,
    registry,
    getById:id=>byId.get(id)||null,
    getByHref:href=>byHref.get(href)||null,
    neighbors(value,{limit=8}={}){const record=typeof value==='string'?(byId.get(value)||byHref.get(value)):value;if(!record)return[];return [...(edges.get(record.id)?.values()||[])].sort((a,b)=>b.weight-a.weight).slice(0,limit).map(edge=>({...edge,record:byId.get(edge.to)}));},
    path(value){const record=typeof value==='string'?(byId.get(value)||byHref.get(value)):value;return record?[record.large,record.middle,record.small].filter(Boolean):[];},
    stats(){return Object.freeze({records:records.length,nodes:byId.size,edges:[...edges.values()].reduce((sum,map)=>sum+map.size,0),groups:groups.size});}
  };
  return Object.freeze(api);
}
window.SavingioBrainEngine=Object.freeze({VERSION,build});
})();