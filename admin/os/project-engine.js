(() => {
  'use strict';

  const STORAGE_KEY = 'savingio-os-projects-v1';
  const LEGACY_KEY = 'savingio-admin-projects';
  const VERSION = '3.06';
  const STATUS = new Set(['draft','running','approval','paused','error','done','archived']);
  const PRIORITY = new Set(['low','normal','high','urgent']);
  const clone = value => JSON.parse(JSON.stringify(value));
  const now = () => new Date().toISOString();
  const uid = prefix => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`.toUpperCase();
  const safeArray = value => Array.isArray(value) ? value : [];
  const safeObject = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};

  function normalizeIntegration(input={}) { return { repository:String(input.repository || ''), branch:String(input.branch || 'main'), commitSha:String(input.commitSha || ''), commitUrl:String(input.commitUrl || ''), updatedAt:input.updatedAt || null }; }
  function normalizeDeployment(input={}) { return { provider:String(input.provider || 'cloudflare-pages'), status:String(input.status || 'idle'), deploymentId:String(input.deploymentId || ''), previewUrl:String(input.previewUrl || ''), productionUrl:String(input.productionUrl || ''), deployedAt:input.deployedAt || null, verifiedAt:input.verifiedAt || null, error:String(input.error || '') }; }
  function normalizeAnalytics(input={}) { return { views:Number(input.views || 0), clicks:Number(input.clicks || 0), conversions:Number(input.conversions || 0), revenue:Number(input.revenue || 0), lastSyncedAt:input.lastSyncedAt || null }; }
  function normalizeRevenue(input={}) { return { currency:String(input.currency || 'KRW'), expected:Number(input.expected || 0), realized:Number(input.realized || 0), sources:safeArray(input.sources).map(item => ({ id:String(item?.id || uid('REV')), type:String(item?.type || 'other'), label:String(item?.label || ''), amount:Number(item?.amount || 0) })) }; }

  function normalizeProject(input={}) {
    const createdAt = input.createdAt || now();
    const id = String(input.id || uid('PRJ'));
    const metadata = safeObject(input.metadata);
    return {
      schemaVersion:VERSION, id, uuid:String(input.uuid || id), title:String(input.title || '새 프로젝트'), description:String(input.description || ''), category:String(input.category || '미분류'), type:String(input.type || '통합 프로젝트'),
      status:STATUS.has(input.status) ? input.status : 'draft', priority:PRIORITY.has(input.priority) ? input.priority : 'normal', owner:String(input.owner || '선장님'),
      tags:[...new Set(safeArray(input.tags).map(String).map(value => value.trim()).filter(Boolean))], progress:Math.max(0, Math.min(100, Number(input.progress || 0))), currentStageId:String(input.currentStageId || ''), workflowId:String(input.workflowId || ''),
      assetIds:[...new Set(safeArray(input.assetIds).map(String).filter(Boolean))], approvalIds:[...new Set(safeArray(input.approvalIds).map(String).filter(Boolean))], logIds:[...new Set(safeArray(input.logIds).map(String).filter(Boolean))], pluginIds:[...new Set(safeArray(input.pluginIds).map(String).filter(Boolean))],
      github:normalizeIntegration(input.github), deployment:normalizeDeployment(input.deployment), analytics:normalizeAnalytics(input.analytics), revenue:normalizeRevenue(input.revenue),
      metadata:{ createdAt, updatedAt:metadata.updatedAt || input.updatedAt || createdAt, archivedAt:metadata.archivedAt || null, restoredAt:metadata.restoredAt || null, duplicatedFrom:String(metadata.duplicatedFrom || ''), source:String(metadata.source || input.source || 'savingio-admin'), revision:Number(metadata.revision || 1) }
    };
  }

  function readRaw() { try { const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); return Array.isArray(parsed) ? parsed : []; } catch { return []; } }
  function write(projects) { const normalized = projects.map(normalizeProject); localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized)); window.dispatchEvent(new CustomEvent('savingio:projects-changed', { detail:{ projects:clone(normalized) } })); return normalized; }
  function legacyProjects() { let legacy=[]; try { legacy=JSON.parse(localStorage.getItem(LEGACY_KEY)||'[]'); } catch { legacy=[]; } if(!Array.isArray(legacy)||!legacy.length) legacy=window.SAVINGIO_ADMIN_DATA?.projects||[]; return safeArray(legacy).map(item=>normalizeProject({id:item.id,uuid:item.id,title:item.title,category:item.category,type:item.type,status:item.status==='approval'?'approval':item.status==='done'?'done':item.status==='error'?'error':'running',progress:item.progress,currentStageId:'',source:'legacy-admin'})); }
  function seed() { const current=readRaw(); if(current.length) return current.map(normalizeProject); const seeded=legacyProjects(); if(seeded.length) write(seeded); return seeded; }
  function saveOne(project) { const projects=seed(); const normalized=normalizeProject(project); const index=projects.findIndex(item=>item.id===normalized.id); if(index>=0) projects[index]=normalized; else projects.unshift(normalized); write(projects); return clone(normalized); }
  function update(id, patch={}) { const current=api.get(id); if(!current) return null; const metadata={...current.metadata,...safeObject(patch.metadata),updatedAt:now(),revision:Number(current.metadata?.revision||1)+1}; return saveOne({...current,...patch,id:current.id,uuid:current.uuid,metadata}); }
  function link(id,kind,value){const field=`${kind}Ids`;if(!['assetIds','approvalIds','logIds','pluginIds'].includes(field))return null;const current=api.get(id);if(!current)return null;return update(id,{[field]:[...new Set([...current[field],String(value)])]});}
  function unlink(id,kind,value){const field=`${kind}Ids`;if(!['assetIds','approvalIds','logIds','pluginIds'].includes(field))return null;const current=api.get(id);if(!current)return null;return update(id,{[field]:current[field].filter(item=>item!==String(value))});}
  function validate(project){const item=normalizeProject(project),errors=[],warnings=[];if(!item.id)errors.push('PROJECT_ID_MISSING');if(!item.uuid)errors.push('PROJECT_UUID_MISSING');if(!item.title.trim())errors.push('PROJECT_TITLE_MISSING');if(!item.category.trim())warnings.push('PROJECT_CATEGORY_MISSING');if(item.workflowId&&item.workflowId===item.id)warnings.push('WORKFLOW_ID_EQUALS_PROJECT_ID');if(item.progress<0||item.progress>100)errors.push('PROJECT_PROGRESS_RANGE');if(item.status==='done'&&item.progress<100)warnings.push('DONE_PROGRESS_MISMATCH');if(item.status==='archived'&&!item.metadata.archivedAt)warnings.push('ARCHIVE_TIME_MISSING');return{valid:errors.length===0,errors,warnings,project:clone(item)};}

  const api={
    version:VERSION,
    schema:Object.freeze({required:['id','uuid','title','category','status','priority','owner','metadata'],links:['workflowId','assetIds','approvalIds','logIds','pluginIds'],integrations:['github','deployment','analytics','revenue']}),
    list(options={}){const includeArchived=Boolean(options.includeArchived);return clone(seed().filter(item=>includeArchived||item.status!=='archived'));},
    get(id){return clone(seed().find(item=>item.id===String(id))||null);},
    create(input={}){return saveOne(normalizeProject({...input,source:input.source||'project-engine'}));},
    duplicate(id, input={}) {
      const source=api.get(id); if(!source) return null;
      return saveOne(normalizeProject({ title:String(input.title||`${source.title} 복사본`), description:source.description, category:source.category, type:source.type, priority:source.priority, owner:source.owner, tags:source.tags, status:'draft', progress:0, currentStageId:'', workflowId:'', assetIds:[], approvalIds:[], logIds:[], pluginIds:source.pluginIds, github:{repository:source.github.repository,branch:source.github.branch}, deployment:{provider:source.deployment.provider,status:'idle'}, analytics:{}, revenue:{currency:source.revenue.currency}, metadata:{duplicatedFrom:source.id,source:'project-duplicate'} }));
    },
    update,
    remove(id){const projects=seed().filter(item=>item.id!==String(id));write(projects);return true;},
    archive(id){const current=api.get(id);if(!current||current.status==='archived')return current;return update(id,{status:'archived',metadata:{archivedAt:now()}});},
    restore(id){const current=api.get(id);if(!current||current.status!=='archived')return current;return update(id,{status:'draft',progress:Math.min(Number(current.progress||0),95),metadata:{archivedAt:null,restoredAt:now()}});},
    setWorkflow(id,workflowId){return update(id,{workflowId:String(workflowId||'')});},
    setCurrentStage(id,stageId,progress){const patch={currentStageId:String(stageId||'')};if(Number.isFinite(Number(progress)))patch.progress=Number(progress);return update(id,patch);},
    linkAsset(id,value){return link(id,'asset',value);},unlinkAsset(id,value){return unlink(id,'asset',value);},linkApproval(id,value){return link(id,'approval',value);},unlinkApproval(id,value){return unlink(id,'approval',value);},linkLog(id,value){return link(id,'log',value);},unlinkLog(id,value){return unlink(id,'log',value);},linkPlugin(id,value){return link(id,'plugin',value);},unlinkPlugin(id,value){return unlink(id,'plugin',value);},
    validate,validateAll(){const results=seed().map(validate);return{valid:results.every(item=>item.valid),total:results.length,failed:results.filter(item=>!item.valid).length,results};},migrate(){const projects=seed().map(normalizeProject);write(projects);return clone(projects);},reset(){localStorage.removeItem(STORAGE_KEY);return clone(seed());}
  };
  window.SavingioProject=Object.freeze(api);
})();