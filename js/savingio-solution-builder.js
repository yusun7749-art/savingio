(()=>{
'use strict';
const VERSION='1.0.0';
function build({query='',intent=null,results=[],primary=null,related=[],actionChain=null,route=[],government=[],calculators=[],doctor=null}={}){
  const nextActions=[];
  if(actionChain?.steps?.length)actionChain.steps.forEach(step=>nextActions.push(Object.freeze({type:'action',label:step.label||String(step)})));
  calculators.forEach(item=>nextActions.push(Object.freeze({type:'calculator',label:item.name,href:item.href})));
  government.forEach(item=>nextActions.push(Object.freeze({type:'government',label:item.name,href:item.url})));
  return Object.freeze({version:VERSION,query,intent,results:Object.freeze([...results]),primary,related:Object.freeze([...related]),actionChain,route:Object.freeze([...route]),government:Object.freeze([...government]),calculators:Object.freeze([...calculators]),nextActions:Object.freeze(nextActions),doctor,generatedAt:new Date().toISOString()});
}
window.SavingioSolutionBuilder=Object.freeze({VERSION,build});
})();