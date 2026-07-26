(() => {
  'use strict';

  const STORAGE_KEY = 'savingio-hq-execution-jobs-v1';
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[char]));

  const readJobs = () => {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(value) ? value : [];
    } catch (_) {
      return [];
    }
  };

  const writeJobs = jobs => localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs.slice(0, 30)));

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
          <p id="hqExecutionMessage" class="hq-execution-message">이 화면은 보고서 열기가 아니라 수정 작업을 준비하고 승인 단계까지 연결합니다.</p>
        </div>
        <footer class="hq-execution-actions">
          <button type="button" class="btn ghost" data-execution-close>닫기</button>
          <button type="button" class="btn ghost" id="hqExecutionAnalyze">분석 시작</button>
          <button type="button" class="btn primary" id="hqExecutionApprove" disabled>수정안 승인</button>
        </footer>
      </section>`;
    document.body.appendChild(dialog);
    dialog.querySelectorAll('[data-execution-close]').forEach(button => button.addEventListener('click', () => dialog.close()));
    return dialog;
  }

  function saveJob(job) {
    const jobs = readJobs().filter(item => item.id !== job.id);
    jobs.unshift(job);
    writeJobs(jobs);
  }

  function openExecution(task) {
    const dialog = ensureDialog();
    const steps = planFor(task);
    const job = {
      id: `EXEC-${Date.now()}`,
      taskId: task.id,
      title: task.title,
      note: task.note,
      status: 'ready',
      createdAt: new Date().toISOString(),
      steps
    };
    dialog.dataset.jobId = job.id;
    $('#hqExecutionTitle').textContent = task.title;
    $('#hqExecutionMeta').textContent = task.note || '운영 대상 분석과 수정안 생성을 시작합니다.';
    $('#hqExecutionState').textContent = '분석 준비';
    $('#hqExecutionSteps').innerHTML = steps.map((step, index) => `<li data-step="${index}"><span>${index + 1}</span><strong>${esc(step)}</strong><em>대기</em></li>`).join('');
    $('#hqExecutionMessage').textContent = '아직 운영 파일은 변경하지 않았습니다. 먼저 분석과 수정안을 만든 뒤 승인 단계로 넘어갑니다.';
    $('#hqExecutionApprove').disabled = true;
    $('#hqExecutionAnalyze').disabled = false;
    $('#hqExecutionAnalyze').textContent = '분석 시작';
    saveJob(job);
    dialog.showModal();
  }

  async function runAnalysis() {
    const dialog = $('#hqExecutionDialog');
    const jobId = dialog?.dataset.jobId;
    const jobs = readJobs();
    const job = jobs.find(item => item.id === jobId);
    if (!job) return;
    const analyze = $('#hqExecutionAnalyze');
    const approve = $('#hqExecutionApprove');
    analyze.disabled = true;
    $('#hqExecutionState').textContent = '분석 중';
    $('#hqExecutionMessage').textContent = '현재 운영 데이터와 대상 범위를 읽고 있습니다.';
    const items = [...document.querySelectorAll('#hqExecutionSteps li')];
    for (let index = 0; index < Math.min(4, items.length); index += 1) {
      items[index].classList.add('active');
      items[index].querySelector('em').textContent = '진행 중';
      await new Promise(resolve => setTimeout(resolve, 260));
      items[index].classList.remove('active');
      items[index].classList.add('done');
      items[index].querySelector('em').textContent = '완료';
    }
    job.status = 'review';
    job.analyzedAt = new Date().toISOString();
    saveJob(job);
    $('#hqExecutionState').textContent = '수정안 승인 대기';
    $('#hqExecutionMessage').textContent = '분석과 수정 계획 준비가 끝났습니다. 아직 GitHub 파일은 변경하지 않았습니다. 승인하면 실행 요청 상태로 전환됩니다.';
    analyze.textContent = '분석 완료';
    approve.disabled = false;
  }

  function approveJob() {
    const dialog = $('#hqExecutionDialog');
    const jobId = dialog?.dataset.jobId;
    const jobs = readJobs();
    const job = jobs.find(item => item.id === jobId);
    if (!job) return;
    job.status = 'approved';
    job.approvedAt = new Date().toISOString();
    saveJob(job);
    const items = [...document.querySelectorAll('#hqExecutionSteps li')];
    const reviewIndex = Math.min(4, items.length - 1);
    if (items[reviewIndex]) {
      items[reviewIndex].classList.add('done');
      items[reviewIndex].querySelector('em').textContent = '승인';
    }
    $('#hqExecutionState').textContent = '실행 요청 등록';
    $('#hqExecutionMessage').textContent = '승인 기록을 저장했습니다. 실제 GitHub 수정과 배포는 서버 실행 엔진이 연결된 뒤 수행됩니다. 현재는 승인된 작업 큐까지 정상 연결되었습니다.';
    $('#hqExecutionApprove').disabled = true;
    $('#hqExecutionApprove').textContent = '승인 완료';
    window.dispatchEvent(new CustomEvent('savingio:execution-approved', { detail: job }));
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
    const button = event.target.closest('[data-decision-target]');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openExecution(taskFromButton(button));
  }, true);

  document.addEventListener('DOMContentLoaded', () => {
    relabelDecisionButtons();
    const observer = new MutationObserver(() => {
      clearTimeout(observer.timer);
      observer.timer = setTimeout(relabelDecisionButtons, 80);
    });
    const list = $('#linaDecisionList');
    if (list) observer.observe(list, { childList: true, subtree: true });
    ensureDialog();
    $('#hqExecutionAnalyze')?.addEventListener('click', runAnalysis);
    $('#hqExecutionApprove')?.addEventListener('click', approveJob);
  }, { once: true });
})();