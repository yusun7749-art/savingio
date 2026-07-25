(() => {
  'use strict';

  const STORAGE_KEY = 'savingio-os-automation-qa-v1';
  const clone = value => JSON.parse(JSON.stringify(value));
  const now = () => new Date().toISOString();

  const MODULES = [
    ['automation','SavingioAutomation'],
    ['github-status','SavingioGitHubStatus'],
    ['cloudflare-deploy','SavingioCloudflareDeploy'],
    ['url-health','SavingioUrlHealth'],
    ['retry','SavingioRetry'],
    ['next-task','SavingioNextTask'],
    ['controller','SavingioAutomationController']
  ];

  const STORAGE_KEYS = [
    'savingio-os-automation-jobs-v1',
    'savingio-os-github-status-v1',
    'savingio-os-cloudflare-deployments-v1',
    'savingio-os-url-health-v1',
    'savingio-os-retry-records-v1',
    'savingio-os-next-tasks-v1',
    'savingio-os-automation-controller-v1'
  ];

  function readHistory() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function saveReport(report) {
    const history = [report, ...readHistory().filter(item => item.id !== report.id)].slice(0, 50);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    window.dispatchEvent(new CustomEvent('savingio:automation-qa-completed', { detail:{ report:clone(report) } }));
    return clone(report);
  }

  function issue(level, code, message, module='automation') {
    return { level, code, message, module };
  }

  function moduleChecks() {
    const results = [];
    MODULES.forEach(([id, globalName]) => {
      const api = window[globalName];
      if (!api) {
        results.push(issue('error', `MODULE_MISSING:${globalName}`, `${globalName} 모듈이 로드되지 않았습니다.`, id));
        return;
      }
      results.push(issue('pass', `MODULE_READY:${globalName}`, `${globalName} 모듈이 로드되었습니다.`, id));
      if (typeof api.list !== 'function' && id !== 'controller') {
        results.push(issue('warning', `MODULE_LIST_MISSING:${globalName}`, `${globalName}.list()가 없습니다.`, id));
      }
      if (id === 'controller' && typeof api.state !== 'function') {
        results.push(issue('error', 'CONTROLLER_STATE_MISSING', 'Automation Controller state()가 없습니다.', id));
      }
    });
    return results;
  }

  function storageChecks() {
    const results = [];
    STORAGE_KEYS.forEach(key => {
      const raw = localStorage.getItem(key);
      if (raw === null) {
        results.push(issue('warning', `STORAGE_EMPTY:${key}`, `${key} 저장소가 아직 생성되지 않았습니다.`, 'storage'));
        return;
      }
      try {
        JSON.parse(raw);
        results.push(issue('pass', `STORAGE_VALID:${key}`, `${key} JSON 형식이 정상입니다.`, 'storage'));
      } catch {
        results.push(issue('error', `STORAGE_INVALID:${key}`, `${key} JSON 형식이 손상되었습니다.`, 'storage'));
      }
    });
    return results;
  }

  function auditChecks() {
    const results = [];
    const targets = [
      ['retry','SavingioRetry'],
      ['next-task','SavingioNextTask'],
      ['controller','SavingioAutomationController']
    ];
    targets.forEach(([id, globalName]) => {
      const api = window[globalName];
      if (!api) return;
      if (typeof api.audit !== 'function') {
        results.push(issue('warning', `AUDIT_MISSING:${globalName}`, `${globalName}.audit()가 없습니다.`, id));
        return;
      }
      try {
        const audit = api.audit();
        (audit.errors || []).forEach(code => results.push(issue('error', code, `${globalName} 감사 오류`, id)));
        (audit.warnings || []).forEach(code => results.push(issue('warning', code, `${globalName} 감사 경고`, id)));
        if (audit.valid && !(audit.errors || []).length) {
          results.push(issue('pass', `AUDIT_PASS:${globalName}`, `${globalName} 감사가 통과했습니다.`, id));
        }
      } catch (error) {
        results.push(issue('error', `AUDIT_EXCEPTION:${globalName}`, String(error?.message || error), id));
      }
    });
    return results;
  }

  function crossReferenceChecks() {
    const results = [];
    const jobs = window.SavingioAutomation?.list?.() || [];
    const retries = window.SavingioRetry?.list?.() || [];
    const nextTasks = window.SavingioNextTask?.list?.() || [];
    const jobIds = new Set(jobs.map(item => item.id));

    const duplicateJobIds = jobs.map(item => item.id).filter((id, index, all) => all.indexOf(id) !== index);
    duplicateJobIds.forEach(id => results.push(issue('error', `DUPLICATE_JOB_ID:${id}`, `중복 Automation Job ID가 있습니다: ${id}`, 'automation')));

    retries.forEach(record => {
      if (record.jobId && !jobIds.has(record.jobId)) {
        results.push(issue('warning', `ORPHAN_RETRY:${record.id}`, `연결 Job이 없는 Retry Record입니다: ${record.id}`, 'retry'));
      }
    });

    nextTasks.forEach(task => {
      if (task.parentJobId && !jobIds.has(task.parentJobId)) {
        results.push(issue('warning', `ORPHAN_NEXT_TASK:${task.id}`, `연결 Job이 없는 Next Task입니다: ${task.id}`, 'next-task'));
      }
    });

    jobs.forEach(job => {
      if (!job.projectId) results.push(issue('warning', `JOB_PROJECT_MISSING:${job.id}`, `Project 연결이 없는 Job입니다: ${job.id}`, 'automation'));
      if (job.status === 'success' && !job.completedAt) results.push(issue('error', `JOB_COMPLETED_AT_MISSING:${job.id}`, `성공 Job의 완료 시각이 없습니다: ${job.id}`, 'automation'));
      if (job.status === 'running' && !job.startedAt) results.push(issue('warning', `JOB_STARTED_AT_MISSING:${job.id}`, `실행 중 Job의 시작 시각이 없습니다: ${job.id}`, 'automation'));
    });

    if (!duplicateJobIds.length) results.push(issue('pass', 'JOB_IDS_UNIQUE', 'Automation Job ID 중복이 없습니다.', 'automation'));
    return results;
  }

  function controllerChecks() {
    const results = [];
    const controller = window.SavingioAutomationController;
    if (!controller?.state) return results;
    try {
      const state = controller.state();
      if (typeof state.paused !== 'boolean') results.push(issue('error', 'CONTROLLER_PAUSED_INVALID', 'Controller paused 값이 boolean이 아닙니다.', 'controller'));
      if (!Array.isArray(state.locks)) results.push(issue('error', 'CONTROLLER_LOCKS_INVALID', 'Controller locks가 배열이 아닙니다.', 'controller'));
      if (!Array.isArray(state.history)) results.push(issue('error', 'CONTROLLER_HISTORY_INVALID', 'Controller history가 배열이 아닙니다.', 'controller'));
      if (!results.some(item => item.level === 'error')) results.push(issue('pass', 'CONTROLLER_STATE_VALID', 'Controller 상태 형식이 정상입니다.', 'controller'));
    } catch (error) {
      results.push(issue('error', 'CONTROLLER_STATE_EXCEPTION', String(error?.message || error), 'controller'));
    }
    return results;
  }

  function summarize(checks) {
    const counts = checks.reduce((acc, item) => {
      acc[item.level] = (acc[item.level] || 0) + 1;
      return acc;
    }, { pass:0, warning:0, error:0 });
    const status = counts.error ? 'FAIL' : counts.warning ? 'WARN' : 'PASS';
    return { status, counts };
  }

  function run(options={}) {
    const startedAt = now();
    const checks = [
      ...moduleChecks(),
      ...storageChecks(),
      ...auditChecks(),
      ...crossReferenceChecks(),
      ...controllerChecks()
    ];
    const summary = summarize(checks);
    const report = {
      id:`AQA-${Date.now().toString(36).toUpperCase()}`,
      status:summary.status,
      counts:summary.counts,
      startedAt,
      completedAt:now(),
      trigger:String(options.trigger || 'manual'),
      checks
    };
    saveReport(report);
    return clone(report);
  }

  function latest() {
    return clone(readHistory()[0] || null);
  }

  function boot() {
    window.SavingioAutomationQA = Object.freeze({
      run,
      latest,
      history:() => clone(readHistory()),
      clear:() => { localStorage.removeItem(STORAGE_KEY); return []; }
    });
    window.dispatchEvent(new CustomEvent('savingio:automation-qa-ready'));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();