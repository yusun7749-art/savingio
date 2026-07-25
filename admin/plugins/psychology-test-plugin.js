(() => {
  'use strict';

  const PLUGIN_ID = 'savingio.psychology-test';
  const MANIFEST = {
    specVersion:'1.0.0', id:PLUGIN_ID, name:'Savingio 생활 성향 테스트', version:'1.0.0',
    description:'생활 성향 테스트의 문항·보기·점수·결과 유형을 관리하는 Plugin', author:'Savingio',
    target:['admin'], entry:'/admin/plugins/psychology-test-plugin.js',
    permissions:['menu:register','workboard:register','storage:read','storage:write'],
    dataNamespace:'savingio.psychology-test', enabledByDefault:true,
    menu:{ id:'psychology-test-plugin-menu', label:'생활 성향 테스트', icon:'🧭', order:30, parent:'plugins', route:'psychology-test-plugin-board' },
    workboard:{ id:'psychology-test-plugin-board', title:'생활 성향 테스트 Plugin', department:'product', order:30, renderer:'SavingioPsychologyTestPlugin.render' }
  };

  const DEFAULT_TESTS = [{
    id:'saving-dna',
    title:'Savingio 절약 DNA 테스트',
    description:'일상에서 돈을 쓰고 아끼는 방식을 네 가지 생활 성향으로 확인합니다.',
    questions:[
      { id:'q1', text:'예상하지 못한 할인 쿠폰이 생기면 어떻게 하나요?', options:[
        { id:'q1a', text:'필요한 물건인지 먼저 확인한다', scores:{ planner:2, analyst:1 } },
        { id:'q1b', text:'할인율이 큰 상품부터 비교한다', scores:{ analyst:2, explorer:1 } },
        { id:'q1c', text:'가족이나 친구와 함께 쓸 방법을 찾는다', scores:{ sharer:2, planner:1 } },
        { id:'q1d', text:'새로운 상품을 경험해 본다', scores:{ explorer:2, sharer:1 } }
      ]},
      { id:'q2', text:'한 달 생활비가 예상보다 많이 남았다면?', options:[
        { id:'q2a', text:'다음 달 예산으로 넘긴다', scores:{ planner:2 } },
        { id:'q2b', text:'어디에서 절약됐는지 기록을 분석한다', scores:{ analyst:2 } },
        { id:'q2c', text:'가족과 작은 보상을 나눈다', scores:{ sharer:2 } },
        { id:'q2d', text:'새로운 절약 방법을 시험한다', scores:{ explorer:2 } }
      ]},
      { id:'q3', text:'큰 지출을 결정할 때 가장 먼저 하는 일은?', options:[
        { id:'q3a', text:'구매 시기와 예산을 계획한다', scores:{ planner:2, analyst:1 } },
        { id:'q3b', text:'가격과 조건을 표로 비교한다', scores:{ analyst:2, planner:1 } },
        { id:'q3c', text:'주변 사람들의 경험을 묻는다', scores:{ sharer:2, explorer:1 } },
        { id:'q3d', text:'여러 대안을 직접 찾아본다', scores:{ explorer:2, analyst:1 } }
      ]}
    ],
    results:[
      { id:'planner', title:'차근차근 설계형', description:'목표와 예산을 먼저 세우고 꾸준히 지키는 성향입니다.', advice:'자동이체와 월간 예산표를 함께 활용하면 강점이 더 커집니다.' },
      { id:'analyst', title:'꼼꼼 비교형', description:'가격과 조건을 비교해 가장 합리적인 답을 찾는 성향입니다.', advice:'비교 시간을 정해두면 정보 탐색 피로를 줄일 수 있습니다.' },
      { id:'sharer', title:'함께 절약형', description:'가족과 경험을 나누며 생활비를 조정하는 성향입니다.', advice:'가족 공동 목표와 보상 기준을 미리 합의해 보세요.' },
      { id:'explorer', title:'새 방법 탐험형', description:'새로운 서비스와 절약법을 빠르게 시험하는 성향입니다.', advice:'시험 예산과 중단 기준을 정하면 시행착오 비용을 줄일 수 있습니다.' }
    ]
  }];

  const clone = value => JSON.parse(JSON.stringify(value));
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const context = () => window.SavingioPluginSecurity?.createContext(PLUGIN_ID);
  const tests = () => context()?.storage.get('tests', DEFAULT_TESTS) || clone(DEFAULT_TESTS);
  const save = items => { context()?.storage.set('tests', clone(items)); return clone(items); };

  function normalizeTest(input={}) {
    return {
      id:String(input.id || '').trim(), title:String(input.title || '').trim(), description:String(input.description || '').trim(),
      questions:(Array.isArray(input.questions) ? input.questions : []).map(question => ({
        id:String(question.id || '').trim(), text:String(question.text || '').trim(),
        options:(Array.isArray(question.options) ? question.options : []).map(option => ({
          id:String(option.id || '').trim(), text:String(option.text || '').trim(), scores:{ ...(option.scores || {}) }
        }))
      })),
      results:(Array.isArray(input.results) ? input.results : []).map(result => ({
        id:String(result.id || '').trim(), title:String(result.title || '').trim(), description:String(result.description || '').trim(), advice:String(result.advice || '').trim()
      }))
    };
  }

  function validateTest(input) {
    const test = normalizeTest(input);
    const errors = [];
    if (!test.id) errors.push('TEST_ID_REQUIRED');
    if (!test.title) errors.push('TEST_TITLE_REQUIRED');
    if (!test.questions.length) errors.push('TEST_QUESTIONS_REQUIRED');
    if (!test.results.length) errors.push('TEST_RESULTS_REQUIRED');
    const resultIds = new Set(test.results.map(result => result.id).filter(Boolean));
    test.questions.forEach((question, index) => {
      if (!question.id || !question.text) errors.push(`QUESTION_INVALID:${index}`);
      if (question.options.length < 2) errors.push(`QUESTION_OPTIONS_INSUFFICIENT:${question.id || index}`);
      question.options.forEach(option => {
        if (!option.id || !option.text) errors.push(`OPTION_INVALID:${question.id}`);
        Object.keys(option.scores).forEach(key => { if (!resultIds.has(key)) errors.push(`SCORE_RESULT_UNKNOWN:${key}`); });
      });
    });
    return { valid:errors.length === 0, errors:[...new Set(errors)], test };
  }

  function upsert(input) {
    const report = validateTest(input);
    if (!report.valid) throw Object.assign(new Error(`테스트 정의가 올바르지 않습니다: ${report.errors.join(', ')}`), { code:'PSYCHOLOGY_TEST_INVALID', details:report });
    const items = tests().filter(item => item.id !== report.test.id);
    items.push(report.test);
    save(items);
    return clone(report.test);
  }

  function remove(id) { const items=tests().filter(item=>item.id!==String(id||'')); save(items); return items; }
  function reset() { save(DEFAULT_TESTS); return clone(DEFAULT_TESTS); }
  function get(id) { return clone(tests().find(item => item.id === String(id || '')) || null); }

  function score(testId, answers={}) {
    const test = get(testId);
    if (!test) throw Object.assign(new Error(`테스트를 찾을 수 없습니다: ${testId}`), { code:'PSYCHOLOGY_TEST_NOT_FOUND' });
    const totals = Object.fromEntries(test.results.map(result => [result.id, 0]));
    const unanswered = [];
    test.questions.forEach(question => {
      const option = question.options.find(item => item.id === answers[question.id]);
      if (!option) { unanswered.push(question.id); return; }
      Object.entries(option.scores || {}).forEach(([resultId, points]) => { totals[resultId] = (totals[resultId] || 0) + Number(points || 0); });
    });
    if (unanswered.length) throw Object.assign(new Error('모든 문항에 답해야 합니다.'), { code:'PSYCHOLOGY_TEST_INCOMPLETE', details:{ unanswered } });
    const ranked = test.results.map(result => ({ ...result, score:totals[result.id] || 0 })).sort((a,b) => b.score-a.score || a.id.localeCompare(b.id));
    return { testId:test.id, totalQuestions:test.questions.length, scores:totals, primary:ranked[0], ranking:ranked };
  }

  function audit() {
    const reports = tests().map(validateTest);
    const ids = reports.map(report => report.test.id);
    const errors = reports.flatMap(report => report.errors);
    ids.filter((id,index,all) => id && all.indexOf(id)!==index).forEach(id => errors.push(`TEST_ID_DUPLICATE:${id}`));
    return { valid:errors.length===0, errors:[...new Set(errors)], tests:reports.length, questions:reports.reduce((sum,report)=>sum+report.test.questions.length,0) };
  }

  function render(root) {
    const items = tests();
    const report = audit();
    root.innerHTML = `<section class="workboard-view"><header class="workboard-head"><div><p class="eyebrow">SAVINGIO PLUGIN</p><h3>생활 성향 테스트</h3><p>문항·보기·점수·결과 유형을 한곳에서 관리합니다.</p></div><div class="workboard-current"><small>정의 검사</small><strong>${report.valid?'정상':'오류'}</strong><span>${items.length}개 테스트 · ${report.questions}개 문항</span></div></header><div class="workboard-layout"><main class="workboard-phases">${items.map(test=>`<details open><summary><strong>${esc(test.title)}</strong><span>${test.questions.length}문항</span></summary><ul>${test.results.map(result=>`<li class="workboard-task done"><span class="workboard-mark">✓</span><span><strong>${esc(result.title)}</strong>${esc(result.description)}</span><em>${esc(result.id)}</em></li>`).join('')}</ul></details>`).join('')}</main><aside class="workboard-side"><section><h4>Plugin 기능</h4><p>테스트 등록·수정·삭제·채점·정의 검사를 제공합니다.</p></section><section><h4>데이터 격리</h4><p>${esc(MANIFEST.dataNamespace)}</p></section><section><h4>검사 상태</h4><p>${report.valid?'PASS':'FAIL'} · 오류 ${report.errors.length}건</p></section></aside></div></section>`;
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

  window.SavingioPsychologyTestPlugin = Object.freeze({ manifest:MANIFEST, list:tests, get, upsert, remove, reset, score, audit, render, install });
  if (!install()) {
    window.addEventListener('savingio:plugin-manager-ready', install, { once:true });
    setTimeout(install, 300);
  }
})();