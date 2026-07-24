(()=>{
'use strict';
const VERSION='1.0.0';
function audit(registry){
  const records=registry?.records||[],errors=[],warnings=[];
  const urlMap=new Map(),titleMap=new Map();
  records.forEach((record,index)=>{
    const ref={index,id:record.id,title:record.title,href:record.href};
    if(!record.title)errors.push({code:'MISSING_TITLE',...ref});
    if(!record.href)errors.push({code:'MISSING_URL',...ref});
    if(!record.category)errors.push({code:'MISSING_CATEGORY',...ref});
    if(!record.keywords&&!record.exactQueries?.length)warnings.push({code:'MISSING_SEARCH_TERMS',...ref});
    if(record.href){if(urlMap.has(record.href))errors.push({code:'DUPLICATE_URL',first:urlMap.get(record.href),...ref});else urlMap.set(record.href,ref);}
    if(record.title){if(titleMap.has(record.title))warnings.push({code:'DUPLICATE_TITLE',first:titleMap.get(record.title),...ref});else titleMap.set(record.title,ref);}
  });
  (registry?.duplicates||[]).forEach(item=>(item.duplicateUrl?errors:warnings).push({code:item.duplicateUrl?'DUPLICATE_URL_SOURCE':'DUPLICATE_TITLE_SOURCE',...item}));
  const report=Object.freeze({version:VERSION,checkedAt:new Date().toISOString(),recordCount:records.length,errorCount:errors.length,warningCount:warnings.length,pass:errors.length===0,errors:Object.freeze(errors),warnings:Object.freeze(warnings)});
  window.dispatchEvent(new CustomEvent('savingio-search-doctor',{detail:report}));
  return report;
}
async function run(){if(!window.SavingioArticleRegistry)throw new Error('SavingioArticleRegistry is not loaded');return audit(await window.SavingioArticleRegistry.load());}
window.SavingioSearchDoctor=Object.freeze({VERSION,audit,run});
})();
