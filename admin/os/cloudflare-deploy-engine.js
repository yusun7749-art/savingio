(() => {
  'use strict';

  const STORAGE_KEY = 'savingio-os-cloudflare-deployments-v1';
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

  function write(items, detail={}) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent('savingio:cloudflare-deployments-changed', {
      detail:{ items:clone(items), ...clone(detail) }
    }));
    return items;
  }

  function normalize(input={}) {
    const createdAt = input.createdAt || now();
    return {
      id:String(input.id || uid('DEPLOY')),
      jobId:String(input.jobId || ''),
      projectId:String(input.projectId || ''),
      workflowId:String(input.workflowId || ''),
      repository:String(input.repository || 'yusun7749-art/savingio'),
      branch:String(input.branch || 'main'),
      commitSha:String(input.commitSha || ''),
      providerId:String(input.providerId || ''),
      projectName:String(input.projectName || 'savingio'),
      environment:String(input.environment || 'production'),
      state:['queued','deploying','deployed','failed','cancelled','unknown'].includes(input.state) ? input.state : 'unknown',
      deploymentUrl:String(input.deploymentUrl || ''),
      productionUrl:String(input.productionUrl || 'https://savingio.com'),
      source:String(input.source || 'cloudflare-provider-adapter'),
      attempts:Number(input.attempts || 0),
      createdAt,
      updatedAt:input.updatedAt || createdAt,
      startedAt:input.startedAt || null,
      completedAt:input.completedAt || null,
      checkedAt:input.checkedAt || null,
      error:String(input.error || ''),
      metadata:input.metadata && typeof input.metadata === 'object' ? input.metadata : {}
    };
  }

  function save(input={}) {
    const currentItems = read().map(normalize);
    const candidate = normalize({ ...input, updatedAt:now() });
    const index = currentItems.findIndex(item => item.id === candidate.id || (candidate.providerId && item.providerId === candidate.providerId));
    const previous = index >= 0 ? currentItems[index] : null;
    const next = normalize({
      ...previous,
      ...candidate,
      id:previous?.id || candidate.id,
      attempts:candidate.state === 'deploying' && previous?.state !== 'deploying' ? Number(previous?.attempts || 0) + 1 : candidate.attempts,
      startedAt:candidate.state === 'deploying' ? (previous?.startedAt || now()) : candidate.startedAt,
      completedAt:['deployed','failed','cancelled'].includes(candidate.state) ? now() : candidate.completedAt,
      checkedAt:candidate.checkedAt || now()
    });
    if (index >= 0) currentItems[index] = next; else currentItems.unshift(next);
    write(currentItems, { action:index >= 0 ? 'updated' : 'created', deployment:next });
    sync(next);
    return clone(next);
  }

  function createFromGitHub(job, githubStatus) {
    if (!job?.id || githubStatus?.state !== 'success') return null;
    const duplicate = read().map(normalize).find(item => item.jobId === job.id && item.commitSha === githubStatus.commitSha);
    if (duplicate) return clone(duplicate);
    return save({
      jobId:job.id,
      projectId:job.projectId,
      workflowId:job.workflowId,
      repository:job.repository,
      branch:job.branch,
      commitSha:githubStatus.commitSha,
      projectName:job.payload?.cloudflareProject || 'savingio',
      environment:'production',
      state:'queued',
      productionUrl:job.payload?.productionUrl || 'https://savingio.com',
      source:'github-success'
    });
  }

  function sync(deployment) {
    const job = window.SavingioAutomation?.get?.(deployment.jobId);
    if (job) {
      window.SavingioAutomation.update(job.id, {
        cloudflareDeploymentId:deployment.id,
        cloudflareState:deployment.state,
        deploymentUrl:deployment.deploymentUrl,
        productionUrl:deployment.productionUrl,
        deploymentCheckedAt:deployment.checkedAt,
        status:deployment.state === 'failed' ? 'error' : job.status,
        error:deployment.state === 'failed' ? deployment.error || 'Cloudflare deployment failed' : job.error
      });
    }
    const project = window.SavingioProject?.get?.(deployment.projectId);
    if (project) {
      window.SavingioProject.update(project.id, {
        deployment:{
          provider:'cloudflare-pages',
          deploymentId:deployment.id,
          providerId:deployment.providerId,
          projectName:deployment.projectName,
          environment:deployment.environment,
          state:deployment.state,
          deploymentUrl:deployment.deploymentUrl,
          productionUrl:deployment.productionUrl,
          commitSha:deployment.commitSha,
          updatedAt:deployment.checkedAt || deployment.updatedAt
        }
      });
    }
    window.dispatchEvent(new CustomEvent('savingio:cloudflare-deployment-status', { detail:{ deployment:clone(deployment) } }));
  }

  function ingest(snapshot={}) {
    return save({ ...snapshot, source:snapshot.source || 'cloudflare-provider-adapter', checkedAt:now() });
  }

  function scanGitHubStatuses() {
    const statuses = window.SavingioGitHubStatus?.list?.() || [];
    const jobs = window.SavingioAutomation?.list?.() || [];
    let created = 0;
    statuses.filter(item => item.state === 'success').forEach(status => {
      const job = jobs.find(row => row.id === status.jobId);
      const before = read().length;
      createFromGitHub(job, status);
      if (read().length > before) created += 1;
    });
    return { created, deployments:clone(read().map(normalize)) };
  }

  function audit() {
    const items = read().map(normalize);
    const errors = [];
    const warnings = [];
    items.forEach(item => {
      if (!item.jobId) errors.push(`CLOUDFLARE_JOB_MISSING:${item.id}`);
      if (!item.projectId) errors.push(`CLOUDFLARE_PROJECT_MISSING:${item.id}`);
      if (item.state === 'deployed' && !item.deploymentUrl && !item.productionUrl) warnings.push(`CLOUDFLARE_URL_MISSING:${item.id}`);
      if (item.commitSha && item.commitSha.length < 7) errors.push(`CLOUDFLARE_SHA_INVALID:${item.id}`);
    });
    return { valid:errors.length === 0, errors, warnings, total:items.length, items:clone(items) };
  }

  function boot() {
    window.addEventListener('savingio:github-status-changed', scanGitHubStatuses);
    window.SavingioCloudflareDeploy = Object.freeze({
      list:() => clone(read().map(normalize)),
      get:id => clone(read().map(normalize).find(item => item.id === String(id)) || null),
      createFromGitHub,
      ingest,
      scanGitHubStatuses,
      audit,
      reset:() => { localStorage.removeItem(STORAGE_KEY); return []; }
    });
    setTimeout(scanGitHubStatuses, 500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();