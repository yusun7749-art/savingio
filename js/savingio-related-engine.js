(()=>{
'use strict';
const VERSION='1.0.0';
function build(graph){
  if(!graph)throw new Error('Savingio knowledge graph is required');
  const recommend=(value,{limit=6,category='',exclude=[]}={})=>{
    const blocked=new Set(exclude);
    return graph.neighbors(value,{limit:Math.max(limit*3,12)})
      .filter(item=>item.record&&!blocked.has(item.record.href)&&(!category||item.record.category===category))
      .slice(0,limit)
      .map((item,index)=>Object.freeze({rank:index+1,score:item.weight,type:item.type,record:item.record}));
  };
  const sameCategory=(value,{limit=4}={})=>{
    const current=typeof value==='string'?(graph.getById(value)||graph.getByHref(value)):value;
    return current?recommend(current,{limit,category:current.category,exclude:[current.href]}):[];
  };
  const mixed=(value,{limit=6}={})=>{
    const current=typeof value==='string'?(graph.getById(value)||graph.getByHref(value)):value;
    if(!current)return[];
    const local=sameCategory(current,{limit:Math.ceil(limit/2)});
    const used=new Set([current.href,...local.map(item=>item.record.href)]);
    const broad=recommend(current,{limit:limit-local.length,exclude:[...used]});
    return Object.freeze([...local,...broad].slice(0,limit));
  };
  return Object.freeze({version:VERSION,recommend,sameCategory,mixed});
}
window.SavingioRelatedEngine=Object.freeze({VERSION,build});
})();