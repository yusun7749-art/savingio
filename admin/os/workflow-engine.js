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
      approvals:(Array.isArray(workflow.approvals) ? workflow.approvals : []).map(normalizeApproval)
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
      return normalize({ id:`WF-${project.id}`, projectId:project.id, title:project.title, category:project.category, status:project.status, stages });
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
      stageId:stage?.id || '',
      stageName:stage?.name || '승인',
      action,
      actor:actor || 'Savingio OS',
      note,
      createdAt:now()
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
      const next = workflow.stages[index + 1];
      if (next) {
        next.status = next.moduleId === 'approval' ? 'review' : 'active';
        next.startedAt = now();
        if (next.status === 'review') addApproval(workflow, next, 'requested', 'Savingio OS', `${stage.name} 완료 후 최종 승인을 요청했습니다.`);
      } else workflow.status = 'done';
    } else {
      stage.status = stage.moduleId === 'approval' ? 'review' : 'active';
      stage.startedAt = now();
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
    addApproval(workflow, stage, 'approved', input.actor || '선장님', input.note || '승인 완료');
    const next = workflow.stages[index + 1];
    if (next) { next.status = 'active'; next.startedAt = now(); } else workflow.status = 'done';
    return saveOne(workflow);
  }

  function reject(id, input={}) {
    const workflow = api.get(id);
    if (!workflow) return null;
    const stage = workflow.stages.find(item => item.status === 'review');
    if (!stage) return workflow;
    stage.status = 'error';
    addApproval(workflow, stage, 'rejected', input.actor || '선장님', input.note || '수정 후 재검토 필요');
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
      return saveOne(workflow);
    },
    update(id, patch={}) {
      const workflow = api.get(id);
      if (!workflow) return null;
      return saveOne({ ...workflow, ...patch, id });
    },
    advance,
    approve,
    reject,
    pause(id) {
      const workflow = api.get(id); if (!workflow) return null;
      const stage = workflow.stages.find(item => item.status === 'active');
      if (stage) stage.status = 'paused';
      workflow.status = 'paused'; return saveOne(workflow);
    },
    resume(id) {
      const workflow = api.get(id); if (!workflow) return null;
      const stage = workflow.stages.find(item => item.status === 'paused');
      if (stage) stage.status = 'active';
      workflow.status = 'running'; return saveOne(workflow);
    },
    remove(id) { const workflows = read().filter(item => item.id !== id); write(workflows); return true; },
    reset() { localStorage.removeItem(STORAGE_KEY); return clone(seed()); }
  };

  window.SavingioWorkflow = Object.freeze(api);
})();