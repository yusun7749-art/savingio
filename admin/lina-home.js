(() => {
  const $ = selector => document.querySelector(selector);
  const state = { tasks: [], mounted: false };
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[char]));

  function readCounts() {
    const rows = [...document.querySelectorAll('#contentApprovalRows tr[data-path]')];
    const duplicate = rows.filter(row => !row.querySelector('.duplicate-clear')).length;
    const failed = rows.filter(row => (row.textContent || '').includes('미달')).length;
    const approved = rows.filter(row => (row.textContent || '').includes('승인')).length;
    const projects = document.querySelectorAll('#projectList [data-project-id], #projectList .project-card').length;
    return { rows: rows.length, duplicate, failed, approved, projects };
  }

  function defaultTasks(counts) {
    return [
      { id:'duplicate', title:'중복 콘텐츠 검토', note:`현재 중복 의심 ${counts.duplicate || 0}건`, target:'#contentApprovalCenter' },
      { id:'quality', title:'헌법/DNA 미달 글 확인', note:`현재 미달 추정 ${counts.failed || 0}건`, target:'#contentApprovalCenter' },
      { id:'deploy', title:'GitHub·Cloudflare 배포 상태 확인', note:'운영 반영 전 마지막 상태 확인', target:'.workspace-grid' }
    ];
  }

  function savedDone(id) {
    return localStorage.getItem(`savingio-lina-task:${new Date().toISOString().slice(0,10)}:${id}`) === 'done';
  }

  function updateProgress() {
    const done = state.tasks.filter(task => savedDone(task.id)).length;
    const percent = state.tasks.length ? Math.round(done / state.tasks.length * 100) : 0;
    const bar = $('#linaDailyProgressBar');
    const text = $('#linaDailyProgressText');
    if (bar) bar.style.width = `${percent}%`;
    if (text) text.textContent = `${done}/${state.tasks.length} 완료 · ${percent}%`;
    const completed = $('#linaCompletedToday');
    if (completed) completed.textContent = `${done}건`;
  }

  function renderTasks() {
    const box = $('#linaTodayTasks');
    if (!box) return;
    box.innerHTML = state.tasks.map((task, index) => `
      <label class="lina-task">
        <input type="checkbox" data-lina-task="${esc(task.id)}" ${savedDone(task.id) ? 'checked' : ''}>
        <span><strong>${index + 1}. ${esc(task.title)}</strong><small>${esc(task.note)}</small></span>
        <button class="task-open" type="button" data-lina-target="${esc(task.target)}">바로가기</button>
      </label>`).join('');
    box.querySelectorAll('[data-lina-task]').forEach(input => input.addEventListener('change', () => {
      const key = `savingio-lina-task:${new Date().toISOString().slice(0,10)}:${input.dataset.linaTask}`;
      input.checked ? localStorage.setItem(key, 'done') : localStorage.removeItem(key);
      updateProgress();
    }));
    box.querySelectorAll('[data-lina-target]').forEach(button => button.addEventListener('click', event => {
      event.preventDefault();
      document.querySelector(button.dataset.linaTarget)?.scrollIntoView({ behavior:'smooth', block:'start' });
    }));
    updateProgress();
  }

  function greeting() {
    const hour = new Date().getHours();
    if (hour < 11) return '좋은 아침이에요, 선장님.';
    if (hour < 18) return '선장님, 오늘 작업 이어가겠습니다.';
    return '선장님, 오늘 작업을 정리할 시간이에요.';
  }

  function renderDashboard() {
    const counts = readCounts();
    state.tasks = defaultTasks(counts);
    $('#linaGreetingTitle').textContent = greeting();
    $('#linaGreetingText').textContent = counts.duplicate
      ? `오늘은 중복 의심 ${counts.duplicate}건부터 정리하는 것이 가장 효율적입니다.`
      : '오늘은 전체 Doctor 검사로 현재 콘텐츠 상태부터 확인하는 것이 좋습니다.';
    $('#linaBrainDuplicate').textContent = counts.duplicate || 0;
    $('#linaBrainWeak').textContent = counts.failed || 0;
    $('#linaBrainPublished').textContent = counts.rows || 0;
    $('#linaBrainProjects').textContent = counts.projects || 0;
    renderTasks();
  }

  function mount() {
    if (state.mounted || !$('.stats')) return;
    state.mounted = true;
    $('.stats').insertAdjacentHTML('afterend', `
      <section class="lina-home" id="linaHome">
        <div class="lina-welcome">
          <article class="lina-greeting">
            <p class="eyebrow">Lina HQ · 오늘의 운영 브리핑</p>
            <h2 id="linaGreetingTitle">선장님, 리나가 오늘 할 일을 확인하고 있습니다.</h2>
            <p id="linaGreetingText">콘텐츠·중복·배포 상태를 읽는 중입니다.</p>
            <div class="lina-status-row"><span class="lina-status-pill ok">● GitHub 연결</span><span class="lina-status-pill ok">● 신뢰 기기</span><span class="lina-status-pill warn">● Cloudflare 배포 확인 필요</span></div>
          </article>
          <article class="lina-today">
            <h3>📋 오늘 해야 할 일</h3>
            <div id="linaTodayTasks" class="lina-task-list"></div>
            <div class="lina-progress"><div class="lina-progress-head"><span>오늘 진행률</span><strong id="linaDailyProgressText">0/3 완료</strong></div><div class="lina-progress-track"><div id="linaDailyProgressBar" class="lina-progress-bar"></div></div></div>
          </article>
        </div>
        <div class="lina-brain-grid">
          <article class="lina-brain-card" data-lina-scroll="#contentApprovalCenter"><span>⚠ 중복 의심</span><strong id="linaBrainDuplicate">0</strong><small>Duplicate Center 검토 대상</small></article>
          <article class="lina-brain-card" data-lina-scroll="#contentApprovalCenter"><span>🧬 품질 미달</span><strong id="linaBrainWeak">0</strong><small>헌법/DNA 보완 대상</small></article>
          <article class="lina-brain-card" data-lina-scroll="#contentApprovalCenter"><span>📝 확인된 콘텐츠</span><strong id="linaBrainPublished">0</strong><small>Doctor 검사에서 읽은 글</small></article>
          <article class="lina-brain-card" data-lina-scroll=".workspace-grid"><span>🚀 운영 프로젝트</span><strong id="linaBrainProjects">0</strong><small>현재 프로젝트 작업판</small></article>
        </div>
        <div class="lina-bottom-grid">
          <article class="lina-work-card"><h3>😊 리나 빠른 실행</h3><div class="lina-command"><button class="btn primary" id="linaStartToday" type="button">🚀 오늘 작업 시작</button><button class="btn ghost" id="linaOpenChat" type="button">💬 리나에게 물어보기</button><button class="btn ghost" id="linaRunDoctor" type="button">🩺 Doctor 검사</button></div><p id="linaHomeMessage" class="lina-home-message"></p></article>
          <article class="lina-retire-card"><h3>🌙 퇴근 모드</h3><p>오늘 완료한 작업을 정리하고 내일 시작점을 저장합니다.</p><div class="lina-retire-summary"><span>오늘 완료 <strong id="linaCompletedToday">0건</strong></span><span>내일 시작 <strong>중복센터 검토 이어가기</strong></span></div><button class="btn ghost" id="linaRetireBtn" type="button">오늘 작업 마무리</button></article>
        </div>
      </section>`);

    document.querySelectorAll('[data-lina-scroll]').forEach(card => card.addEventListener('click', () => document.querySelector(card.dataset.linaScroll)?.scrollIntoView({ behavior:'smooth', block:'start' })));
    $('#linaStartToday')?.addEventListener('click', () => {
      $('#contentApprovalCenter')?.scrollIntoView({ behavior:'smooth', block:'start' });
      const message = $('#linaHomeMessage');
      message.textContent = '선장님, 오늘은 중복센터와 헌법 미달 글부터 확인하겠습니다.';
      message.className = 'lina-home-message pass';
    });
    $('#linaOpenChat')?.addEventListener('click', () => $('#linaLauncher')?.click());
    $('#linaRunDoctor')?.addEventListener('click', () => $('#runContentAuditBtn')?.click());
    $('#linaRetireBtn')?.addEventListener('click', () => {
      const done = state.tasks.filter(task => savedDone(task.id)).map(task => task.title);
      const summary = { date:new Date().toISOString(), completed:done, next:'Duplicate Center 검토 이어가기' };
      localStorage.setItem('savingio-lina-last-retire', JSON.stringify(summary));
      const message = $('#linaHomeMessage');
      message.textContent = `오늘 ${done.length}건을 완료했습니다. 내일 시작점은 중복센터 검토로 저장했습니다. 편히 쉬세요. 🌙`;
      message.className = 'lina-home-message pass';
    });
    renderDashboard();

    const observer = new MutationObserver(() => { clearTimeout(observer.timer); observer.timer = setTimeout(renderDashboard, 180); });
    const contentRows = $('#contentApprovalRows');
    const projectList = $('#projectList');
    if (contentRows) observer.observe(contentRows, { childList:true, subtree:true });
    if (projectList) observer.observe(projectList, { childList:true, subtree:true });
    document.addEventListener('savingio:content-audit-complete', renderDashboard);
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', mount) : mount();
})();