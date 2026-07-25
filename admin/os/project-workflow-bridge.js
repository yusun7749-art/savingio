(() => {
  'use strict';

  const clone = value => JSON.parse(JSON.stringify(value));
  const activeStage = workflow => workflow.stages.find(stage => ['active','review','paused','error'].includes(stage.status)) || workflow.stages.find(stage => stage.status === 'wait') || null;
  const progress = workflow => {
    const stages = Array.isArray(workflow.stages) ? workflow.stages : [];
    if (!stages.length) return 0;
    return Math.round(stages.filter(stage => stage.status === 'done').length / stages.length * 100);
  };
  const projectStatus = workflow => {
    if (workflow.status === 'done') return 'done';
    if (workflow.status === 'paused') return 'paused';
    if (workflow.status === 'error') return 'error';
    if (workflow.stages?.some(stage => stage.status === 'review')) return 'approval';
    return 'running';
  };

  function syncWorkflow(workflow) {
    if (!workflow?.id || !workflow.projectId || !window.SavingioProject) return null;
    const project = window.SavingioProject.get(workflow.projectId);
    if (!project) return null;
    const current = activeStage(workflow);
    const approvalIds = [...new Set((workflow.approvals || []).map(item => String(item.id || '')).filter(Boolean))];
    const logIds = [...new Set((workflow.logs || []).map(item => String(item.id || '')).filter(Boolean))];
    return window.SavingioProject.update(project.id, {
      workflowId:workflow.id,
      currentStageId:current?.id || '',
      progress:progress(workflow),
      status:projectStatus(workflow),
      approvalIds,
      logIds,
      metadata:{ source:'project-workflow-bridge' }
    });
  }

  function reconcile() {
    if (!window.SavingioProject || !window.SavingioWorkflow) return { linked:0, missingProjects:[], missingWorkflows:[] };
    const projects = window.SavingioProject.list({ includeArchived:true });
    const workflows = window.SavingioWorkflow.list();
    const projectIds = new Set(projects.map(item => item.id));
    const workflowIds = new Set(workflows.map(item => item.id));
    const missingProjects = workflows.filter(item => item.projectId && !projectIds.has(item.projectId)).map(item => ({ workflowId:item.id, projectId:item.projectId }));
    const missingWorkflows = projects.filter(item => item.workflowId && !workflowIds.has(item.workflowId)).map(item => ({ projectId:item.id, workflowId:item.workflowId }));
    let linked = 0;
    workflows.forEach(workflow => { if (syncWorkflow(workflow)) linked += 1; });
    return { linked, missingProjects, missingWorkflows };
  }

  function audit() {
    if (!window.SavingioProject || !window.SavingioWorkflow) return { valid:false, errors:['ENGINE_MISSING'], warnings:[] };
    const projects = window.SavingioProject.list({ includeArchived:true });
    const workflows = window.SavingioWorkflow.list();
    const errors = [];
    const warnings = [];
    const projectMap = new Map(projects.map(item => [item.id, item]));
    const workflowMap = new Map(workflows.map(item => [item.id, item]));
    const projectLinks = new Map();

    workflows.forEach(workflow => {
      if (!workflow.projectId) errors.push(`WORKFLOW_PROJECT_MISSING:${workflow.id}`);
      else if (!projectMap.has(workflow.projectId)) errors.push(`WORKFLOW_PROJECT_BROKEN:${workflow.id}`);
      const duplicates = projectLinks.get(workflow.projectId) || [];
      duplicates.push(workflow.id);
      projectLinks.set(workflow.projectId, duplicates);
      const project = projectMap.get(workflow.projectId);
      if (project && project.workflowId !== workflow.id) errors.push(`PROJECT_WORKFLOW_MISMATCH:${project.id}`);
      if (project && project.currentStageId !== (activeStage(workflow)?.id || '')) warnings.push(`PROJECT_STAGE_STALE:${project.id}`);
      if (project && Number(project.progress) !== progress(workflow)) warnings.push(`PROJECT_PROGRESS_STALE:${project.id}`);
    });

    projects.forEach(project => {
      if (project.workflowId && !workflowMap.has(project.workflowId)) errors.push(`PROJECT_WORKFLOW_BROKEN:${project.id}`);
    });
    projectLinks.forEach((ids, projectId) => { if (projectId && ids.length > 1) errors.push(`MULTIPLE_WORKFLOWS:${projectId}`); });

    return { valid:errors.length === 0, checkedAt:new Date().toISOString(), projects:projects.length, workflows:workflows.length, errors, warnings };
  }

  function onWorkflowsChanged(event) {
    const workflows = event.detail?.workflows || [];
    workflows.forEach(syncWorkflow);
    window.dispatchEvent(new CustomEvent('savingio:project-workflow-synced', { detail:audit() }));
  }

  function boot() {
    window.addEventListener('savingio:workflows-changed', onWorkflowsChanged);
    const result = reconcile();
    window.SavingioProjectWorkflow = Object.freeze({ sync:syncWorkflow, reconcile, audit, snapshot:() => clone(result) });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();