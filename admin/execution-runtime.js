(() => {
  'use strict';

  const STORAGE_KEY = 'savingio-hq-execution-jobs-v1';
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[char]));
  const wait = ms => new Promise(resolve => window.setTimeout(resolve, ms));

  const readJobs = () => {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(value) ? value : [];
    } catch (_) {
      return [];
    }
  };

  const writeJobs = jobs => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs.slice(0, 50)));
    window.dispatchEvent(new CustomEvent('savingio:execution-queue-changed', { detail: { jobs } }));
  };

  const saveJob = job => {
    const jobs = readJobs().filter(item => item.id !== job.id);
    jobs.unshift(job);
    writeJobs(jobs);
    return job;
  };

  const getJob = id => readJobs().find(item => item.id === id) || null;

  function taskFromButton(button) {
    const card = button.closest('.lina-decision-item');
    const title = card?.querySelector('.world-label strong')?.textContent?.replace(/^\d+\.\s*/, '').trim() || '운영 작업';
    const note = card?.querySelector('.world-label small')?.textContent?.trim() || '';
    const id = button.dataset.decisionTarget || button.dataset.decisionDone || title;
    return { id, title, note };
  }

  function planFor(task) {
    const text = `${task.title} ${task.note}`;
    if (/무결성|깨진 참조|리디렉션/.test(text)) return [
      'SITE_INTEGRITY_REPORT 최신 결과 불러오기',
      '깨진 참조와 리디렉션 대상을 유형별로 분류',
      '자동 수정 가능한 항목과 수동 검토 항목 분리',
      '변경 예정 파일 목록과 수정안 생성',
      '선장님 승인 대기',
      '승인 후 GitHub 반영·배포·재검사'
    ];
    if (/사이트맵/.test(text)) return [
      '사이트맵 누락 대상 수집',
      '실제 운영 URL 존재 여부 확인',
      '추가·삭제·리디렉션 후보 분류',
      'sitemap.xml 수정안 생성',
      '선장님 승인 대기',
      '승인 후 반영·배포·재검사'
    ];
    if (/Doctor|헌법|DNA|품질|중복/.test(text)) return [
      '전체 Doctor 검사 실행',
      '미달·중복·보류 항목 분류',
      '대상 글별 수정 설계 생성',
      '비교 화면과 보존 항목 확인',
      '선장님 승인 대기',
      '승인 후 글별 순차 반영·검증'
    ];
    if (/Publisher/.test(text)) return [
      '프로젝트 전체 Publisher ID 검사',
      '공식 ID와 다른 값 탐지',
      '자동 수정 가능 범위 산출',
      '배포 차단 여부 확인',
      '선장님 승인 대기',
      '승인 후 반영·Publisher LOCK 재검사'
    ];
    return [
      '현재 운영 데이터 분석',
      '대상과 영향 범위 확인',
      '수정안 생성',
      '선장님 승인 대기',
      '승인 후 반영·검증'
    ];
  }

  function statusLabel(status) {
    return ({ ready:'분석 대기', analyzing:'분석 중', review:'승인 대기', queued:'실행 대기', preflight:'사전검사 중', blocked:'연결 대기', done:'완료', failed:'실패' })[status] || status;
  }

  function ensureDialog() {
    if ($('#hqExecutionDialog')) return $('#hqExecutionDialog');
    const dialog = document.createElement('dialog');
    dialog.id = 'hqExecutionDialog';
    dialog.className = 'hq-execution-dialog';
    dialog.innerHTML = `
      <section class="hq-execution-shell">
        <header class="hq-execution-head">
          <div><p class="eyebrow">Lina Execution Engine</p><h2 id="hqExecutionTitle">운영 작업 실행</h2><p id="hqExecutionMeta" class="meta"></p></div>
          <button type="button" class="icon-btn" data-execution-close aria-label="닫기">×</button>
        </header>
        <div class="hq-execution-body">
          <div class="hq-execution-state"><span>현재 단계</span><strong id="hqExecutionState">분석 준비</strong></div>
          <ol id="hqExecutionSteps" class="hq-execution-steps"></ol>
          <p id="hqExecutionMessage" class="hq-execution-message">분석과 승인 후 실행 대기열로 연결합니다.</p>
        </div>
        <footer class="hq-execution-actions">
          <button type="button" class="btn ghost" data-execution-close>닫기</button>
          <button type="button" class="btn ghost" id="hqExecutionAnalyze">분석 시작</button>
          <button type="button" class="btn primary" id="hqExecutionApprove" disabled>수정안 승인</button>
        </footer>
      </section>`;
    document.body.appendChild(dialog);
    return dialog;
  }

  function ensureQueuePanel() {
    if ($('#hqExecutionQueue')) return $('#hqExecutionQueue');
    const decision = $('#linaDecisionList')?.closest('.lina-world-card');
    if (!decision) return null;
    const panel = document.createElement('article');
    panel.id = 'hqExecutionQueue';
    panel.className = 'lina-world-card panel hq-execution-queue';
    panel.innerHTML = `
      <div class="lina-card-head">
        <div><p class="eyebrow">Execution Queue</p><h3>승인 작업 실행 대기열</h3></div>
        <span class="map-live" id="hqQueueCount">0건</span>
      </div>
      <div class="hq-queue-summary">
        <span>승인 대기 <strong data-queue-count="review">0</strong></span>
        <span>실행 대기 <strong data-queue-count="queued">0</strong></span>
        <span>연결 대기 <strong data-queue-count="blocked">0</strong></span>
        <span>완료 <strong data-queue-count="done">0</strong></span>
      </div>
      <div id="hqExecutionQueueRows" class="hq-queue-rows"></div>`;
    decision.insertAdjacentElement('afterend', panel);
    return panel;
  }

  function renderQueue() {
    const panel = ensureQueuePanel();
    if (!panel) return;
    const jobs = readJobs();
    const rows = $('#hqExecutionQueueRows');
    $('#hqQueueCount').textContent = `${jobs.length}건`;
    ['review','queued','blocked','done'].forEach(status => {
      const node = panel.querySelector(`[data-queue-count="${status}"]`);
      if (node) node.textContent = jobs.filter(job => job.status === status).length;
    });
    if (!jobs.length) {
      rows.innerHTML = '<p class="hq-queue-empty">승인된 실행 작업이 없습니다.</p>';
      return;
    }
    rows.innerHTML = jobs.slice(0, 12).map(job => `
      <article class="hq-queue-row status-${esc(job.status)}" data-queue-job="${esc(job.id)}">
        <div class="hq-queue-main"><strong>${esc(job.title)}</strong><small>${esc(job.note || '운영 작업')}</small></div>
        <span class="hq-queue-status">${esc(statusLabel(job.status))}</span>
        <div class="hq-queue-actions">
          <button type="button" class="btn ghost small" data-queue-open="${esc(job.id)}">상세</button>
          ${job.status === 'queued' ? `<button type="button" class="btn primary small" data-queue-preflight="${esc(job.id)}">실행 준비 확인</button>` : ''}
          ${job.status === 'blocked' || job.status === 'failed' ? `<button type="button" class="btn ghost small" data-queue-retry="${esc(job.id)}">다시 확인</button>` : ''}
        </div>
      </article>`).join('');
  }

  function openExecution(task) {
    const dialog = ensureDialog();
    const steps = planFor(task);
    const job = saveJob({
      id: `EXEC-${Date.now()}`,
      taskId: task.id,
      title: task.title,
      note: task.note,
      status: 'ready',
      createdAt: new Date().toISOString(),
      steps
    });
    showJob(job);
    dialog.showModal();
  }

  function showJob(job) {
    const dialog = ensureDialog();
    dialog.dataset.jobId = job.id;
    $('#hqExecutionTitle').textContent = job.title;
    $('#hqExecutionMeta').textContent = job.note || '운영 대상 분석과 수정안 생성을 시작합니다.';
    $('#hqExecutionState').textContent = statusLabel(job.status);
    $('#hqExecutionSteps').innerHTML = job.steps.map((step, index) => {
      const doneCount = job.status === 'ready' ? 0 : job.status === 'analyzing' ? Number(job.progress || 0) : job.status === 'review' ? 4 : job.status === 'queued' || job.status === 'preflight' || job.status === 'blocked' || job.status === 'done' ? 5 : 0;
      const done = index < doneCount;
      const approved = index === 4 && ['queued','preflight','blocked','done'].includes(job.status);
      return `<li data-step="${index}" class="${done || approved ? 'done' : ''}"><span>${index + 1}</span><strong>${esc(step)}</strong><em>${approved ? '승인' : done ? '완료' : '대기'}</em></li>`;
    }).join('');
    const analyze = $('#hqExecutionAnalyze');
    const approve = $('#hqExecutionApprove');
    analyze.disabled = job.status !== 'ready';
    analyze.textContent = job.status === 'ready' ? '분석 시작' : '분석 완료';
    approve.disabled = job.status !== 'review';
    approve.textContent = ['queued','preflight','blocked','done'].includes(job.status) ? '승인 완료' : '수정안 승인';
    const messages = {
      ready:'아직 운영 파일은 변경하지 않았습니다. 먼저 분석과 수정안을 만든 뒤 승인 단계로 넘어갑니다.',
      review:'분석과 수정 계획 준비가 끝났습니다. 내용을 확인한 뒤 수정안 승인을 눌러주세요.',
      queued:'승인 기록을 저장하고 실행 대기열에 등록했습니다. 다음으로 실행 준비 확인을 진행합니다.',
      preflight:'GitHub·배포 실행에 필요한 연결 상태를 확인하고 있습니다.',
      blocked:'사전검사는 완료됐지만 실제 GitHub 쓰기·배포 호출은 브라우저에서 직접 실행하지 않습니다. 서버 실행 엔진 연결이 필요합니다.',
      done:'실행과 검증이 완료된 작업입니다.',
      failed:'실행 준비 확인 중 오류가 발생했습니다.'
    };
    $('#hqExecutionMessage').textContent = messages[job.status] || messages.ready;
  }

  async function runAnalysis(button) {
    const dialog = button.closest('#hqExecutionDialog');
    const job = getJob(dialog?.dataset.jobId);
    if (!dialog || !job || button.dataset.running === 'true') return;
    const state = dialog.querySelector('#hqExecutionState');
    const message = dialog.querySelector('#hqExecutionMessage');
    const approve = dialog.querySelector('#hqExecutionApprove');
    const items = [...dialog.querySelectorAll('#hqExecutionSteps li')];
    button.dataset.running = 'true';
    button.disabled = true;
    job.status = 'analyzing';
    saveJob(job);
    state.textContent = '분석 중';
    message.textContent = '운영 보고서와 대상 범위를 확인하고 수정 계획을 만들고 있습니다.';
    try {
      for (let index = 0; index < Math.min(4, items.length); index += 1) {
        const item = items[index];
        const label = item.querySelector('em');
        item.classList.add('active');
        if (label) label.textContent = '진행 중';
        job.progress = index;
        saveJob(job);
        await wait(300);
        item.classList.remove('active');
        item.classList.add('done');
        if (label) label.textContent = '완료';
      }
      job.status = 'review';
      job.progress = 4;
      job.analyzedAt = new Date().toISOString();
      saveJob(job);
      state.textContent = '수정안 승인 대기';
      message.textContent = '분석과 수정 계획 준비가 끝났습니다. 아직 운영 파일은 변경하지 않았습니다.';
      button.textContent = '분석 완료';
      approve.disabled = false;
    } catch (error) {
      job.status = 'failed';
      job.error = error.message;
      saveJob(job);
      state.textContent = '분석 오류';
      message.textContent = `분석 중 오류가 발생했습니다: ${error.message}`;
      button.disabled = false;
    } finally {
      delete button.dataset.running;
      renderQueue();
    }
  }

  function approveJob(button) {
    const dialog = button.closest('#hqExecutionDialog');
    const job = getJob(dialog?.dataset.jobId);
    if (!dialog || !job || job.status !== 'review') return;
    job.status = 'queued';
    job.approvedAt = new Date().toISOString();
    saveJob(job);
    showJob(job);
    renderQueue();
    window.dispatchEvent(new CustomEvent('savingio:execution-approved', { detail: job }));
  }

  async function runPreflight(jobId) {
    const job = getJob(jobId);
    if (!job) return;
    job.status = 'preflight';
    job.preflightStartedAt = new Date().toISOString();
    saveJob(job);
    renderQueue();
    const checks = [];
    try {
      const report = await fetch('/factory/SITE_INTEGRITY_REPORT.json', { cache: 'no-store' });
      checks.push({ name:'SITE_INTEGRITY_REPORT', ok:report.ok, detail:`HTTP ${report.status}` });
      const admin = await fetch('/admin/', { method:'HEAD', cache:'no-store' });
      checks.push({ name:'Admin 운영 URL', ok:admin.ok, detail:`HTTP ${admin.status}` });
      checks.push({ name:'GitHub 쓰기 엔진', ok:false, detail:'서버 실행 API 미연결' });
      checks.push({ name:'Cloudflare 배포 엔진', ok:false, detail:'서버 실행 API 미연결' });
      job.checks = checks;
      job.status = checks.every(check => check.ok) ? 'done' : 'blocked';
      job.preflightCompletedAt = new Date().toISOString();
      saveJob(job);
    } catch (error) {
      job.status = 'failed';
      job.error = error.message;
      saveJob(job);
    }
    renderQueue();
    const updated = getJob(jobId);
    showJob(updated);
    ensureDialog().showModal();
  }

  function relabelDecisionButtons() {
    document.querySelectorAll('[data-decision-target]').forEach(button => {
      button.textContent = '분석·수정 시작';
      button.classList.remove('ghost');
      button.classList.add('primary');
    });
    document.querySelectorAll('[data-decision-done]').forEach(button => {
      button.textContent = '완료 기록';
      button.classList.remove('primary');
      button.classList.add('ghost');
    });
  }

  document.addEventListener('click', event => {
    const close = event.target.closest('[data-execution-close]');
    if (close) {
      event.preventDefault();
      close.closest('#hqExecutionDialog')?.close();
      return;
    }
    const analyze = event.target.closest('#hqExecutionAnalyze');
    if (analyze) {
      event.preventDefault();
      event.stopImmediatePropagation();
      runAnalysis(analyze);
      return;
    }
    const approve = event.target.closest('#hqExecutionApprove');
    if (approve) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!approve.disabled) approveJob(approve);
      return;
    }
    const open = event.target.closest('[data-queue-open]');
    if (open) {
      event.preventDefault();
      const job = getJob(open.dataset.queueOpen);
      if (job) { showJob(job); ensureDialog().showModal(); }
      return;
    }
    const preflight = event.target.closest('[data-queue-preflight],[data-queue-retry]');
    if (preflight) {
      event.preventDefault();
      runPreflight(preflight.dataset.queuePreflight || preflight.dataset.queueRetry);
      return;
    }
    const decision = event.target.closest('[data-decision-target]');
    if (decision) {
      event.preventDefault();
      event.stopImmediatePropagation();
      openExecution(taskFromButton(decision));
    }
  }, true);

  function init() {
    relabelDecisionButtons();
    ensureDialog();
    ensureQueuePanel();
    renderQueue();
    const list = $('#linaDecisionList');
    if (list && !list.dataset.executionObserved) {
      list.dataset.executionObserved = 'true';
      const observer = new MutationObserver(() => {
        clearTimeout(observer.timer);
        observer.timer = setTimeout(() => { relabelDecisionButtons(); ensureQueuePanel(); renderQueue(); }, 80);
      });
      observer.observe(list, { childList:true, subtree:true });
    }
    window.addEventListener('savingio:execution-queue-changed', renderQueue);
    window.SavingioExecutionQueue = Object.freeze({ list:readJobs, get:getJob, render:renderQueue, preflight:runPreflight });
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init, { once:true })
    : init();
})();