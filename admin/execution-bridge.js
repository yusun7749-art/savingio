(() => {
  'use strict';

  const STORAGE_KEY = 'savingio-hq-execution-jobs-v1';
  const readJobs = () => {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(value) ? value : [];
    } catch (_) {
      return [];
    }
  };

  const saveJob = job => {
    const jobs = readJobs().filter(item => item.id !== job.id);
    jobs.unshift(job);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs.slice(0, 50)));
    window.dispatchEvent(new CustomEvent('savingio:execution-queue-changed', { detail: { jobs } }));
  };

  async function callBridge(action, job) {
    const response = await fetch('/api/admin/execution', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, job })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) throw new Error(result.error || `HTTP ${response.status}`);
    return result;
  }

  async function syncPreflight(jobId) {
    const job = readJobs().find(item => item.id === jobId);
    if (!job || job.bridgeRunning) return;
    job.bridgeRunning = true;
    job.bridgeStatus = 'checking';
    saveJob(job);

    try {
      const result = await callBridge('preflight', job);
      const fresh = readJobs().find(item => item.id === jobId) || job;
      fresh.bridgeRunning = false;
      fresh.bridgeStatus = result.executable ? 'ready' : 'blocked';
      fresh.bridgeCheckedAt = result.checkedAt;
      fresh.serverChecks = result.checks || [];
      fresh.capabilities = result.capabilities || {};
      fresh.status = result.executable ? 'queued' : 'blocked';
      fresh.error = '';
      saveJob(fresh);
    } catch (error) {
      const fresh = readJobs().find(item => item.id === jobId) || job;
      fresh.bridgeRunning = false;
      fresh.bridgeStatus = 'failed';
      fresh.status = 'failed';
      fresh.error = `서버 실행 브리지 확인 실패: ${error.message}`;
      saveJob(fresh);
    }
  }

  window.addEventListener('savingio:execution-approved', async event => {
    const job = event.detail;
    if (!job?.id) return;
    try {
      const result = await callBridge('queue', job);
      const fresh = readJobs().find(item => item.id === job.id) || job;
      fresh.serverAccepted = Boolean(result.accepted);
      fresh.serverQueuedAt = result.job?.queuedAt || new Date().toISOString();
      fresh.capabilities = result.capabilities || fresh.capabilities;
      fresh.serverMessage = result.message || '';
      saveJob(fresh);
    } catch (error) {
      const fresh = readJobs().find(item => item.id === job.id) || job;
      fresh.serverAccepted = false;
      fresh.serverMessage = `서버 대기열 등록 실패: ${error.message}`;
      saveJob(fresh);
    }
  });

  document.addEventListener('click', event => {
    const button = event.target.closest('[data-queue-preflight],[data-queue-retry]');
    if (!button) return;
    const jobId = button.dataset.queuePreflight || button.dataset.queueRetry;
    window.setTimeout(() => syncPreflight(jobId), 50);
  });

  window.SavingioExecutionBridge = Object.freeze({
    preflight: syncPreflight,
    capabilities: async () => {
      const response = await fetch('/api/admin/execution', { credentials: 'same-origin', cache: 'no-store' });
      return response.json();
    }
  });
})();
