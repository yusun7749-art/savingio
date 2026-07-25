(() => {
  'use strict';

  const STORAGE_KEY = 'savingio-os-retry-records-v1';
  const DEFAULT_MAX_ATTEMPTS = 3;
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

  function write(records, detail={}) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    window.dispatchEvent(new CustomEvent('savingio:retry-records-changed', {
      detail:{ records:clone(records), ...clone(detail) }
    }));
    return records;
  }

  function normalize(input={}) {
    const createdAt = input.createdAt || now();
    return {
      id:String(input.id || uid('RETRY')),
      jobId:String(input.jobId || ''),
      projectId:String(input.projectId || ''),
      targetType:['github','cloudflare','url'].includes(input.targetType) ? input.targetType : 'github',
      targetId:String(input.targetId || ''),
      status:['waiting','running','success','failed','exhausted','cancelled'].includes(input.status) ? input.status : 'waiting',
      reason:String(input.reason || ''),
      attempt:Number(input.attempt || 0),
      maxAttempts:Number(input.maxAttempts || DEFAULT_MAX_ATTEMPTS),
      nextRetryAt:input.nextRetryAt || null,
      createdAt,
      updatedAt:input.updatedAt || createdAt,
      startedAt:input.startedAt || null,
      completedAt:input.completedAt || null,
      error:String(input.error || ''),
      metadata:input.metadata && typeof input.metadata === 'object' ? input.metadata : {}
    };
  }

  function save(input={}) {
    const records = read().map(normalize);
    const item = normalize({ ...input, updatedAt:now() });
    const index = records.findIndex(row => row.id === item.id);
    if (index >= 0) records[index] = item; else records.unshift(item);
    write(records, { action:index >= 0 ? 'updated' : 'created', record:item });
    syncJob(item);
    return clone(item);
  }

  function delayMs(attempt) {
    return Math.min(300000, 15000 * Math.pow(2, Math.max(0, attempt - 1)));
  }

  function findOpen(jobId, targetType, targetId='') {
    return read().map(normalize).find(item => item.jobId === String(jobId) && item.targetType === targetType && item.targetId === String(targetId || '') && ['waiting','running'].includes(item.status));
  }

  function recordFailure(input={}) {
    if (!input.jobId) return null;
    const targetType = ['github','cloudflare','url'].includes(input.targetType) ? input.targetType : 'github';
    const targetId = String(input.targetId || '');
    const existing = findOpen(input.jobId, targetType, targetId);
    if (existing) return clone(existing);
    const prior = read().map(normalize).filter(item => item.jobId === String(input.jobId) && item.targetType === targetType && item.targetId === targetId);
    const attempt = prior.length + 1;
    const maxAttempts = Number(input.maxAttempts || DEFAULT_MAX_ATTEMPTS);
    const exhausted = attempt > maxAttempts;
    return save({
      jobId:input.jobId,
      projectId:input.projectId,
      targetType,
      targetId,
      status:exhausted ? 'exhausted' : 'waiting',
      reason:input.reason || '자동화 작업 실패',
      attempt,
      maxAttempts,
      nextRetryAt:exhausted ? null : new Date(Date.now() + delayMs(attempt)).toISOString(),
      error:input.error || '',
      metadata:input.metadata || {}
    });
  }

  function syncJob(record) {
    const job = window.SavingioAutomation?.get?.(record.jobId);
    if (!job) return;
    window.SavingioAutomation.update(job.id, {
      retryRecordId:record.id,
      retryStatus:record.status,
      retryAttempt:record.attempt,
      retryMaxAttempts:record.maxAttempts,
      nextRetryAt:record.nextRetryAt,
      lastFailureReason:record.reason,
      error:record.status === 'exhausted' ? (record.error || record.reason) : job.error
    });
  }

  async function execute(recordOrId) {
    const record = typeof recordOrId === 'string' ? read().map(normalize).find(item => item.id === recordOrId) : normalize(recordOrId || {});
    if (!record || ['cancelled','exhausted','success'].includes(record.status)) return record ? clone(record) : null;
    const running = save({ ...record, status:'running', startedAt:now(), error:'' });
    try {
      if (running.targetType === 'url') {
        const result = await window.SavingioUrlHealth?.check?.(running.targetId);
        if (!result || result.state !== 'healthy') throw new Error(result?.error || 'URL 재검사 실패');
      } else if (running.targetType === 'cloudflare') {
        const deployment = window.SavingioCloudflareDeploy?.get?.(running.targetId);
        if (!deployment) throw new Error('Cloudflare 배포 기록을 찾을 수 없습니다.');
        window.dispatchEvent(new CustomEvent('savingio:cloudflare-retry-requested', { detail:{ deployment:clone(deployment), retry:clone(running) } }));
      } else {
        const job = window.SavingioAutomation?.get?.(running.jobId);
        if (!job) throw new Error('GitHub 작업을 찾을 수 없습니다.');
        window.SavingioAutomation.update(job.id, { status:'queued', error:'' });
        window.dispatchEvent(new CustomEvent('savingio:github-retry-requested', { detail:{ job:clone(job), retry:clone(running) } }));
      }
      return save({ ...running, status:'success', completedAt:now(), nextRetryAt:null });
    } catch (error) {
      const exhausted = running.attempt >= running.maxAttempts;
      return save({
        ...running,
        status:exhausted ? 'exhausted' : 'failed',
        completedAt:now(),
        nextRetryAt:exhausted ? null : new Date(Date.now() + delayMs(running.attempt + 1)).toISOString(),
        error:String(error?.message || error || '재시도 실패')
      });
    }
  }

  function scan() {
    const due = read().map(normalize).filter(item => item.status === 'waiting' && item.nextRetryAt && Date.parse(item.nextRetryAt) <= Date.now());
    due.forEach(item => execute(item));
    return { due:due.length, records:clone(read().map(normalize)) };
  }

  function captureEvent(event) {
    const detail = event.detail || {};
    if (event.type === 'savingio:url-health-status' && ['unhealthy','blocked'].includes(detail.check?.state)) {
      recordFailure({ jobId:detail.check.jobId, projectId:detail.check.projectId, targetType:'url', targetId:detail.check.id, reason:'실제 URL 검증 실패', error:detail.check.error });
    }
    if (event.type === 'savingio:cloudflare-deployment-status' && detail.deployment?.state === 'failed') {
      recordFailure({ jobId:detail.deployment.jobId, projectId:detail.deployment.projectId, targetType:'cloudflare', targetId:detail.deployment.id, reason:'Cloudflare 배포 실패', error:detail.deployment.error });
    }
    if (event.type === 'savingio:automation-job-status' && detail.job?.githubState === 'failure') {
      recordFailure({ jobId:detail.job.id, projectId:detail.job.projectId, targetType:'github', targetId:detail.job.commitSha, reason:'GitHub 반영 실패', error:detail.job.error });
    }
  }

  function cancel(id) {
    const record = read().map(normalize).find(item => item.id === String(id));
    return record ? save({ ...record, status:'cancelled', completedAt:now(), nextRetryAt:null }) : null;
  }

  function audit() {
    const records = read().map(normalize);
    const errors = [];
    const warnings = [];
    records.forEach(item => {
      if (!item.jobId) errors.push(`RETRY_JOB_MISSING:${item.id}`);
      if (item.attempt < 1) errors.push(`RETRY_ATTEMPT_INVALID:${item.id}`);
      if (item.maxAttempts < 1) errors.push(`RETRY_MAX_INVALID:${item.id}`);
      if (item.status === 'waiting' && !item.nextRetryAt) warnings.push(`RETRY_TIME_MISSING:${item.id}`);
      if (item.attempt > item.maxAttempts && item.status !== 'exhausted') errors.push(`RETRY_EXHAUSTED_MISMATCH:${item.id}`);
    });
    return { valid:errors.length === 0, errors, warnings, total:records.length, records:clone(records) };
  }

  function boot() {
    ['savingio:url-health-status','savingio:cloudflare-deployment-status','savingio:automation-job-status'].forEach(type => window.addEventListener(type, captureEvent));
    window.SavingioRetry = Object.freeze({
      list:() => clone(read().map(normalize)),
      get:id => clone(read().map(normalize).find(item => item.id === String(id)) || null),
      recordFailure,
      execute,
      scan,
      cancel,
      audit,
      reset:() => { localStorage.removeItem(STORAGE_KEY); return []; }
    });
    setInterval(scan, 15000);
    setTimeout(scan, 900);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();