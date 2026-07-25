(() => {
  const STORAGE_KEY = 'savingio-os-workflows-v1';
  const STATUS = { wait:'대기', active:'진행 중', review:'승인 대기', done:'완료', error:'오류', paused:'중지' };
  const DEFAULT_FLOW = [
    { id:'market', moduleId:'market', name:'시장분석', status:'wait' },
    { id:'content', moduleId:'content', name:'콘텐츠 제작', status:'wait' },
    { id:'media', moduleId:'video', name:'이미지·쇼츠 제작', status:'wait' },
    { id:'approval', moduleId:'approval', name:'최종 승인', status:'wait' },
    { id:'publish', moduleId:'automation', name:'GitHub·Cloudflare 배포', status:'wait' },
    { id:'analytics', moduleId:'analytics', name:'성과 분석', status:'wait' }
  ];
  const clone = value => JSON.parse(JSON.stringify(value));
  const read = () => {
    try { const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); return Array.isArray(value) ? value : []; }
    catch { return []; }
  };
  const write = value => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent('savingio:workflows-changed', { detail:{ workflows:clone(value) } }));
  };
  const now = () => new Date().toISOString();

  function normalizeStage(stage, index) {
    return {
      id:String(stage.id || `stage-${index + 1}`),
      moduleId:String(stage.moduleId || 'command'),
      name:String(stage.name || `단계 ${index + 1}`),
      status:STATUS[stage.status] ? stage.status : 'wait',
      owner:String(stage.owner || ''),
      note:String(stage.note || ''),
      startedAt:stage.startedAt || null,
      completedAt:stage.completedAt || null
    };
  }

  function normalizeApproval(item, index) {
    return {
      id:String(item.id || `APR-${Date.now()}-${index}`),
      stageId:String(item.stageId || ''),
      stageName:String(item.stageName || '승인'),
      action:['requested','approved','rejected'].includes(item.action) ? item.action : 'requested',
      actor:String(item.actor || 'Savingio OS'),
      note:String(item.note || ''),
      createdAt:item.createdAt || now()
    };
  }

  function normalizeLog(item, index) {
    return {
      id:String(item.id || `LOG-${Date.now()}-${index}`),
      type:String(item.type || 'info'),
      level:['info','success','warn','error'].includes(item.level) ? item.level : 'info',
      title:String(item.title || '활동 기록'),
      message:String(item.message || ''),
      actor:String(item.actor || 'Savingio OS'),
      moduleId:String(item.moduleId || ''),
      stageId:String(item.stageId || ''),
      stageName:String(item.stageName || ''),
      targetId:String(item.targetId || ''),
      createdAt:item.createdAt || now()
    };
  }

  function normalize(workflow) {
    const stages = Array.isArray(workflow.stages) && workflow.stages.length ? workflow.stages : DEFAULT_FLOW;
    return {
      id:String(workflow.id || `WF-${Date.now()}`),
      projectId:String(workflow.projectId || workflow.id || ''),
      title:String(workflow.title || '새 프로젝트'),
      category:String(workflow.category || '미분류'),
      status:String(workflow.status || 'running'),
      createdAt:workflow.createdAt || now(),
      updatedAt:workflow.updatedAt || now(),
      stages:stages.map(normalizeStage),
      approvals:(Array.isArray(workflow.approvals) ? workflow.approvals : []).map(normalizeApproval),
      logs:(Array.isArray(workflow.logs) ? workflow.logs : []).map(normalizeLog)
    };
  }

  function seed() {
    const existing = read();
    if (existing.length) return existing.map(normalize);
    const projects = window.SAVINGIO_ADMIN_DATA?.projects || [];
    const seeded = projects.map(project => {
      const stages = (project.stages || []).map((stage, index) => ({
        id:`stage-${index + 1}`,
        moduleId:DEFAULT_FLOW[Math.min(index, DEFAULT_FLOW.length - 1)].moduleId,
        name:stage[0],
        status:stage[1] === 'active' ? 'active' : stage[1] === 'done' ? 'done' : 'wait'
      }));
      const workflow = normalize({ id:`WF-${project.id}`, projectId:project.id, title:project.title, category:project.category, status:project.status, stages });
      workflow.logs.unshift(normalizeLog({ type:'workflow-created', level:'success', title:'워크플로 생성', message:'관리자 프로젝트에서 공통 워크플로를 생성했습니다.', actor:'Savingio OS' }, 0));
      return workflow;
    });
    write(seeded);
    return seeded;
  }

  function saveOne(workflow) {
    const workflows = read().map(normalize);
    const normalized = normalize({ ...workflow, updatedAt:now() });
    const index = workflows.findIndex(item => item.id === normalized.id);
    if (index >= 0) workflows[index] = normalized; else workflows.unshift(normalized);
    write(workflows);
    return clone(normalized);
  }

  function addApproval(workflow, stage, action, actor, note='') {
    workflow.approvals = Array.isArray(workflow.approvals) ? workflow.approvals : [];
    workflow.approvals.unshift(normalizeApproval({
      id:`APR-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
      stageId:stage?.id || '', stageName:stage?.name || '승인', action,
      actor:actor || 'Savingio OS', note, createdAt:now()
    }, 0));
  }

  function addLog(workflow, input={}) {
    workflow.logs = Array.isArray(workflow.logs) ? workflow.logs : [];
    workflow.logs.unshift(normalizeLog({
      id:`LOG-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
      ...input,
      createdAt:input.createdAt || now()
    }, 0));
  }

  function advance(id) {
    const workflow = api.get(id);
    if (!workflow) return null;
    const currentIndex = workflow.stages.findIndex(stage => ['active','review','error','paused'].includes(stage.status));
    const index = currentIndex >= 0 ? currentIndex : workflow.stages.findIndex(stage => stage.status === 'wait');
    if (index < 0) return workflow;
    const stage = workflow.stages[index];
    if (stage.status === 'review') return workflow;
    if (stage.status === 'active') {
      stage.status = 'done';
      stage.completedAt = now();
      addLog(workflow, { type:'stage-completed', level:'success', title:`${stage.name} 완료`, message:'현재 단계를 완료하고 다음 단계로 인계했습니다.', moduleId:stage.moduleId, stageId:stage.id, stageName:stage.name });
      const next = workflow.stages[index + 1];
      if (next) {
        next.status = next.moduleId === 'approval' ? 'review' : 'active';
        next.startedAt = now();
        addLog(workflow, { type:next.status === 'review' ? 'approval-requested' : 'stage-started', level:next.status === 'review' ? 'warn' : 'info', title:next.status === 'review' ? '최종 승인 요청' : `${next.name} 시작`, message:`${stage.name}에서 ${next.name}(으)로 작업을 인계했습니다.`, moduleId:next.moduleId, stageId:next.id, stageName:next.name });
        if (next.status === 'review') addApproval(workflow, next, 'requested', 'Savingio OS', `${stage.name} 완료 후 최종 승인을 요청했습니다.`);
      } else {
        workflow.status = 'done';
        addLog(workflow, { type:'workflow-completed', level:'success', title:'워크플로 완료', message:'모든 단계를 완료했습니다.' });
      }
    } else {
      stage.status = stage.moduleId === 'approval' ? 'review' : 'active';
      stage.startedAt = now();
      addLog(workflow, { type:stage.status === 'review' ? 'approval-requested' : 'stage-started', level:stage.status === 'review' ? 'warn' : 'info', title:stage.status === 'review' ? '최종 승인 요청' : `${stage.name} 시작`, message:'해당 단계를 시작했습니다.', moduleId:stage.moduleId, stageId:stage.id, stageName:stage.name });
      if (stage.status === 'review') addApproval(workflow, stage, 'requested', 'Savingio OS', '최종 승인을 요청했습니다.');
    }
    return saveOne(workflow);
  }

  function approve(id, input={}) {
    const workflow = api.get(id);
    if (!workflow) return null;
    const index = workflow.stages.findIndex(stage => stage.status === 'review');
    if (index < 0) return workflow;
    const stage = workflow.stages[index];
    stage.status = 'done';
    stage.completedAt = now();
    const actor = input.actor || '선장님';
    const note = input.note || '승인 완료';
    addApproval(workflow, stage, 'approved', actor, note);
    addLog(workflow, { type:'approval-approved', level:'success', title:'최종 승인 완료', message:note, actor, moduleId:stage.moduleId, stageId:stage.id, stageName:stage.name });
    const next = workflow.stages[index + 1];
    if (next) {
      next.status = 'active'; next.startedAt = now();
      addLog(workflow, { type:'stage-started', level:'info', title:`${next.name} 시작`, message:'승인 완료 후 다음 단계로 인계했습니다.', moduleId:next.moduleId, stageId:next.id, stageName:next.name });
    } else workflow.status = 'done';
    return saveOne(workflow);
  }

  function reject(id, input={}) {
    const workflow = api.get(id);
    if (!workflow) return null;
    const stage = workflow.stages.find(item => item.status === 'review');
    if (!stage) return workflow;
    const actor = input.actor || '선장님';
    const note = input.note || '수정 후 재검토 필요';
    stage.status = 'error';
    addApproval(workflow, stage, 'rejected', actor, note);
    addLog(workflow, { type:'approval-rejected', level:'error', title:'승인 반려', message:note, actor, moduleId:stage.moduleId, stageId:stage.id, stageName:stage.name });
    workflow.status = 'error';
    return saveOne(workflow);
  }

  const api = {
    labels:clone(STATUS),
    list() { return clone(seed()); },
    get(id) { return clone(seed().find(item => item.id === id) || null); },
    create(input={}) {
      const workflow = normalize({ ...input, stages:input.stages || DEFAULT_FLOW });
      if (workflow.stages.length && !workflow.stages.some(stage => stage.status === 'active')) {
        workflow.stages[0].status = 'active'; workflow.stages[0].startedAt = now();
      }
      addLog(workflow, { type:'workflow-created', level:'success', title:'워크플로 생성', message:`${workflow.title} 프로젝트 워크플로를 생성했습니다.`, actor:input.actor || 'Savingio OS', moduleId:workflow.stages[0]?.moduleId || '', stageId:workflow.stages[0]?.id || '', stageName:workflow.stages[0]?.name || '' });
      return saveOne(workflow);
    },
    update(id, patch={}) {
      const workflow = api.get(id);
      if (!workflow) return null;
      addLog(workflow, { type:'workflow-updated', level:'info', title:'워크플로 정보 수정', message:'프로젝트 워크플로 정보를 수정했습니다.', actor:patch.actor || 'Savingio OS' });
      return saveOne({ ...workflow, ...patch, id, logs:workflow.logs });
    },
    log(id, input={}) {
      const workflow = api.get(id); if (!workflow) return null;
      addLog(workflow, input); return saveOne(workflow);
    },
    advance, approve, reject,
    pause(id) {
      const workflow = api.get(id); if (!workflow) return null;
      const stage = workflow.stages.find(item => item.status === 'active');
      if (stage) stage.status = 'paused';
      workflow.status = 'paused';
      addLog(workflow, { type:'workflow-paused', level:'warn', title:'워크플로 일시 중지', message:'관리자가 작업을 일시 중지했습니다.', actor:'선장님', moduleId:stage?.moduleId || '', stageId:stage?.id || '', stageName:stage?.name || '' });
      return saveOne(workflow);
    },
    resume(id) {
      const workflow = api.get(id); if (!workflow) return null;
      const stage = workflow.stages.find(item => item.status === 'paused');
      if (stage) stage.status = 'active';
      workflow.status = 'running';
      addLog(workflow, { type:'workflow-resumed', level:'info', title:'워크플로 다시 시작', message:'중지된 작업을 다시 시작했습니다.', actor:'선장님', moduleId:stage?.moduleId || '', stageId:stage?.id || '', stageName:stage?.name || '' });
      return saveOne(workflow);
    },
    remove(id) { const workflows = read().filter(item => item.id !== id); write(workflows); return true; },
    reset() { localStorage.removeItem(STORAGE_KEY); return clone(seed()); }
  };

  window.SavingioWorkflow = Object.freeze(api);
})();