(() => {
  'use strict';

  const STORAGE_KEY = 'savingio-os-automation-controller-v1';
  const clone = value => JSON.parse(JSON.stringify(value));
  const now = () => new Date().toISOString();

  function initialState() {
    return {
      paused:false,
      pausedAt:null,
      resumedAt:null,
      reason:'',
      locks:[],
      history:[]
    };
  }

  function read() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return value && typeof value === 'object' ? { ...initialState(), ...value } : initialState();
    } catch {
      return initialState();
    }
  }

  function write(next, detail={}) {
    const state = { ...initialState(), ...next };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent('savingio:automation-controller-changed', {
      detail:{ state:clone(state), ...clone(detail) }
    }));
    return clone(state);
  }

  function appendHistory(state, entry) {
    return {
      ...state,
      history:[{
        at:now(),
        actor:String(entry.actor || 'Savingio Automation'),
        action:String(entry.action || 'unknown'),
        scope:String(entry.scope || 'all'),
        targetId:String(entry.targetId || ''),
        reason:String(entry.reason || '')
      }, ...(Array.isArray(state.history) ? state.history : [])].slice(0, 200)
    };
  }

  function pauseAll(reason='사용자 요청', actor='선장님') {
    const current = read();
    if (current.paused) return clone(current);
    let state = appendHistory(current, { action:'pause-all', scope:'all', reason, actor });
    state = write({ ...state, paused:true, pausedAt:now(), reason:String(reason || '') }, { action:'paused' });
    (window.SavingioAutomation?.list?.() || []).forEach(job => {
      if (['queued','running'].includes(job.status)) {
        window.SavingioAutomation.update(job.id, {
          status:'paused',
          controllerPaused:true,
          controllerPauseReason:reason,
          controllerPausedAt:state.pausedAt
        });
      }
    });
    window.dispatchEvent(new CustomEvent('savingio:automation-paused', { detail:{ state:clone(state) } }));
    return state;
  }

  function resumeAll(actor='선장님') {
    const current = read();
    if (!current.paused) return clone(current);
    let state = appendHistory(current, { action:'resume-all', scope:'all', actor });
    state = write({ ...state, paused:false, resumedAt:now(), reason:'' }, { action:'resumed' });
    (window.SavingioAutomation?.list?.() || []).forEach(job => {
      if (job.status === 'paused' && job.controllerPaused) {
        window.SavingioAutomation.update(job.id, {
          status:'queued',
          controllerPaused:false,
          controllerPauseReason:'',
          controllerResumedAt:state.resumedAt
        });
      }
    });
    window.SavingioRetry?.scan?.();
    window.SavingioNextTask?.scan?.();
    window.dispatchEvent(new CustomEvent('savingio:automation-resumed', { detail:{ state:clone(state) } }));
    return state;
  }

  function lock(scope, targetId='', reason='실행 중복 방지') {
    const current = read();
    const key = `${scope}:${targetId || '*'}`;
    if ((current.locks || []).some(item => item.key === key)) return false;
    const locks = [{ key, scope, targetId:String(targetId || ''), reason, lockedAt:now() }, ...(current.locks || [])];
    write({ ...current, locks }, { action:'locked', key });
    return true;
  }

  function unlock(scope, targetId='') {
    const current = read();
    const key = `${scope}:${targetId || '*'}`;
    const locks = (current.locks || []).filter(item => item.key !== key);
    write({ ...current, locks }, { action:'unlocked', key });
    return locks.length !== (current.locks || []).length;
  }

  function isLocked(scope, targetId='') {
    const key = `${scope}:${targetId || '*'}`;
    const locks = read().locks || [];
    return locks.some(item => item.key === key || item.key === 'all:*');
  }

  function replayJob(jobId, actor='선장님') {
    const state = read();
    if (state.paused || isLocked('job', jobId)) return { ok:false, reason:state.paused ? 'AUTOMATION_PAUSED' : 'JOB_LOCKED' };
    const job = window.SavingioAutomation?.get?.(jobId);
    if (!job) return { ok:false, reason:'JOB_NOT_FOUND' };
    if (!lock('job', job.id, '부분 재실행 중')) return { ok:false, reason:'JOB_LOCKED' };
    try {
      const next = window.SavingioAutomation.update(job.id, {
        status:'queued',
        error:'',
        completedAt:null,
        controllerReplayAt:now(),
        controllerReplayActor:actor
      });
      let updated = appendHistory(read(), { action:'replay-job', scope:'job', targetId:job.id, actor });
      write(updated, { action:'job-replayed', job:next });
      window.dispatchEvent(new CustomEvent('savingio:automation-job-replay-requested', { detail:{ job:clone(next) } }));
      return { ok:true, job:clone(next) };
    } finally {
      unlock('job', job.id);
    }
  }

  function replayProject(projectId, actor='선장님') {
    if (read().paused || isLocked('project', projectId)) return { ok:false, reason:read().paused ? 'AUTOMATION_PAUSED' : 'PROJECT_LOCKED' };
    const jobs = (window.SavingioAutomation?.list?.() || []).filter(job => job.projectId === String(projectId));
    if (!jobs.length) return { ok:false, reason:'PROJECT_JOBS_NOT_FOUND' };
    if (!lock('project', projectId, '프로젝트 재실행 중')) return { ok:false, reason:'PROJECT_LOCKED' };
    try {
      const results = jobs.map(job => replayJob(job.id, actor)).filter(result => result.ok);
      const updated = appendHistory(read(), { action:'replay-project', scope:'project', targetId:projectId, actor });
      write(updated, { action:'project-replayed', projectId, count:results.length });
      return { ok:true, count:results.length, results };
    } finally {
      unlock('project', projectId);
    }
  }

  function replayWorkflow(workflowId, actor='선장님') {
    const jobs = (window.SavingioAutomation?.list?.() || []).filter(job => job.workflowId === String(workflowId));
    if (!jobs.length) return { ok:false, reason:'WORKFLOW_JOBS_NOT_FOUND' };
    const results = jobs.map(job => replayJob(job.id, actor)).filter(result => result.ok);
    const updated = appendHistory(read(), { action:'replay-workflow', scope:'workflow', targetId:workflowId, actor });
    write(updated, { action:'workflow-replayed', workflowId, count:results.length });
    return { ok:true, count:results.length, results };
  }

  function replayFailed(actor='선장님') {
    const jobs = (window.SavingioAutomation?.list?.() || []).filter(job => job.status === 'error' || job.githubState === 'failure' || job.cloudflareState === 'failed' || ['unhealthy','blocked'].includes(job.urlHealthState));
    const results = jobs.map(job => replayJob(job.id, actor)).filter(result => result.ok);
    const updated = appendHistory(read(), { action:'replay-failed', scope:'failed', actor });
    write(updated, { action:'failed-replayed', count:results.length });
    return { ok:true, count:results.length, results };
  }

  function cancelJob(jobId, reason='사용자 취소', actor='선장님') {
    const job = window.SavingioAutomation?.get?.(jobId);
    if (!job) return null;
    const next = window.SavingioAutomation.update(job.id, {
      status:'cancelled',
      error:String(reason || ''),
      controllerCancelledAt:now(),
      controllerCancelledBy:actor
    });
    const updated = appendHistory(read(), { action:'cancel-job', scope:'job', targetId:job.id, reason, actor });
    write(updated, { action:'job-cancelled', job:next });
    window.dispatchEvent(new CustomEvent('savingio:automation-job-cancelled', { detail:{ job:clone(next) } }));
    return clone(next);
  }

  function audit() {
    const state = read();
    const errors = [];
    const warnings = [];
    const duplicateLocks = (state.locks || []).map(item => item.key).filter((key, index, all) => all.indexOf(key) !== index);
    if (duplicateLocks.length) errors.push(...duplicateLocks.map(key => `CONTROLLER_DUPLICATE_LOCK:${key}`));
    if (state.paused && !state.pausedAt) errors.push('CONTROLLER_PAUSED_AT_MISSING');
    if (!Array.isArray(state.history)) errors.push('CONTROLLER_HISTORY_INVALID');
    if ((state.locks || []).length > 50) warnings.push('CONTROLLER_LOCK_COUNT_HIGH');
    return { valid:errors.length === 0, errors, warnings, state:clone(state) };
  }

  function boot() {
    window.SavingioAutomationController = Object.freeze({
      state:() => clone(read()),
      pauseAll,
      resumeAll,
      replayJob,
      replayProject,
      replayWorkflow,
      replayFailed,
      cancelJob,
      lock,
      unlock,
      isLocked,
      audit,
      reset:() => write(initialState(), { action:'reset' })
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();