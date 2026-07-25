(() => {
  'use strict';

  const workflow=window.SavingioV2WorkflowEngine;
  if(!workflow)throw new Error('Workflow Engine is not loaded');
  if(window.SavingioV2PipelineEngine)throw new Error('Pipeline Engine already exists');

  const INTERNAL_STAGES=Object.freeze(['content','seo','image','qa']);
  const EXTERNAL_STAGES=Object.freeze(['deploy','analytics','revenue']);
  const MAX_STEPS=20;
  const clone=value=>JSON.parse(JSON.stringify(value));

  function gate(job){
    if(job.status==='done')return Object.freeze({code:'done',label:'전체 파이프라인 완료',manual:false});
    if(job.status==='error')return Object.freeze({code:'error',label:'오류 확인 후 재시도 필요',manual:true});
    if(job.approvalStatus==='pending')return Object.freeze({code:'approval',label:'운영자 승인 필요',manual:true});
    if(job.stage==='deploy')return Object.freeze({code:'deploy',label:'GitHub·Cloudflare·실제 URL 검증 필요',manual:true});
    if(job.stage==='analytics')return Object.freeze({code:'analytics',label:'Search Console·성과 데이터 확인 필요',manual:true});
    if(job.stage==='revenue')return Object.freeze({code:'revenue',label:'AdSense·제휴·전환·정산 확인 필요',manual:true});
    return Object.freeze({code:'internal',label:'내부 자동 진행 가능',manual:false});
  }

  function run(id){
    const transitions=[];
    let current=workflow.readAll().find(job=>job.id===id);
    if(!current)throw new Error(`Workflow not found: ${id}`);

    for(let step=0;step<MAX_STEPS;step+=1){
      const currentGate=gate(current);
      if(currentGate.manual||current.status==='done')return Object.freeze({job:Object.freeze(clone(current)),gate:currentGate,transitions:Object.freeze(transitions)});

      if(current.status==='pending'){
        current=workflow.start(id);
        transitions.push(Object.freeze({stage:current.stage,action:'start',status:current.status}));
        continue;
      }

      if(current.status==='running'&&INTERNAL_STAGES.includes(current.stage)){
        current=workflow.advance(id);
        transitions.push(Object.freeze({stage:current.stage,action:current.approvalStatus==='pending'?'approval-requested':'advance',status:current.status}));
        continue;
      }

      return Object.freeze({job:Object.freeze(clone(current)),gate:gate(current),transitions:Object.freeze(transitions)});
    }

    throw new Error(`One-click pipeline exceeded ${MAX_STEPS} transitions`);
  }

  function runAll(){
    const results=[];
    workflow.readAll().filter(job=>job.status!=='done'&&job.status!=='error').forEach(job=>results.push(run(job.id)));
    return Object.freeze(results);
  }

  function summary(){
    const jobs=workflow.readAll();
    const gates={internal:0,approval:0,deploy:0,analytics:0,revenue:0,error:0,done:0};
    jobs.forEach(job=>{const code=gate(job).code;gates[code]=(gates[code]||0)+1;});
    return Object.freeze({...gates,total:jobs.length,autoReady:gates.internal});
  }

  function verify(){
    const result=summary();
    const counted=Object.entries(result).filter(([key])=>['internal','approval','deploy','analytics','revenue','error','done'].includes(key)).reduce((sum,[,value])=>sum+value,0);
    return Object.freeze({maxSteps:MAX_STEPS,internalStages:INTERNAL_STAGES,externalStages:EXTERNAL_STAGES,total:result.total,counted,pass:counted===result.total});
  }

  Object.defineProperty(window,'SavingioV2PipelineEngine',{value:Object.freeze({run,runAll,gate,summary,verify,internalStages:INTERNAL_STAGES,externalStages:EXTERNAL_STAGES,maxSteps:MAX_STEPS}),writable:false,configurable:false,enumerable:true});
})();