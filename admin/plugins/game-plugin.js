(() => {
  'use strict';

  const PLUGIN_ID = 'savingio.game';
  const MANIFEST = {
    specVersion:'1.0.0', id:PLUGIN_ID, name:'Savingio 생활 게임', version:'1.0.0',
    description:'생활정보형 미니게임의 정의·실행·점수·최고기록을 관리하는 Plugin', author:'Savingio',
    target:['admin'], entry:'/admin/plugins/game-plugin.js',
    permissions:['menu:register','workboard:register','storage:read','storage:write'],
    dataNamespace:'savingio.game', enabledByDefault:true,
    menu:{ id:'game-plugin-menu', label:'생활 게임 관리', icon:'🎮', order:40, parent:'plugins', route:'game-plugin-board' },
    workboard:{ id:'game-plugin-board', title:'생활 게임 Plugin', department:'product', order:40, renderer:'SavingioGamePlugin.render' }
  };

  const DEFAULT_GAMES = [
    { id:'saving-quiz', title:'절약 퀴즈', category:'quiz', description:'생활 속 절약 상식을 맞히는 퀴즈', rules:{ type:'quiz', timeLimit:60 }, questions:[
      { id:'sq1', text:'대기전력을 줄이는 가장 직접적인 방법은?', options:['절전 멀티탭 사용','창문 열기','냉장고 문 자주 열기'], answer:0, points:10 },
      { id:'sq2', text:'정기결제 점검에 가장 적합한 주기는?', options:['필요할 때만','매월 1회','5년에 1회'], answer:1, points:10 }
    ]},
    { id:'spending-quiz', title:'소비 습관 퀴즈', category:'quiz', description:'충동구매와 비교소비 습관을 점검하는 퀴즈', rules:{ type:'quiz', timeLimit:60 }, questions:[
      { id:'cq1', text:'구매 전 가장 먼저 확인할 것은?', options:['필요 여부','포장 색상','광고 횟수'], answer:0, points:10 },
      { id:'cq2', text:'비교 구매 시 적절한 기준은?', options:['가격만','총비용과 조건','첫 화면 상품'], answer:1, points:10 }
    ]},
    { id:'life-challenge', title:'생활력 챌린지', category:'challenge', description:'생활 습관 미션 완료 수로 점수를 얻는 게임', rules:{ type:'checklist', pointsPerTask:10 }, tasks:['사용하지 않는 구독 1개 확인','오늘 지출 3건 기록','냉장고 재고 1회 확인'] },
    { id:'number-memory', title:'숫자 기억 게임', category:'memory', description:'표시된 숫자 순서를 기억하는 게임', rules:{ type:'sequence', length:6, pointsPerItem:5 } },
    { id:'order-match', title:'순서 맞추기 게임', category:'puzzle', description:'절약 행동의 올바른 순서를 맞추는 게임', rules:{ type:'order', pointsPerItem:5 }, items:['필요 확인','예산 확인','가격 비교','구매 결정'] }
  ];

  const clone = value => JSON.parse(JSON.stringify(value));
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const context = () => window.SavingioPluginSecurity?.createContext(PLUGIN_ID);
  const games = () => context()?.storage.get('games', DEFAULT_GAMES) || clone(DEFAULT_GAMES);
  const scores = () => context()?.storage.get('scores', {}) || {};
  const saveGames = items => { context()?.storage.set('games', clone(items)); return clone(items); };
  const saveScores = items => { context()?.storage.set('scores', clone(items)); return clone(items); };

  function validateGame(input={}) {
    const game = clone(input);
    const errors = [];
    if (!String(game.id || '').trim()) errors.push('GAME_ID_REQUIRED');
    if (!String(game.title || '').trim()) errors.push('GAME_TITLE_REQUIRED');
    if (!String(game.category || '').trim()) errors.push('GAME_CATEGORY_REQUIRED');
    if (!game.rules || typeof game.rules !== 'object') errors.push('GAME_RULES_REQUIRED');
    if (game.rules?.type === 'quiz') {
      if (!Array.isArray(game.questions) || !game.questions.length) errors.push('GAME_QUESTIONS_REQUIRED');
      (game.questions || []).forEach((question, index) => {
        if (!question.id || !question.text || !Array.isArray(question.options) || question.options.length < 2) errors.push(`GAME_QUESTION_INVALID:${index}`);
        if (!Number.isInteger(question.answer) || question.answer < 0 || question.answer >= (question.options || []).length) errors.push(`GAME_ANSWER_INVALID:${question.id || index}`);
      });
    }
    return { valid:errors.length === 0, errors:[...new Set(errors)], game };
  }

  function upsert(input) {
    const report = validateGame(input);
    if (!report.valid) throw Object.assign(new Error(`게임 정의가 올바르지 않습니다: ${report.errors.join(', ')}`), { code:'GAME_INVALID', details:report });
    const items = games().filter(item => item.id !== report.game.id);
    items.push(report.game);
    saveGames(items);
    return clone(report.game);
  }

  function remove(id) { const items=games().filter(item=>item.id!==String(id||'')); saveGames(items); return items; }
  function reset() { saveGames(DEFAULT_GAMES); saveScores({}); return clone(DEFAULT_GAMES); }
  function get(id) { return clone(games().find(item=>item.id===String(id||'')) || null); }

  function evaluate(id, payload={}) {
    const game = get(id);
    if (!game) throw Object.assign(new Error(`게임을 찾을 수 없습니다: ${id}`), { code:'GAME_NOT_FOUND' });
    let score = 0;
    let maximum = 0;
    if (game.rules.type === 'quiz') {
      game.questions.forEach(question => {
        const points = Number(question.points || 10);
        maximum += points;
        if (Number(payload.answers?.[question.id]) === question.answer) score += points;
      });
    } else if (game.rules.type === 'checklist') {
      const completed = new Set(Array.isArray(payload.completed) ? payload.completed : []);
      maximum = game.tasks.length * Number(game.rules.pointsPerTask || 10);
      score = game.tasks.reduce((sum, task, index) => sum + (completed.has(index) || completed.has(task) ? Number(game.rules.pointsPerTask || 10) : 0), 0);
    } else if (game.rules.type === 'sequence') {
      const expected = Array.isArray(payload.expected) ? payload.expected : [];
      const answer = Array.isArray(payload.answer) ? payload.answer : [];
      maximum = expected.length * Number(game.rules.pointsPerItem || 5);
      expected.forEach((value,index) => { if (answer[index] === value) score += Number(game.rules.pointsPerItem || 5); });
    } else if (game.rules.type === 'order') {
      const answer = Array.isArray(payload.answer) ? payload.answer : [];
      maximum = game.items.length * Number(game.rules.pointsPerItem || 5);
      game.items.forEach((value,index) => { if (answer[index] === value) score += Number(game.rules.pointsPerItem || 5); });
    } else throw Object.assign(new Error(`지원하지 않는 게임 유형입니다: ${game.rules.type}`), { code:'GAME_TYPE_UNSUPPORTED' });
    const result = { gameId:game.id, score, maximum, percent:maximum ? Math.round(score / maximum * 100) : 0, playedAt:new Date().toISOString() };
    record(result);
    return result;
  }

  function record(result) {
    const current = scores();
    const list = Array.isArray(current[result.gameId]) ? current[result.gameId] : [];
    list.unshift(clone(result));
    current[result.gameId] = list.slice(0, 100);
    saveScores(current);
    return clone(result);
  }

  function history(id) { return clone(scores()[String(id||'')] || []); }
  function best(id) { return history(id).sort((a,b)=>b.score-a.score || new Date(b.playedAt)-new Date(a.playedAt))[0] || null; }
  function audit() {
    const reports = games().map(validateGame);
    const ids = reports.map(report=>report.game.id);
    const errors = reports.flatMap(report=>report.errors);
    ids.filter((id,index,all)=>id && all.indexOf(id)!==index).forEach(id=>errors.push(`GAME_ID_DUPLICATE:${id}`));
    return { valid:errors.length===0, errors:[...new Set(errors)], games:reports.length, categories:[...new Set(reports.map(report=>report.game.category).filter(Boolean))].length };
  }

  function render(root) {
    const items = games();
    const report = audit();
    root.innerHTML = `<section class="workboard-view"><header class="workboard-head"><div><p class="eyebrow">SAVINGIO PLUGIN</p><h3>생활 게임 관리</h3><p>게임 정의·실행·점수·최고기록을 한곳에서 관리합니다.</p></div><div class="workboard-current"><small>정의 검사</small><strong>${report.valid?'정상':'오류'}</strong><span>${items.length}개 게임 · ${report.categories}개 카테고리</span></div></header><div class="workboard-layout"><main class="workboard-phases"><details open><summary><strong>등록 게임</strong><span>${items.length}</span></summary><ul>${items.map(game=>`<li class="workboard-task done"><span class="workboard-mark">✓</span><span><strong>${esc(game.title)}</strong>${esc(game.description)}</span><em>${esc(game.category)} · BEST ${esc(best(game.id)?.score ?? '-')}</em></li>`).join('')}</ul></details></main><aside class="workboard-side"><section><h4>Plugin 기능</h4><p>등록·수정·삭제·실행·점수 기록·최고기록 조회를 제공합니다.</p></section><section><h4>데이터 격리</h4><p>${esc(MANIFEST.dataNamespace)}</p></section><section><h4>검사 상태</h4><p>${report.valid?'PASS':'FAIL'} · 오류 ${report.errors.length}건</p></section></aside></div></section>`;
    return root;
  }

  function install() {
    if (!window.SavingioPluginManifest || !window.SavingioPluginManager) return false;
    const manifest = window.SavingioPluginManifest.create(MANIFEST);
    const current = window.SavingioPluginManager.get(PLUGIN_ID);
    if (!current) window.SavingioPluginManager.install(manifest, { source:'builtin' });
    else if (current.version !== manifest.version) window.SavingioPluginManager.update(manifest, { source:'builtin' });
    window.SavingioPluginUI?.sync?.();
    return true;
  }

  window.SavingioGamePlugin = Object.freeze({ manifest:MANIFEST, list:games, get, upsert, remove, reset, evaluate, history, best, audit, render, install });
  if (!install()) {
    window.addEventListener('savingio:plugin-manager-ready', install, { once:true });
    setTimeout(install, 350);
  }
})();