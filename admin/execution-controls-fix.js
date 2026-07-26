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
  const writeJobs = jobs => localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs.slice(0, 30)));
  const wait = ms => new Promise(resolve => window.setTimeout(resolve, ms));

  const saveJob = job => {
    const jobs = readJobs().filter(item => item.id !== job.id);
    jobs.unshift(job);
    writeJobs(jobs);
  };

  async function analyze(dialog, button) {
    if (!dialog || button.dataset.running === 'true') return;
    const job = readJobs().find(item => item.id === dialog.dataset.jobId);
    const state = dialog.querySelector('#hqExecutionState');
    const message = dialog.querySelector('#hqExecutionMessage');
    const approve = dialog.querySelector('#hqExecutionApprove');
    const items = [...dialog.querySelectorAll('#hqExecutionSteps li')];

    if (!job) {
      if (message) message.textContent = '실행 작업 정보를 찾지 못했습니다. 창을 닫고 분석·수정 시작을 다시 눌러주세요.';
      return;
    }

    button.dataset.running = 'true';
    button.disabled = true;
    if (state) state.textContent = '분석 중';
    if (message) message.textContent = '운영 보고서와 대상 범위를 확인하고 수정 계획을 만들고 있습니다.';

    try {
      for (let index = 0; index < Math.min(4, items.length); index += 1) {
        const item = items[index];
        item.classList.remove('done');
        item.classList.add('active');
        const label = item.querySelector('em');
        if (label) label.textContent = '진행 중';
        await wait(300);
        item.classList.remove('active');
        item.classList.add('done');
        if (label) label.textContent = '완료';
      }

      job.status = 'review';
      job.analyzedAt = new Date().toISOString();
      saveJob(job);
      if (state) state.textContent = '수정안 승인 대기';
      if (message) message.textContent = '분석과 수정 계획 준비가 끝났습니다. 아직 운영 파일은 변경하지 않았습니다. 내용을 확인한 뒤 수정안 승인을 눌러주세요.';
      button.textContent = '분석 완료';
      if (approve) approve.disabled = false;
    } catch (error) {
      button.disabled = false;
      if (state) state.textContent = '분석 오류';
      if (message) message.textContent = `분석 중 오류가 발생했습니다: ${error.message}`;
    } finally {
      delete button.dataset.running;
    }
  }

  function approve(dialog, button) {
    if (!dialog) return;
    const job = readJobs().find(item => item.id === dialog.dataset.jobId);
    const state = dialog.querySelector('#hqExecutionState');
    const message = dialog.querySelector('#hqExecutionMessage');
    if (!job) {
      if (message) message.textContent = '승인할 작업 정보를 찾지 못했습니다. 분석부터 다시 실행해주세요.';
      return;
    }
    job.status = 'approved';
    job.approvedAt = new Date().toISOString();
    saveJob(job);
    const items = [...dialog.querySelectorAll('#hqExecutionSteps li')];
    const review = items[Math.min(4, items.length - 1)];
    if (review) {
      review.classList.add('done');
      const label = review.querySelector('em');
      if (label) label.textContent = '승인';
    }
    if (state) state.textContent = '실행 요청 등록';
    if (message) message.textContent = '승인 기록을 저장했습니다. 실제 GitHub 수정·배포 엔진은 아직 연결 전이므로 운영 파일은 변경되지 않았습니다.';
    button.disabled = true;
    button.textContent = '승인 완료';
    window.dispatchEvent(new CustomEvent('savingio:execution-approved', { detail: job }));
  }

  document.addEventListener('click', event => {
    const analyzeButton = event.target.closest('#hqExecutionAnalyze');
    if (analyzeButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      analyze(analyzeButton.closest('#hqExecutionDialog'), analyzeButton);
      return;
    }

    const approveButton = event.target.closest('#hqExecutionApprove');
    if (approveButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!approveButton.disabled) approve(approveButton.closest('#hqExecutionDialog'), approveButton);
    }
  }, true);
})();
