(() => {
  'use strict';

  const STORAGE_KEY = 'savingio-os-url-health-v1';
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
    window.dispatchEvent(new CustomEvent('savingio:url-health-changed', { detail:{ items:clone(items), ...clone(detail) } }));
    return items;
  }

  function normalize(input={}) {
    const createdAt = input.createdAt || now();
    return {
      id:String(input.id || uid('HEALTH')),
      deploymentId:String(input.deploymentId || ''),
      jobId:String(input.jobId || ''),
      projectId:String(input.projectId || ''),
      url:String(input.url || ''),
      expectedStatus:Array.isArray(input.expectedStatus) && input.expectedStatus.length ? input.expectedStatus.map(Number) : [200],
      state:['queued','checking','healthy','unhealthy','blocked','unknown'].includes(input.state) ? input.state : 'unknown',
      httpStatus:Number(input.httpStatus || 0),
      finalUrl:String(input.finalUrl || ''),
      responseTimeMs:Number(input.responseTimeMs || 0),
      contentType:String(input.contentType || ''),
      title:String(input.title || ''),
      checkedAt:input.checkedAt || null,
      createdAt,
      updatedAt:input.updatedAt || createdAt,
      attempts:Number(input.attempts || 0),
      error:String(input.error || ''),
      source:String(input.source || 'url-health-engine'),
      metadata:input.metadata && typeof input.metadata === 'object' ? input.metadata : {}
    };
  }

  function save(input={}) {
    const items = read().map(normalize);
    const candidate = normalize({ ...input, updatedAt:now() });
    const index = items.findIndex(item => item.id === candidate.id || (candidate.deploymentId && item.deploymentId === candidate.deploymentId && item.url === candidate.url));
    const previous = index >= 0 ? items[index] : null;
    const next = normalize({
      ...previous,
      ...candidate,
      id:previous?.id || candidate.id,
      attempts:candidate.state === 'checking' && previous?.state !== 'checking' ? Number(previous?.attempts || 0) + 1 : candidate.attempts
    });
    if (index >= 0) items[index] = next; else items.unshift(next);
    write(items, { action:index >= 0 ? 'updated' : 'created', check:next });
    sync(next);
    return clone(next);
  }

  function createFromDeployment(deployment) {
    if (!deployment?.id || deployment.state !== 'deployed') return null;
    const url = deployment.productionUrl || deployment.deploymentUrl;
    if (!url) return null;
    const duplicate = read().map(normalize).find(item => item.deploymentId === deployment.id && item.url === url);
    if (duplicate) return clone(duplicate);
    return save({
      deploymentId:deployment.id,
      jobId:deployment.jobId,
      projectId:deployment.projectId,
      url,
      expectedStatus:[200],
      state:'queued',
      source:'cloudflare-deployed',
      metadata:{ commitSha:deployment.commitSha, deploymentUrl:deployment.deploymentUrl }
    });
  }

  async function check(idOrInput, options={}) {
    const current = typeof idOrInput === 'string' ? read().map(normalize).find(item => item.id === idOrInput) : normalize(idOrInput || {});
    if (!current?.url) return null;
    const started = performance.now();
    save({ ...current, state:'checking', error:'' });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Number(options.timeoutMs || 12000));
    try {
      let response;
      try {
        response = await fetch(current.url, { method:'HEAD', redirect:'follow', cache:'no-store', signal:controller.signal });
      } catch {
        response = await fetch(current.url, { method:'GET', redirect:'follow', cache:'no-store', signal:controller.signal });
      }
      const elapsed = Math.round(performance.now() - started);
      const expected = current.expectedStatus.includes(response.status);
      return save({
        ...current,
        state:expected ? 'healthy' : 'unhealthy',
        httpStatus:response.status,
        finalUrl:response.url || current.url,
        responseTimeMs:elapsed,
        contentType:response.headers.get('content-type') || '',
        checkedAt:now(),
        error:expected ? '' : `Unexpected HTTP status ${response.status}`,
        source:'browser-fetch'
      });
    } catch (error) {
      const blocked = error?.name === 'TypeError';
      return save({
        ...current,
        state:blocked ? 'blocked' : 'unhealthy',
        responseTimeMs:Math.round(performance.now() - started),
        checkedAt:now(),
        error:String(error?.message || error || 'URL check failed'),
        source:'browser-fetch'
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  function ingest(snapshot={}) {
    return save({ ...snapshot, checkedAt:snapshot.checkedAt || now(), source:snapshot.source || 'external-health-provider' });
  }

  function sync(item) {
    const job = window.SavingioAutomation?.get?.(item.jobId);
    if (job) {
      window.SavingioAutomation.update(job.id, {
        urlHealthCheckId:item.id,
        urlHealthState:item.state,
        verifiedUrl:item.finalUrl || item.url,
        httpStatus:item.httpStatus,
        urlCheckedAt:item.checkedAt,
        status:item.state === 'healthy' ? 'success' : (item.state === 'unhealthy' ? 'error' : job.status),
        error:item.state === 'unhealthy' ? item.error || 'URL health check failed' : job.error
      });
    }
    const project = window.SavingioProject?.get?.(item.projectId);
    if (project) {
      window.SavingioProject.update(project.id, {
        health:{
          checkId:item.id,
          state:item.state,
          url:item.finalUrl || item.url,
          httpStatus:item.httpStatus,
          responseTimeMs:item.responseTimeMs,
          checkedAt:item.checkedAt,
          error:item.error
        }
      });
    }
    window.dispatchEvent(new CustomEvent('savingio:url-health-status', { detail:{ check:clone(item) } }));
  }

  function scanDeployments() {
    const deployments = window.SavingioCloudflareDeploy?.list?.() || [];
    let created = 0;
    deployments.filter(item => item.state === 'deployed').forEach(item => {
      const before = read().length;
      createFromDeployment(item);
      if (read().length > before) created += 1;
    });
    return { created, checks:clone(read().map(normalize)) };
  }

  function audit() {
    const items = read().map(normalize);
    const errors = [];
    const warnings = [];
    items.forEach(item => {
      if (!item.url) errors.push(`URL_MISSING:${item.id}`);
      else {
        try { new URL(item.url); } catch { errors.push(`URL_INVALID:${item.id}`); }
      }
      if (!item.deploymentId) warnings.push(`DEPLOYMENT_LINK_MISSING:${item.id}`);
      if (item.state === 'healthy' && !item.expectedStatus.includes(item.httpStatus)) errors.push(`HEALTH_STATUS_MISMATCH:${item.id}`);
      if (item.state === 'healthy' && !item.checkedAt) errors.push(`HEALTH_TIMESTAMP_MISSING:${item.id}`);
    });
    return { valid:errors.length === 0, errors, warnings, total:items.length, items:clone(items) };
  }

  function boot() {
    window.addEventListener('savingio:cloudflare-deployments-changed', scanDeployments);
    window.SavingioUrlHealth = Object.freeze({
      list:() => clone(read().map(normalize)),
      get:id => clone(read().map(normalize).find(item => item.id === String(id)) || null),
      createFromDeployment,
      check,
      ingest,
      scanDeployments,
      audit,
      reset:() => { localStorage.removeItem(STORAGE_KEY); return []; }
    });
    setTimeout(scanDeployments, 650);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();