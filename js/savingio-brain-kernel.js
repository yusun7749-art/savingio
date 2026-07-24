(()=>{
'use strict';
const VERSION='1.0.0';
function create(options={}){
  let state=Object.freeze({status:'idle',bootedAt:null,services:{}});
  const boot=async()=>{
    if(state.status==='ready')return api;
    state=Object.freeze({...state,status:'booting'});
    const registry=await window.SavingioArticleRegistry.load({force:Boolean(options.force)});
    const graph=window.SavingioBrainEngine.build(registry);
    const pipeline=window.SavingioSearchCore.createPipeline(registry.records);
    const related=window.SavingioRelatedEngine.build(graph);
    const actions=window.SavingioActionChain.build(graph,related);
    const memory=window.SavingioMemoryEngine.create(options.memory||{});
    const routes=window.SavingioRouteEngine.build(graph);
    const doctor=window.SavingioSearchDoctor.audit(registry);
    const services=Object.freeze({registry,graph,pipeline,related,actions,memory,routes,doctor,intent:window.SavingioIntentEngine});
    state=Object.freeze({status:'ready',bootedAt:new Date().toISOString(),services});
    window.dispatchEvent(new CustomEvent('savingio-brain-kernel-ready',{detail:{version:VERSION,records:registry.records.length,doctor}}));
    return api;
  };
  const ensure=()=>{if(state.status!=='ready')throw new Error('Savingio Brain Kernel is not ready');return state.services;};
  const solve=async({query='',category='전체',limit=8,remember=true}={})=>{
    if(state.status!=='ready')await boot();
    const services=ensure();
    const intentResult=services.intent.search(services.pipeline,query,category);
    const memoryWeights=services.memory.articleWeights();
    const ranked=intentResult.results.map(item=>({
      ...item,
      memoryScore:memoryWeights.get(item.record.id)||memoryWeights.get(item.record.href)||0,
      totalScore:item.score+(memoryWeights.get(item.record.id)||memoryWeights.get(item.record.href)||0)*250
    })).sort((a,b)=>b.totalScore-a.totalScore).slice(0,limit);
    const primary=ranked[0]?.record||null;
    const solution=Object.freeze({
      query,
      intent:intentResult.intent,
      results:Object.freeze(ranked),
      primary,
      related:primary?services.related.mixed(primary,{limit:6}):Object.freeze([]),
      actionChain:primary?services.actions.chain(primary):null,
      route:primary?services.routes.fromQuery(intentResult.intent.expandedQuery,q=>services.pipeline.search(q,category),{limit:5}):Object.freeze([]),
      doctor:services.doctor,
      generatedAt:new Date().toISOString()
    });
    if(remember&&query)services.memory.remember('solve',{query,articleId:primary?.id,href:primary?.href,meta:{category,intents:solution.intent.intents}});
    return solution;
  };
  const inspect=value=>{const s=ensure();const record=typeof value==='string'?(s.graph.getById(value)||s.graph.getByHref(value)):value;if(!record)return null;return Object.freeze({record,path:s.graph.path(record),related:s.related.mixed(record,{limit:6}),actionChain:s.actions.chain(record),memoryWeight:s.memory.articleWeights().get(record.id)||s.memory.articleWeights().get(record.href)||0});};
  const health=()=>{const s=ensure();return Object.freeze({version:VERSION,status:state.status,bootedAt:state.bootedAt,registry:s.registry.records.length,graph:s.graph.stats(),doctor:s.doctor,memoryEvents:s.memory.size()});};
  const api=Object.freeze({version:VERSION,boot,solve,inspect,health,getState:()=>state,get services(){return ensure();}});
  return api;
}
window.SavingioBrainKernel=Object.freeze({VERSION,create});
})();