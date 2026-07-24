(()=>{
'use strict';
const VERSION='1.0.0';
function build(graph){
  if(!graph)throw new Error('Savingio knowledge graph is required');
  const resolve=value=>typeof value==='string'?(graph.getById(value)||graph.getByHref(value)):value;
  const shortest=(from,to,{maxDepth=6}={})=>{
    const start=resolve(from),goal=resolve(to);
    if(!start||!goal)return null;
    if(start.id===goal.id)return Object.freeze({distance:0,records:Object.freeze([start])});
    const queue=[[start.id]],visited=new Set([start.id]);
    while(queue.length){
      const path=queue.shift();
      if(path.length-1>=maxDepth)continue;
      const current=graph.getById(path[path.length-1]);
      for(const edge of graph.neighbors(current,{limit:1000})){
        const id=edge.record?.id;
        if(!id||visited.has(id))continue;
        const next=[...path,id];
        if(id===goal.id)return Object.freeze({distance:next.length-1,records:Object.freeze(next.map(item=>graph.getById(item)).filter(Boolean))});
        visited.add(id);queue.push(next);
      }
    }
    return null;
  };
  const fromQuery=(query,search,{limit=5}={})=>{
    const ranked=search(query).slice(0,limit).map(item=>item.record||item).filter(Boolean);
    if(!ranked.length)return Object.freeze([]);
    const route=[ranked[0]],used=new Set([ranked[0].id]);
    ranked.slice(1).forEach(target=>{
      const leg=shortest(route[route.length-1],target,{maxDepth:3});
      (leg?.records||[target]).slice(1).forEach(record=>{if(!used.has(record.id)){used.add(record.id);route.push(record);}});
    });
    return Object.freeze(route.slice(0,limit));
  };
  return Object.freeze({version:VERSION,shortest,fromQuery});
}
window.SavingioRouteEngine=Object.freeze({VERSION,build});
})();