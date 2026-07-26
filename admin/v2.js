(() => {
  'use strict';

  const departments = [
    ['command','통합 상황실',['전체 진행률','오늘 작업','승인 필요','오류·중지','수익 요약']],
    ['market','시장분석본부',['주제 분석','인기 제품','영상·쇼츠 분석','댓글 반응','경쟁도','제작 추천']],
    ['content','콘텐츠본부',['신규 글','기존 글 재작성','SEO','이미지','내부 링크','계산기','콘텐츠 QA']],
    ['video','쇼츠·영상본부',['기획','대본','장면 구성','이미지·소재','음성','자막','완성 영상']],
    ['social','SNS 배포본부',['YouTube Shorts','Instagram Reels','Threads','Facebook','Pinterest','예약 발행']],
    ['product','상품·수익본부',['상품 DB','제휴 링크','연결 콘텐츠','클릭','전환','수익·정산']],
    ['approval','승인센터',['글 승인','이미지 승인','영상 승인','상품 승인','발행 승인','반려·수정']],
    ['automation','자동화센터',['워크플로 관리','실행 예정','실행 중','완료','실패','재실행','긴급 중지']],
    ['analytics','데이터·분석본부',['검색 유입','SNS 유입','영상 성과','상품 전환','애드센스','다음 주제']],
    ['system','시스템관리',['분류 관리','API 연결','Publisher LOCK','GitHub','Cloudflare','백업·기록']]
  ];

  // Admin V2 must not display invented sample projects.
  // Real projects will appear only after an actual project data source is connected.
  const projects = [];

  const calculators = [
    ['전기요금 계산기','월 사용량과 요금 구간을 확인합니다.','/calculators/electricity-cost.html'],
    ['월급 실수령액 계산기','연봉 또는 월급 기준 예상 실수령액을 확인합니다.','/calculators/salary-net-pay.html'],
    ['시급·월급 변환기','시급을 월급으로 환산합니다.','/calculators/hourly-to-monthly.html'],
    ['대출 상환 계산기','원리금과 월 상환액을 계산합니다.','/calculators/loan-payment.html'],
    ['퇴직금 계산기','근무기간과 평균임금으로 퇴직금을 확인합니다.','/calculators/severance-pay.html']
  ];

  const nav = document.getElementById('nav');
  const title = document.getElementById('title');
  const workspace = document.getElementById('workspace');
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function renderNav(activeDept='command', activeTask='') {
    nav.innerHTML = departments.map(([id,name,children]) => `
      <section class="group ${id===activeDept?'open':''}">
        <button type="button" class="group-title ${id===activeDept&&!activeTask?'active':''}" data-dept="${id}"><span>${esc(name)}</span><span>⌄</span></button>
        <div class="children">${children.map(child=>`<button type="button" class="child ${id===activeDept&&child===activeTask?'active':''}" data-dept="${id}" data-task="${esc(child)}">${esc(child)}</button>`).join('')}</div>
      </section>`).join('');
  }

  function summary(items=projects) {
    const running=items.filter(x=>x.status==='running').length;
    const approval=items.filter(x=>x.status==='approval').length;
    const error=items.filter(x=>x.status==='error').length;
    const average=items.length?Math.round(items.reduce((a,b)=>a+b.progress,0)/items.length):0;
    return `<div class="summary"><div><span>전체 진행률</span><strong>${average}%</strong></div><div><span>진행 중</span><strong>${running}건</strong></div><div><span>승인 대기</span><strong>${approval}건</strong></div><div><span>오류</span><strong>${error}건</strong></div></div>`;
  }

  function projectTable(items=projects, work='현재 단계') {
    return `<div class="table-wrap"><table><thead><tr><th>프로젝트</th><th>분류</th><th>${esc(work)}</th><th>상태</th><th>진행률</th><th>최근 갱신</th></tr></thead><tbody>${items.map(p=>`<tr><td><strong>${esc(p.title)}</strong><div class="meta">${esc(p.id)}</div></td><td>${esc(p.category)}</td><td>${esc(work)}</td><td><span class="status ${esc(p.status)}">${esc(p.label)}</span></td><td>${p.progress}%</td><td>${esc(p.updated)}</td></tr>`).join('')||'<tr><td colspan="6" class="empty">실제 연결된 프로젝트가 없습니다.</td></tr>'}</tbody></table></div>`;
  }

  function command(task='') {
    let list=projects;
    if(task==='오늘 작업') list=projects.filter(p=>p.status==='running');
    if(task==='승인 필요') list=projects.filter(p=>p.status==='approval');
    if(task==='오류·중지') list=projects.filter(p=>p.status==='error');
    if(task==='수익 요약') return `<section class="section"><h2>수익 요약</h2><p>수익 데이터 연결 상태를 한곳에서 확인합니다.</p></section><div class="table-wrap"><table><thead><tr><th>구분</th><th>연결 상태</th><th>현재 값</th><th>출처</th></tr></thead><tbody><tr><td>AdSense</td><td>연결 대기</td><td>-</td><td>AdSense Center</td></tr><tr><td>제휴 수익</td><td>연결 대기</td><td>-</td><td>상품·수익본부</td></tr><tr><td>콘텐츠 성과</td><td>연결 대기</td><td>-</td><td>프로젝트 파이프라인</td></tr></tbody></table></div>`;
    return `<section class="section"><h2>${esc(task||'통합 상황실')}</h2><p>실제 연결된 운영 프로젝트만 표시합니다.</p></section>${summary(list)}${projectTable(list,task||'현재 단계')}`;
  }

  function calculatorPage() {
    return `<section class="section"><h2>계산기</h2><p>Savingio에 연결된 계산기를 관리하고 실제 페이지를 확인합니다.</p></section><div class="link-list">${calculators.map(([name,desc,url])=>`<div class="link-row"><strong>${esc(name)}</strong><span>${esc(desc)}</span><a href="${url}" target="_blank" rel="noopener">열기</a></div>`).join('')}</div>`;
  }

  function departmentPage(dept,task='') {
    const found=departments.find(d=>d[0]===dept)||departments[0];
    if(dept==='command') return command(task);
    if(dept==='content'&&task==='계산기') return calculatorPage();
    const name=found[1];
    const selected=task||`${name} 전체 업무`;
    return `<section class="section"><h2>${esc(selected)}</h2><p>${esc(name)}의 실제 연결 데이터만 표시합니다.</p></section>${projectTable(projects,selected)}`;
  }

  function route(dept='command',task='',push=true) {
    const found=departments.find(d=>d[0]===dept)||departments[0];
    title.textContent=task||found[1];
    renderNav(found[0],task);
    workspace.innerHTML=departmentPage(found[0],task);
    if(push){
      const url=new URL(location.href);
      url.search='';
      url.hash='';
      url.searchParams.set('dept',found[0]);
      if(task)url.searchParams.set('task',task);
      history.pushState({dept:found[0],task},'',url.pathname+url.search);
    }
  }

  nav.addEventListener('click',event=>{
    const child=event.target.closest('[data-task]');
    const parent=event.target.closest('[data-dept]');
    if(!parent)return;
    route(parent.dataset.dept||'command',child?.dataset.task||'');
  });

  window.addEventListener('popstate',()=>{
    const params=new URLSearchParams(location.search);
    route(params.get('dept')||'command',params.get('task')||'',false);
  });

  document.getElementById('security').onclick=()=>alert('보안센터는 기존 인증 기능과 별도로 연결 예정입니다.');
  document.getElementById('stop').onclick=()=>alert('전체 중지 명령은 자동화센터 연결 후 활성화됩니다.');
  document.getElementById('newProject').onclick=()=>alert('새 프로젝트 등록 화면은 프로젝트 엔진 연결 후 활성화됩니다.');

  const params=new URLSearchParams(location.search);
  route(params.get('dept')||'command',params.get('task')||'',false);
})();