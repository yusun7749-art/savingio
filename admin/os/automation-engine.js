(() => {
  'use strict';

  const STORAGE_KEY = 'savingio-os-automation-jobs-v1';
  const clone = value => JSON.parse(JSON.stringify(value));
  const now = () => new Date().toISOString();
  const uid = prefix => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`.toUpperCase();

  function read() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function write(jobs, detail={}) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
    window.dispatchEvent(new CustomEvent('savingio:automation-jobs-changed', {
      detail:{ jobs:clone(jobs), ...clone(detail) }
    }));
    return jobs;
  }

  function normalize(input={}) {
    const createdAt = input.createdAt || now();
    return {
      id:String(input.id || uid('JOB')),
      type:String(input.type || 'github-release'),
      status:['queued','running','success','error','paused','cancelled'].includes(input.status) ? input.status : 'queued',
      projectId:String(input.projectId || ''),
      workflowId:String(input.workflowId || ''),
      approvalId:String(input.approvalId || ''),
      stageId:String(input.stageId || ''),
      title:String(input.title || 'GitHub 반영 작업'),
      repository:String(input.repository || 'yusun7749-art/savingio'),
      branch:String(input.branch || 'main'),
      commitSha:String(input.commitSha || ''),
      commitUrl:String(input.commitUrl || ''),
      githubState:String(input.githubState || 'unknown'),
      githubChecks:Array.isArray(input.githubChecks) ? input.githubChecks : [],
      lastCheckedAt:input.lastCheckedAt || null,
      cloudflareDeploymentId:String(input.cloudflareDeploymentId || ''),
      cloudflareState:String(input.cloudflareState || 'unknown'),
      deploymentUrl:String(input.deploymentUrl || ''),
      productionUrl:String(input.productionUrl || ''),
      deploymentCheckedAt:input.deploymentCheckedAt || null,
      payload:input.payload && typeof input.payload === 'object' ? input.payload : {},
      attempts:Number(input.attempts || 0),
      createdAt,
      updatedAt:input.updatedAt || createdAt,
      startedAt:input.startedAt || null,
      completedAt:input.completedAt || null,
      error:String(input.error || '')
    };
  }

  function save(job) {
    const jobs = read().map(normalize);
    const normalized = normalize({ ...job, updatedAt:now() });
    const index = jobs.findIndex(item => item.id === normalized.id);
    if (index >= 0) jobs[index] = normalized;
    else jobs.unshift(normalized);
    write(jobs, { action:index >= 0 ? 'updated' : 'created', job:normalized });
    return clone(normalized);
  }

  function update(id, patch={}) {
    const current = read().map(normalize).find(item => item.id === String(id));
    if (!current) return null;
    const next = save({
      ...current,
      ...patch,
      id:current.id,
      attempts:patch.status === 'running' && current.status !== 'running' ? current.attempts + 1 : (patch.attempts ?? current.attempts),
      startedAt:patch.status === 'running' && !current.startedAt ? now() : (patch.startedAt ?? current.startedAt),
      completedAt:['success','error','cancelled'].includes(patch.status) ? now() : (patch.completedAt ?? current.completedAt)
    });
    window.dispatchEvent(new CustomEvent('savingio:automation-job-status', { detail:{ job:clone(next) } }));
    return next;
  }

  function approvedItems(workflow) {
    return (workflow?.approvals || []).filter(item => item.action === 'approved');
  }

  function createFromApproval(workflow, approval) {
    if (!workflow?.projectId || !approval?.id) return null;
    const duplicate = read().map(normalize).find(job => job.approvalId === approval.id && job.projectId === workflow.projectId);
    if (duplicate) return clone(duplicate);
    const project = window.SavingioProject?.get?.(workflow.projectId);
    if (!project) return null;
    const job = save({
      type:'github-release',
      status:'queued',
      projectId:project.id,
      workflowId:workflow.id,
      approvalId:approval.id,
      stageId:approval.stageId,
      title:`${project.title} GitHub 반영`,
      repository:project.github?.repository || 'yusun7749-art/savingio',
      branch:project.github?.branch || 'main',
      payload:{
        projectTitle:project.title,
        category:project.category,
        approvedBy:approval.actor,
        approvalNote:approval.note,
        approvedAt:approval.createdAt,
        cloudflareProject:project.deployment?.projectName || 'savingio',
        productionUrl:project.deployment?.productionUrl || 'https://savingio.com',
        source:'workflow-approval'
      }
    });
    window.SavingioProject?.update?.(project.id, {
      github:{
        ...project.github,
        repository:job.repository,
        branch:job.branch,
        updatedAt:now()
      },
      metadata:{ automationJobId:job.id }
    });
    window.SavingioWorkflow?.log?.(workflow.id, {
      type:'automation-job-created',
      level:'info',
      title:'GitHub 작업 생성',
      message:`승인 완료 후 자동화 작업 ${job.id}을(를) 대기열에 등록했습니다.`,
      actor:'Savingio Automation',
      moduleId:'automation',
      stageId:approval.stageId,
      stageName:approval.stageName,
      targetId:job.id
    });
    window.dispatchEvent(new CustomEvent('savingio:github-job-created', { detail:{ job:clone(job) } }));
    return job;
  }

  function scan() {
    if (!window.SavingioWorkflow || !window.SavingioProject) return { created:0, jobs:read().map(normalize) };
    let created = 0;
    window.SavingioWorkflow.list().forEach(workflow => {
      approvedItems(workflow).forEach(approval => {
        const before = read().length;
        createFromApproval(workflow, approval);
        if (read().length > before) created += 1;
      });
    });
    return { created, jobs:read().map(normalize) };
  }

  function boot() {
    window.addEventListener('savingio:workflows-changed', scan);
    window.SavingioAutomation = Object.freeze({
      list:() => clone(read().map(normalize)),
      get:id => clone(read().map(normalize).find(item => item.id === String(id)) || null),
      create:input => save(input),
      update,
      createFromApproval,
      scan,
      reset:() => { localStorage.removeItem(STORAGE_KEY); return []; }
    });
    setTimeout(scan, 350);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();