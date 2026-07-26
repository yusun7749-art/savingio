(() => {
  'use strict';

  const safeSummary=(name)=>{
    try{return window[name]?.summary?.()||null}catch{return null}
  };
  const safeVerify=(name)=>{
    try{return window[name]?.verify?.()||{pass:false,count:0}}catch{return {pass:false,count:0}}
  };
  const count=(value)=>Math.max(0,Number(value)||0);

  function read(){
    const workflow=window.SavingioV2WorkflowEngine?.summary?.()||{total:0,state:{pending:0,running:0,done:0,error:0},approvals:{pending:0,approved:0,rejected:0},stages:{}};
    const content=safeSummary('SavingioV2ContentInventoryStore')||{total:0,status:{}};
    const seo=safeSummary('SavingioV2SeoInventoryStore')||{total:0,status:{}};
    const image=safeSummary('SavingioV2ImageInventoryStore')||{total:0,status:{}};
    const qa=safeSummary('SavingioV2QaInventoryStore')||{total:0,result:{}};
    const deploy=safeSummary('SavingioV2DeployInventoryStore')||{total:0,status:{},verified:0,failed:0};
    const analytics=safeSummary('SavingioV2AnalyticsInventoryStore')||{total:0,status:{},views:0,clicks:0,impressions:0,conversions:0,revenueSignal:0,verified:0};
    const revenue=safeSummary('SavingioV2RevenueInventoryStore')||{total:0,status:{},estimated:0,confirmed:0,settled:0};
    const alerts=[
      {id:'workflow-errors',label:'워크플로 오류',count:count(workflow.state?.error),route:'command-error'},
      {id:'approval-pending',label:'승인 대기',count:count(workflow.approvals?.pending),route:'command-approval'},
      {id:'qa-fail',label:'QA 실패',count:count(qa.result?.fail),route:'dept-qa'},
      {id:'qa-blocked',label:'QA 중지',count:count(qa.result?.blocked),route:'dept-qa'},
      {id:'deploy-failed',label:'배포 실패',count:count(deploy.failed||deploy.status?.failed),route:'dept-deploy'},
      {id:'analytics-blocked',label:'분석 중지',count:count(analytics.status?.blocked),route:'dept-analytics'},
      {id:'revenue-blocked',label:'수익 중지',count:count(revenue.status?.blocked),route:'dept-revenue'}
    ];
    const integrityNames=['SavingioV2ContentInventoryStore','SavingioV2SeoInventoryStore','SavingioV2ImageInventoryStore','SavingioV2QaInventoryStore','SavingioV2DeployInventoryStore','SavingioV2AnalyticsInventoryStore','SavingioV2RevenueInventoryStore'];
    const integrity=integrityNames.map(name=>({name,result:safeVerify(name)}));
    return Object.freeze({
      workflow,content,seo,image,qa,deploy,analytics,revenue,alerts:Object.freeze(alerts),
      alertTotal:alerts.reduce((sum,item)=>sum+item.count,0),
      integrity:Object.freeze(integrity),
      integrityPass:integrity.every(item=>item.result.pass),
      checkedAt:new Date().toISOString()
    });
  }

  function verify(){
    const data=read();
    return Object.freeze({pass:data.integrityPass,centers:data.integrity.length,alerts:data.alertTotal,checkedAt:data.checkedAt});
  }

  Object.defineProperty(window,'SavingioV2OperationsDashboardStore',{value:Object.freeze({read,verify}),writable:false,configurable:false});
})();