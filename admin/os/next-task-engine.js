(() => {
  'use strict';

  const STORAGE_KEY = 'savingio-os-next-tasks-v1';
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

  function write(tasks, detail={}) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    window.dispatchEvent(new CustomEvent('savingio:next-tasks-changed', {
      detail:{ tasks:clone(tasks), ...clone(detail) }
    }));
    return tasks;
  }

  function normalize(input={}) {
    const createdAt = input.createdAt || now();
    return {
      id:String(input.id || uid('NEXT')),
      sourceType:['url-health','retry','workflow','manual'].includes(input.sourceType) ? input.sourceType : 'manual',
      sourceId:String(input.sourceId || ''),
      projectId:String(input.projectId || ''),
      workflowId:String(input.workflowId || ''),
      parentJobId:String(input.parentJobId || ''),
      type:String(input.type || 'follow-up'),
      title:String(input.title || '다음 작업'),
      description:String(input.description || ''),
      priority:['low','normal','high','urgent'].includes(input.priority) ? input.priority : 'normal',
      status:['queued','ready','running','done','blocked','cancelled'].includes(input.status) ? input.status : 'queued',
      assignee:String(input.assignee || 'Savingio Automation'),
      dueAt:input.dueAt || null,
      createdAt,
      updatedAt:input.updatedAt || createdAt,
      completedAt:input.completedAt || null,
      metadata:input.metadata && typeof input.metadata === 'object' ? input.metadata : {}
    };
  }

  function save(input={}) {
    const tasks = read().map(normalize);
    const candidate = normalize({ ...input, updatedAt:now() });
    const index = tasks.findIndex(item => item.id === candidate.id || (
      candidate.sourceType && candidate.sourceId &&
      item.sourceType === candidate.sourceType &&
      item.sourceId === candidate.sourceId &&
      item.type === candidate.type
    ));
    const previous = index >= 0 ? tasks[index] : null;
    const next = normalize({ ...previous, ...candidate, id:previous?.id || candidate.id });
    if (index >= 0) tasks[index] = next; else tasks.unshift(next);
    write(tasks, { action:index >= 0 ? 'updated' : 'created', task:next });
    sync(next);
    return clone(next);
  }

  function fromHealthyCheck(check) {
    if (!check?.id || check.state !== 'healthy') return null;
    return save({
      sourceType:'url-health',
      sourceId:check.id,
      projectId:check.projectId,
      parentJobId:check.jobId,
      type:'performance-tracking',
      title:'배포 후 성과 추적 시작',
      description:`검증 완료 URL의 유입·검색·수익 지표 추적을 시작합니다: ${check.finalUrl || check.url}`,
      priority:'normal',
      status:'ready',
      dueAt:new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      metadata:{
        url:check.finalUrl || check.url,
        httpStatus:check.httpStatus,
        responseTimeMs:check.responseTimeMs,
        checkedAt:check.checkedAt
      }
    });
  }

  function fromExhaustedRetry(record) {
    if (!record?.id || record.status !== 'exhausted') return null;
    return save({
      sourceType:'retry',
      sourceId:record.id,
      projectId:record.projectId,
      parentJobId:record.jobId,
      type:'manual-recovery',
      title:'자동 재시도 소진 — 수동 복구 필요',
      description:record.error || record.reason || '자동 재시도 횟수를 모두 사용했습니다.',
      priority:'urgent',
      status:'blocked',
      metadata:{
        targetType:record.targetType,
        targetId:record.targetId,
        attempt:record.attempt,
        maxAttempts:record.maxAttempts
      }
    });
  }

  function sync(task) {
    const project = window.SavingioProject?.get?.(task.projectId);
    if (project) {
      const existing = Array.isArray(project.nextTasks) ? project.nextTasks : [];
      const nextTasks = [task, ...existing.filter(item => item.id !== task.id)].slice(0, 50);
      window.SavingioProject.update(project.id, {
        nextTasks,
        metadata:{ ...project.metadata, latestNextTaskId:task.id, nextTaskUpdatedAt:task.updatedAt }
      });
    }
    const job = window.SavingioAutomation?.get?.(task.parentJobId);
    if (job) {
      window.SavingioAutomation.update(job.id, {
        nextTaskId:task.id,
        nextTaskStatus:task.status,
        nextTaskType:task.type
      });
    }
    if (task.workflowId) {
      window.SavingioWorkflow?.log?.(task.workflowId, {
        type:'next-task-created',
        level:task.priority === 'urgent' ? 'error' : 'info',
        title:task.title,
        message:task.description,
        actor:'Savingio Automation',
        moduleId:'automation',
        targetId:task.id
      });
    }
    window.dispatchEvent(new CustomEvent('savingio:next-task-status', { detail:{ task:clone(task) } }));
  }

  function capture(event) {
    const detail = event.detail || {};
    if (event.type === 'savingio:url-health-status') fromHealthyCheck(detail.check);
    if (event.type === 'savingio:retry-records-changed' && detail.record?.status === 'exhausted') fromExhaustedRetry(detail.record);
  }

  function scan() {
    let created = 0;
    const before = read().length;
    (window.SavingioUrlHealth?.list?.() || []).filter(item => item.state === 'healthy').forEach(fromHealthyCheck);
    (window.SavingioRetry?.list?.() || []).filter(item => item.status === 'exhausted').forEach(fromExhaustedRetry);
    created = Math.max(0, read().length - before);
    return { created, tasks:clone(read().map(normalize)) };
  }

  function update(id, patch={}) {
    const current = read().map(normalize).find(item => item.id === String(id));
    if (!current) return null;
    return save({
      ...current,
      ...patch,
      id:current.id,
      completedAt:patch.status === 'done' ? now() : (patch.completedAt ?? current.completedAt)
    });
  }

  function audit() {
    const tasks = read().map(normalize);
    const errors = [];
    const warnings = [];
    tasks.forEach(item => {
      if (!item.sourceId) warnings.push(`NEXT_SOURCE_MISSING:${item.id}`);
      if (!item.projectId) warnings.push(`NEXT_PROJECT_MISSING:${item.id}`);
      if (!item.title) errors.push(`NEXT_TITLE_MISSING:${item.id}`);
      if (item.status === 'done' && !item.completedAt) errors.push(`NEXT_COMPLETED_AT_MISSING:${item.id}`);
      if (item.sourceType === 'retry' && item.type !== 'manual-recovery') warnings.push(`NEXT_RETRY_TYPE_UNEXPECTED:${item.id}`);
    });
    return { valid:errors.length === 0, errors, warnings, total:tasks.length, tasks:clone(tasks) };
  }

  function boot() {
    window.addEventListener('savingio:url-health-status', capture);
    window.addEventListener('savingio:retry-records-changed', capture);
    window.SavingioNextTask = Object.freeze({
      list:() => clone(read().map(normalize)),
      get:id => clone(read().map(normalize).find(item => item.id === String(id)) || null),
      create:save,
      update,
      fromHealthyCheck,
      fromExhaustedRetry,
      scan,
      audit,
      reset:() => { localStorage.removeItem(STORAGE_KEY); return []; }
    });
    setTimeout(scan, 1100);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();