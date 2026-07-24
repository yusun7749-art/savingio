(() => {
  'use strict';

  const $ = selector => document.querySelector(selector);
  const state = { tasks: [], mounted: false, integrity: null, integrityLoaded: false, health: 0 };
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[char]));
  const todayKey = () => new Date().toISOString().slice(0, 10);

  function readCounts() {
    const rows = [...document.querySelectorAll('#contentApprovalRows tr[data-path]')];
    const duplicate = rows.filter(row => !row.querySelector('.duplicate-clear')).length;
    const failed = rows.filter(row => (row.textContent || '').includes('미달')).length;
    const approved = rows.filter(row => (row.textContent || '').includes('승인')).length;
    const projects = document.querySelectorAll('#projectList [data-project-id], #projectList .project-card').length;
    return { rows: rows.length, duplicate, failed, approved, projects };
  }

  async function loadIntegrity() {
    try {
      const response = await fetch('/factory/SITE_INTEGRITY_REPORT.json', { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      state.integrity = await response.json();
    } catch (error) {
      state.integrity = { status: 'UNKNOWN', counts: {}, error: error.message };
    } finally {
      state.integrityLoaded = true;
      renderDashboard();
    }
  }

  function integrityCounts() {
    const report = state.integrity || {};
    const counts = report.counts || {};
    return {
      status: report.status || 'UNKNOWN',
      files: Number(report.files_scanned || 0),
      references: Number(report.references_scanned || 0),
      broken: Number(counts.broken_references || 0),
      redirects: Number(counts.broken_redirect_targets || 0),
      sitemap: Number(counts.missing_sitemap_targets || 0),
      publisherDrift: Number(counts.publisher_id_drift || 0)
    };
  }

  function calculateHealth(counts) {
    const integrity = integrityCounts();
    const total = Math.max(counts.rows, 1);
    const references = Math.max(integrity.references, 1);
    const qualityPenalty = Math.min(24, Math.round((counts.failed / total) * 100));
    const duplicatePenalty = Math.min(16, Math.round((counts.duplicate / total) * 80));
    const integrityPenalty = Math.min(35, Math.round(((integrity.broken + integrity.redirects + integrity.sitemap) / references) * 100));
    const publisherPenalty = integrity.publisherDrift > 0 ? 25 : 0;
    const unknownPenalty = integrity.status === 'UNKNOWN' ? 10 : 0;
    return Math.max(0, Math.min(100, 100 - qualityPenalty - duplicatePenalty - integrityPenalty - publisherPenalty - unknownPenalty));
  }

  function priorityTasks(counts) {
    const integrity = integrityCounts();
    const tasks = [];
    if (integrity.publisherDrift > 0) tasks.push({ id:'publisher', score:100, level:'긴급', title:'Publisher LOCK 복구', note:`Publisher ID drift ${integrity.publisherDrift}건 · 배포 전 즉시 차단`, reason:'광고 계정 오류는 전체 수익 구조와 배포 안전성에 직접 영향을 줍니다.', target:'.lina-integrity-card' });
    if (integrity.broken > 0 || integrity.redirects > 0) tasks.push({ id:'integrity', score:95, level:'긴급', title:'사이트 무결성 오류 확인', note:`깨진 참조 ${integrity.broken}건 · 리디렉션 오류 ${integrity.redirects}건`, reason:'깨진 링크와 리디렉션은 사용자 이동과 검색엔진 크롤링을 동시에 막습니다.', target:'.lina-integrity-card' });
    if (integrity.sitemap > 0) tasks.push({ id:'sitemap', score:88, level:'중요', title:'사이트맵 누락 정리', note:`사이트맵 대상 누락 ${integrity.sitemap}건`, reason:'사이트맵 누락 페이지는 검색엔진 발견과 색인 속도에 불리합니다.', target:'.lina-integrity-card' });
    if (counts.failed > 0) tasks.push({ id:'quality', score:82, level:'중요', title:'헌법/DNA 미달 글 확인', note:`현재 미달 추정 ${counts.failed}건`, reason:'품질 미달 콘텐츠는 애드센스 승인과 검색 신뢰도에 영향을 줍니다.', target:'#contentApprovalCenter' });
    if (counts.duplicate > 0) tasks.push({ id:'duplicate', score:76, level:'중요', title:'중복 콘텐츠 검토', note:`현재 중복 의심 ${counts.duplicate}건`, reason:'검색 의도가 겹치는 글은 서로의 노출 가능성을 낮출 수 있습니다.', target:'#contentApprovalCenter' });
    if (!tasks.length) tasks.push({ id:'deploy', score:55, level:'일반', title:'GitHub·Cloudflare 배포 상태 확인', note:'핵심 오류 없음 · 운영 반영 상태 최종 확인', reason:'오류가 없을 때는 배포와 실제 URL 검증이 마지막 안전장치입니다.', target:'.workspace-grid' });
    return tasks.sort((a, b) => b.score - a.score).slice(0, 5);
  }

  function savedDone(id) {
    return localStorage.getItem(`savingio-lina-task:${todayKey()}:${id}`) === 'done';
  }

  function updateProgress() {
    const done = state.tasks.filter(task => savedDone(task.id)).length;
    const percent = state.tasks.length ? Math.round(done / state.tasks.length * 100) : 0;
    if ($('#linaDailyProgressBar')) $('#linaDailyProgressBar').style.width = `${percent}%`;
    if ($('#linaDailyProgressText')) $('#linaDailyProgressText').textContent = `${done}/${state.tasks.length} 완료 · ${percent}%`;
    if ($('#linaCompletedToday')) $('#linaCompletedToday').textContent = `${done}건`;
    if ($('#linaCompletedTodayMirror')) $('#linaCompletedTodayMirror').textContent = `${done}건`;
    if ($('#linaVoyageScore')) $('#linaVoyageScore').textContent = `${Math.max(1, Math.ceil(percent / 20))}/5`;
  }

  function renderTasks() {
    const box = $('#linaTodayTasks');
    if (!box) return;
    box.innerHTML = state.tasks.map((task, index) => `
      <label class="lina-task">
        <input type="checkbox" data-lina-task="${esc(task.id)}" ${savedDone(task.id) ? 'checked' : ''}>
        <span><strong>${index + 1}. [${esc(task.level)} · ${task.score}] ${esc(task.title)}</strong><small>${esc(task.note)}</small><small>판단 이유: ${esc(task.reason)}</small></span>
        <button class="task-open" type="button" data-lina-target="${esc(task.target)}">바로가기</button>
      </label>`).join('');
    box.querySelectorAll('[data-lina-task]').forEach(input => input.addEventListener('change', () => {
      const key = `savingio-lina-task:${todayKey()}:${input.dataset.linaTask}`;
      input.checked ? localStorage.setItem(key, 'done') : localStorage.removeItem(key);
      updateProgress();
      renderJournal();
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

  function percent(value, max, inverse = false) {
    if (!max) return 0;
    const raw = Math.max(0, Math.min(100, Math.round(value / max * 100)));
    return inverse ? 100 - raw : raw;
  }

  function renderWorldMap(counts) {
    const total = Math.max(counts.rows, 1);
    const integrity = integrityCounts();
    const integrityTotal = Math.max(integrity.references, 1);
    const items = [
      ['콘텐츠', percent(counts.rows, Math.max(200, counts.rows)), `${counts.rows}개 확인`],
      ['품질', percent(counts.failed, total, true), `${counts.failed}개 미달`],
      ['중복', percent(counts.duplicate, total, true), `${counts.duplicate}건 의심`],
      ['무결성', percent(integrity.broken + integrity.redirects + integrity.sitemap, integrityTotal, true), `${integrity.broken}건 참조 오류`],
      ['운영 건강도', state.health, `Health ${state.health}/100`]
    ];
    const box = $('#linaWorldMap');
    if (!box) return;
    box.innerHTML = items.map(([name, value, note]) => `<div class="world-row"><div class="world-label"><strong>${name}</strong><span>${note}</span></div><div class="world-track"><div class="world-fill" style="width:${value}%"></div></div><b>${value}%</b></div>`).join('');
  }

  function readJournal() {
    try { return JSON.parse(localStorage.getItem('savingio-lina-voyage-journal') || '[]'); }
    catch (_) { return []; }
  }

  function writeJournal(entry) {
    const journal = readJournal().filter(item => item.date !== entry.date);
    journal.unshift(entry);
    localStorage.setItem('savingio-lina-voyage-journal', JSON.stringify(journal.slice(0, 14)));
  }

  function renderJournal() {
    const box = $('#linaVoyageJournal');
    if (!box) return;
    const done = state.tasks.filter(task => savedDone(task.id)).map(task => task.title);
    const live = { date: todayKey(), completed: done, next: done.length === state.tasks.length ? '내일 새 브리핑 확인' : state.tasks.find(task => !savedDone(task.id))?.title || '다음 작업 확인', live:true };
    const journal = [live, ...readJournal().filter(item => item.date !== live.date)].slice(0, 5);
    box.innerHTML = journal.map(item => `<article class="voyage-entry ${item.live ? 'current' : ''}"><div><strong>${esc(item.date)}</strong><span>${item.live ? '오늘 항해 중' : '항해 기록'}</span></div><ul>${item.completed?.length ? item.completed.map(text => `<li>✅ ${esc(text)}</li>`).join('') : '<li>진행 기록 없음</li>'}</ul><p>다음: ${esc(item.next || '미정')}</p></article>`).join('');
  }

  function renderIntegrityCard() {
    const integrity = integrityCounts();
    const statusClass = integrity.status === 'PASS' ? 'ok' : integrity.status === 'FAIL' ? 'warn' : '';
    const statusText = state.integrityLoaded ? integrity.status : 'LOADING';
    if ($('#linaIntegrityStatus')) $('#linaIntegrityStatus').textContent = statusText;
    if ($('#linaIntegrityStatus')) $('#linaIntegrityStatus').className = statusClass;
    if ($('#linaIntegrityFiles')) $('#linaIntegrityFiles').textContent = integrity.files.toLocaleString();
    if ($('#linaIntegrityBroken')) $('#linaIntegrityBroken').textContent = integrity.broken.toLocaleString();
    if ($('#linaIntegritySitemap')) $('#linaIntegritySitemap').textContent = integrity.sitemap.toLocaleString();
    if ($('#linaPublisherLock')) $('#linaPublisherLock').textContent = integrity.publisherDrift === 0 ? 'PASS' : `DRIFT ${integrity.publisherDrift}`;
    if ($('#linaHealthScore')) $('#linaHealthScore').textContent = `${state.health}/100`;
    if ($('#linaHealthStatus')) $('#linaHealthStatus').textContent = state.health >= 90 ? '안정' : state.health >= 70 ? '주의' : '긴급 개선';
  }

  function renderDashboard() {
    if (!state.mounted) return;
    const counts = readCounts();
    const integrity = integrityCounts();
    state.health = calculateHealth(counts);
    state.tasks = priorityTasks(counts);
    const first = state.tasks[0];
    $('#linaGreetingTitle').textContent = greeting();
    $('#linaGreetingText').textContent = first
      ? `운영 건강도 ${state.health}점입니다. 오늘 최우선 작업은 “${first.title}”이며, 우선순위 ${first.score}점으로 판단했습니다.`
      : '오늘은 전체 Doctor 검사로 현재 콘텐츠 상태부터 확인하는 것이 좋습니다.';
    $('#linaBrainDuplicate').textContent = counts.duplicate || 0;
    $('#linaBrainWeak').textContent = counts.failed || 0;
    $('#linaBrainPublished').textContent = counts.rows || 0;
    $('#linaBrainProjects').textContent = counts.projects || 0;
    if ($('#linaNextDecision')) $('#linaNextDecision').textContent = first ? first.title : 'Doctor 검사';
    renderTasks();
    renderWorldMap(counts);
    renderJournal();
    renderIntegrityCard();
  }

  function mount() {
    if (state.mounted || !$('.stats')) return;
    state.mounted = true;
    $('.stats').insertAdjacentHTML('afterend', `
      <section class="lina-home" id="linaHome">
        <div class="lina-welcome">
          <article class="lina-greeting"><p class="eyebrow">Lina HQ · 실제 운영 브리핑</p><h2 id="linaGreetingTitle">선장님, 리나가 실제 운영 데이터를 확인하고 있습니다.</h2><p id="linaGreetingText">콘텐츠·중복·사이트 무결성 상태를 읽는 중입니다.</p><div class="lina-status-row"><span class="lina-status-pill ok">● GitHub main 연결</span><span class="lina-status-pill ok">● 신뢰 기기</span><span class="lina-status-pill warn">● 배포 후 실제 URL 확인 필요</span></div></article>
          <article class="lina-today"><h3>📋 오늘 해야 할 일</h3><div id="linaTodayTasks" class="lina-task-list"></div><div class="lina-progress"><div class="lina-progress-head"><span>오늘 진행률</span><strong id="linaDailyProgressText">0/3 완료</strong></div><div class="lina-progress-track"><div id="linaDailyProgressBar" class="lina-progress-bar"></div></div></div></article>
        </div>
        <div class="lina-brain-grid">
          <article class="lina-brain-card" data-lina-scroll="#contentApprovalCenter"><span>⚠ 중복 의심</span><strong id="linaBrainDuplicate">0</strong><small>Duplicate Center 검토 대상</small></article>
          <article class="lina-brain-card" data-lina-scroll="#contentApprovalCenter"><span>🧬 품질 미달</span><strong id="linaBrainWeak">0</strong><small>헌법/DNA 보완 대상</small></article>
          <article class="lina-brain-card" data-lina-scroll="#contentApprovalCenter"><span>📝 확인된 콘텐츠</span><strong id="linaBrainPublished">0</strong><small>Doctor 검사에서 읽은 글</small></article>
          <article class="lina-brain-card" data-lina-scroll=".workspace-grid"><span>🚀 운영 프로젝트</span><strong id="linaBrainProjects">0</strong><small>현재 프로젝트 작업판</small></article>
        </div>
        <article class="lina-integrity-card panel"><div class="lina-card-head"><div><p class="eyebrow">Real Operations Data</p><h3>🛡️ 사이트 무결성·Health 보고서</h3></div><strong id="linaIntegrityStatus">LOADING</strong></div><div class="captain-metrics"><span>Health <strong id="linaHealthScore">0/100</strong></span><span>판정 <strong id="linaHealthStatus">계산 중</strong></span><span>검사 파일 <strong id="linaIntegrityFiles">0</strong></span><span>깨진 참조 <strong id="linaIntegrityBroken">0</strong></span><span>사이트맵 누락 <strong id="linaIntegritySitemap">0</strong></span><span>Publisher LOCK <strong id="linaPublisherLock">-</strong></span></div></article>
        <div class="lina-ops-grid"><article class="lina-world-card"><div class="lina-card-head"><div><p class="eyebrow">Savingio World Map</p><h3>🌍 전체 항해 상태</h3></div><span class="map-live">LIVE</span></div><div id="linaWorldMap" class="world-map"></div></article><article class="lina-captain-card"><p class="eyebrow">Captain Room</p><h3>⚓ 선장실</h3><div class="captain-metrics"><span>오늘 완료 <strong id="linaCompletedToday">0건</strong></span><span>항해 점수 <strong id="linaVoyageScore">1/5</strong></span><span>다음 판단 <strong id="linaNextDecision">분석 중</strong></span></div><button class="btn primary" id="linaCaptainStart" type="button">리나 추천 작업 시작</button></article></div>
        <article class="lina-journal-card"><div class="lina-card-head"><div><p class="eyebrow">Voyage Journal</p><h3>🧭 항해 일지</h3></div><button class="btn ghost small" id="linaSaveJournal" type="button">현재 기록 저장</button></div><div id="linaVoyageJournal" class="voyage-journal"></div></article>
        <div class="lina-bottom-grid"><article class="lina-work-card"><h3>😊 리나 빠른 실행</h3><div class="lina-command"><button class="btn primary" id="linaStartToday" type="button">🚀 오늘 작업 시작</button><button class="btn ghost" id="linaOpenChat" type="button">💬 리나에게 물어보기</button><button class="btn ghost" id="linaRunDoctor" type="button">🩺 Doctor 검사</button></div><p id="linaHomeMessage" class="lina-home-message"></p></article><article class="lina-retire-card"><h3>🌙 퇴근 모드</h3><p>오늘 완료한 작업을 정리하고 내일 시작점을 저장합니다.</p><div class="lina-retire-summary"><span>오늘 완료 <strong id="linaCompletedTodayMirror">0건</strong></span><span>내일 시작 <strong>현재 미완료 작업 이어가기</strong></span></div><button class="btn ghost" id="linaRetireBtn" type="button">오늘 작업 마무리</button></article></div>
      </section>`);

    document.querySelectorAll('[data-lina-scroll]').forEach(card => card.addEventListener('click', () => document.querySelector(card.dataset.linaScroll)?.scrollIntoView({ behavior:'smooth', block:'start' })));
    const start = () => {
      const first = state.tasks.find(task => !savedDone(task.id));
      document.querySelector(first?.target || '#contentApprovalCenter')?.scrollIntoView({ behavior:'smooth', block:'start' });
      if ($('#linaHomeMessage')) { $('#linaHomeMessage').textContent = first ? `선장님, ${first.title}부터 시작하겠습니다. 판단 이유: ${first.reason}` : '오늘 필수 작업이 모두 완료되었습니다.'; $('#linaHomeMessage').className = 'lina-home-message pass'; }
    };
    $('#linaStartToday')?.addEventListener('click', start);
    $('#linaCaptainStart')?.addEventListener('click', start);
    $('#linaOpenChat')?.addEventListener('click', () => $('#linaLauncher')?.click());
    $('#linaRunDoctor')?.addEventListener('click', () => $('#runContentAuditBtn')?.click());
    $('#linaSaveJournal')?.addEventListener('click', () => {
      const done = state.tasks.filter(task => savedDone(task.id)).map(task => task.title);
      writeJournal({ date:todayKey(), completed:done, next:state.tasks.find(task => !savedDone(task.id))?.title || '내일 새 브리핑 확인' });
      renderJournal();
    });
    $('#linaRetireBtn')?.addEventListener('click', () => {
      const done = state.tasks.filter(task => savedDone(task.id)).map(task => task.title);
      const next = state.tasks.find(task => !savedDone(task.id))?.title || '내일 새 브리핑 확인';
      localStorage.setItem('savingio-lina-last-retire', JSON.stringify({ date:new Date().toISOString(), completed:done, next, health:state.health }));
      writeJournal({ date:todayKey(), completed:done, next });
      renderJournal();
      if ($('#linaHomeMessage')) { $('#linaHomeMessage').textContent = `오늘 ${done.length}건을 완료했습니다. 현재 Health ${state.health}점이며, 내일 시작점은 ${next}(으)로 저장했습니다.`; $('#linaHomeMessage').className = 'lina-home-message pass'; }
    });

    const observer = new MutationObserver(() => { clearTimeout(observer.timer); observer.timer = setTimeout(renderDashboard, 180); });
    if ($('#contentApprovalRows')) observer.observe($('#contentApprovalRows'), { childList:true, subtree:true });
    if ($('#projectList')) observer.observe($('#projectList'), { childList:true, subtree:true });
    document.addEventListener('savingio:content-audit-complete', renderDashboard);
    renderDashboard();
    loadIntegrity();
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', mount) : mount();
})();