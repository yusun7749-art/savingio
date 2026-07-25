(() => {
  'use strict';

  const STORAGE_KEY = 'savingio-os-github-status-v1';
  const clone = value => JSON.parse(JSON.stringify(value));
  const now = () => new Date().toISOString();

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
    window.dispatchEvent(new CustomEvent('savingio:github-status-changed', { detail:{ items:clone(items), ...clone(detail) } }));
    return items;
  }

  function normalize(input={}) {
    const checkedAt = input.checkedAt || now();
    return {
      jobId:String(input.jobId || ''),
      projectId:String(input.projectId || ''),
      repository:String(input.repository || 'yusun7749-art/savingio'),
      branch:String(input.branch || 'main'),
      commitSha:String(input.commitSha || ''),
      commitUrl:String(input.commitUrl || ''),
      state:['pending','running','success','failure','unknown'].includes(input.state) ? input.state : 'unknown',
      checks:Array.isArray(input.checks) ? input.checks : [],
      source:String(input.source || 'manual-adapter'),
      checkedAt,
      message:String(input.message || '')
    };
  }

  function save(input={}) {
    const item = normalize(input);
    if (!item.jobId) return null;
    const items = read().map(normalize);
    const index = items.findIndex(row => row.jobId === item.jobId);
    if (index >= 0) items[index] = item; else items.unshift(item);
    write(items, { item, action:index >= 0 ? 'updated' : 'created' });
    syncJob(item);
    return clone(item);
  }

  function syncJob(item) {
    const job = window.SavingioAutomation?.get?.(item.jobId);
    if (!job) return;
    const statusMap = { pending:'queued', running:'running', success:'success', failure:'error', unknown:job.status };
    window.SavingioAutomation?.update?.(job.id, {
      status:statusMap[item.state] || job.status,
      commitSha:item.commitSha,
      commitUrl:item.commitUrl,
      githubState:item.state,
      githubChecks:item.checks,
      lastCheckedAt:item.checkedAt,
      error:item.state === 'failure' ? item.message || 'GitHub check failed' : ''
    });
    const project = window.SavingioProject?.get?.(job.projectId);
    if (project) {
      window.SavingioProject.update(project.id, {
        github:{ ...project.github, repository:item.repository, branch:item.branch, commitSha:item.commitSha, commitUrl:item.commitUrl, updatedAt:item.checkedAt }
      });
    }
  }

  function ingest(snapshot={}) {
    return save({ ...snapshot, source:snapshot.source || 'github-provider-adapter', checkedAt:now() });
  }

  function audit() {
    const jobs = window.SavingioAutomation?.list?.() || [];
    const items = read().map(normalize);
    const errors = [];
    const warnings = [];
    jobs.filter(job => job.type === 'github-release').forEach(job => {
      const status = items.find(item => item.jobId === job.id);
      if (!status) warnings.push(`GITHUB_STATUS_MISSING:${job.id}`);
      if (status?.commitSha && status.commitSha.length < 7) errors.push(`GITHUB_SHA_INVALID:${job.id}`);
    });
    return { valid:errors.length === 0, errors, warnings, total:items.length, items:clone(items) };
  }

  function boot() {
    window.SavingioGitHubStatus = Object.freeze({
      list:() => clone(read().map(normalize)),
      get:jobId => clone(read().map(normalize).find(item => item.jobId === String(jobId)) || null),
      ingest,
      audit,
      reset:() => { localStorage.removeItem(STORAGE_KEY); return []; }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();