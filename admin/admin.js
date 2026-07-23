(() => {
  const data = window.SAVINGIO_ADMIN_DATA;
  let projects = JSON.parse(localStorage.getItem('savingio-admin-projects') || 'null') || data.projects;
  let selected = projects[0]?.id;
  let filter = 'all';
  let qrTimer = null;
  let activePairingId = '';

  const $ = selector => document.querySelector(selector);
  const esc = value => String(value).replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));

  function save() {
    localStorage.setItem('savingio-admin-projects', JSON.stringify(projects));
  }

  function renderTree() {
    const nav = $('#treeNav');
    nav.innerHTML = data.departments.map((department, index) => `
      <div class="tree-group ${index === 0 ? 'open' : ''}">
        <button class="tree-title ${index === 0 ? 'active' : ''}" data-dept="${department.id}"><span>${department.name}</span><span>⌄</span></button>
        <div class="tree-children">${department.children.map(child => `<button class="tree-child" data-child="${esc(child)}">${esc(child)}</button>`).join('')}</div>
      </div>`).join('');

    nav.addEventListener('click', event => {
      const title = event.target.closest('.tree-title');
      if (title) {
        document.querySelectorAll('.tree-title').forEach(item => item.classList.remove('active'));
        title.classList.add('active');
        title.parentElement.classList.toggle('open');
        const department = data.departments.find(item => item.id === title.dataset.dept);
        $('#pageTitle').textContent = department.name;
        $('#departmentTitle').textContent = `${department.name} 작업판`;
        return;
      }
      const child = event.target.closest('.tree-child');
      if (child) $('#pageTitle').textContent = child.dataset.child;
    });
  }

  function renderStats() {
    const counts = { running: 0, approval: 0, error: 0, done: 0 };
    projects.forEach(project => { counts[project.status] = (counts[project.status] || 0) + 1; });
    const average = projects.length ? Math.round(projects.reduce((sum, project) => sum + project.progress, 0) / projects.length) : 0;
    const stats = [
      ['전체 진행률', `${average}%`], ['진행 중', `${counts.running}건`], ['승인 대기', `${counts.approval}건`],
      ['오류', `${counts.error}건`], ['완료', `${counts.done}건`], ['등록 프로젝트', `${projects.length}건`]
    ];
    $('#stats').innerHTML = stats.map(item => `<div class="stat"><span>${item[0]}</span><strong>${item[1]}</strong></div>`).join('');
  }

  function visibleProjects() {
    return filter === 'all' ? projects : projects.filter(project => project.status === filter);
  }

  function renderProjects() {
    const list = $('#projectList');
    const items = visibleProjects();
    list.innerHTML = items.length ? items.map(project => `
      <article class="project-card ${project.id === selected ? 'selected' : ''}" data-id="${project.id}">
        <div class="project-top"><div><div class="project-title">${esc(project.title)}</div><div class="meta">${esc(project.id)} · ${esc(project.category)} · ${esc(project.type)}</div></div><span class="status ${project.status}">${esc(project.statusLabel)}</span></div>
        <div class="progress"><i style="width:${project.progress}%"></i></div><div class="meta">진행률 ${project.progress}% · ${esc(project.updated)}</div>
      </article>`).join('') : '<p class="empty">해당 상태의 프로젝트가 없습니다.</p>';
    list.querySelectorAll('.project-card').forEach(element => {
      element.onclick = () => { selected = element.dataset.id; renderProjects(); renderDetail(); };
    });
  }

  function renderDetail() {
    const project = projects.find(item => item.id === selected);
    if (!project) {
      $('#detailPanel').innerHTML = '<p class="empty">프로젝트를 선택해 주세요.</p>';
      return;
    }
    $('#detailPanel').innerHTML = `
      <div class="detail-title"><div><h3>${esc(project.title)}</h3><div class="meta">${esc(project.id)} · ${esc(project.category)}</div></div><span class="status ${project.status}">${esc(project.statusLabel)}</span></div>
      <div class="stage-list">${project.stages.map(([name, state]) => `<div class="stage ${state}"><span class="stage-mark">${state === 'done' ? '✓' : state === 'active' ? '●' : '·'}</span><span>${esc(name)}</span><small class="meta">${state === 'done' ? '완료' : state === 'active' ? '진행 중' : '대기'}</small></div>`).join('')}</div>
      <div class="actions"><button class="btn small ghost" data-action="preview">결과 보기</button><button class="btn small ghost" data-action="retry">다시 실행</button><button class="btn small primary" data-action="approve">최종 승인 및 배포 등록</button><button class="btn small danger" data-action="stop">중지</button></div><p class="meta" id="actionMessage" style="margin-top:12px"></p>`;
    $('#detailPanel').querySelectorAll('[data-action]').forEach(button => { button.onclick = () => handleAction(project, button.dataset.action); });
  }

  function handleAction(project, action) {
    const message = $('#actionMessage');
    if (action === 'approve') {
      project.status = 'running'; project.statusLabel = '배포 등록 중';
      const waiting = project.stages.find(stage => stage[1] === 'wait');
      if (waiting) waiting[1] = 'active';
      project.progress = Math.min(95, project.progress + 8);
      message.textContent = '승인 기록을 저장하고 배포 작업을 생성했습니다. 외부 채널 API 연결 전에는 실제 게시되지 않습니다.';
    } else if (action === 'retry') {
      const active = project.stages.find(stage => stage[1] === 'active');
      if (active) active[1] = 'wait';
      const next = project.stages.find(stage => stage[1] === 'wait');
      if (next) next[1] = 'active';
      project.status = 'running'; project.statusLabel = '재실행 중'; message.textContent = '재실행 상태로 변경했습니다.';
    } else if (action === 'stop') {
      project.status = 'error'; project.statusLabel = '사용자 중지'; message.textContent = '프로젝트를 중지했습니다.';
    } else {
      message.textContent = '미리보기 연결 자리가 준비되었습니다.';
    }
    save(); renderStats(); renderProjects(); setTimeout(renderDetail, 250);
  }

  function renderDepartments() {
    $('#departmentBoard').innerHTML = data.departmentCards.map(card => `<article class="dept-card"><h3>${esc(card.title)}</h3><ul>${card.items.map(item => `<li>${esc(item)}</li>`).join('')}</ul></article>`).join('');
  }

  async function loadSecurityStatus() {
    try {
      const response = await fetch('/api/admin/status', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok || !result.trusted) throw new Error('신뢰 상태를 확인할 수 없습니다.');
      $('#trustedDeviceName').textContent = result.device.name || '현재 신뢰된 기기';
      const registered = result.device.createdAt ? new Date(result.device.createdAt).toLocaleString('ko-KR') : '확인 불가';
      $('#trustedDeviceMeta').textContent = `등록일 ${registered}`;
    } catch (error) {
      $('#trustedDeviceName').textContent = '신뢰 상태 확인 실패';
      $('#trustedDeviceMeta').textContent = error.message;
    }
  }

  function stopQrTimer() {
    if (qrTimer) clearInterval(qrTimer);
    qrTimer = null;
  }

  function clearQrUi(message = '') {
    stopQrTimer();
    $('#qrCode').innerHTML = '';
    $('#pairingLink').removeAttribute('href');
    $('#qrCountdown').textContent = '';
    $('#qrArea').hidden = true;
    if (message) $('#securityMessage').textContent = message;
  }

  async function cancelActivePairing() {
    const pairingId = activePairingId;
    activePairingId = '';
    clearQrUi();
    if (!pairingId) return;
    try {
      await fetch('/api/admin/cancel-pairing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pairingId }),
        keepalive: true
      });
    } catch {}
  }

  async function generatePairingQr() {
    const button = $('#generateQrBtn');
    const message = $('#securityMessage');
    const qrArea = $('#qrArea');
    const qrCode = $('#qrCode');
    button.disabled = true;
    message.textContent = '안전한 일회용 QR을 만들고 있습니다…';
    await cancelActivePairing();
    try {
      const response = await fetch('/api/admin/pairing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestedName: $('#phoneDeviceName').value || '내 휴대폰' })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'QR 생성에 실패했습니다.');
      activePairingId = result.pairingId || '';
      qrCode.innerHTML = '';
      if (typeof window.QRCode !== 'function') throw new Error('QR 생성 모듈을 불러오지 못했습니다. 페이지를 새로고침해 주세요.');
      new window.QRCode(qrCode, { text: result.pairingUrl, width: 220, height: 220, correctLevel: window.QRCode.CorrectLevel.M });
      $('#pairingLink').href = result.pairingUrl;
      qrArea.hidden = false;
      message.textContent = '휴대폰 카메라로 QR을 찍으면 바로 신뢰된 기기로 등록됩니다.';
      let remaining = Number(result.expiresIn || 300);
      const updateCountdown = () => {
        const minutes = String(Math.floor(remaining / 60)).padStart(2, '0');
        const seconds = String(remaining % 60).padStart(2, '0');
        $('#qrCountdown').textContent = `남은 시간 ${minutes}:${seconds}`;
        if (remaining <= 0) {
          cancelActivePairing();
          message.textContent = 'QR이 만료되었습니다. 새 QR을 만들어주세요.';
          return;
        }
        remaining -= 1;
      };
      updateCountdown();
      qrTimer = setInterval(updateCountdown, 1000);
    } catch (error) {
      activePairingId = '';
      clearQrUi(error.message);
    } finally {
      button.disabled = false;
    }
  }

  async function logoutDevice() {
    if (!confirm('이 기기의 신뢰를 해제할까요? 다음 접속부터 관리자 인증이 필요합니다.')) return;
    await fetch('/api/admin/logout', { method: 'POST' });
    location.replace('/admin/');
  }

  function addLinaMessage(text, type = 'bot') {
    const message = document.createElement('div');
    message.className = `lina-msg ${type}`;
    message.textContent = text;
    $('#linaMessages').appendChild(message);
    $('#linaMessages').scrollTop = $('#linaMessages').scrollHeight;
  }

  async function handleLinaPrompt(prompt) {
    addLinaMessage(prompt, 'user');
    if (/휴대폰|QR|연결/.test(prompt)) {
      addLinaMessage('선장님, 보안센터를 열었습니다. 휴대폰 이름을 확인한 뒤 QR 만들기를 눌러주세요.');
      $('#securityDialog').showModal();
      await loadSecurityStatus();
      return;
    }
    addLinaMessage('현재 HQ 기본판에서는 프로젝트 현황과 보안센터를 바로 연결하고 있습니다. AI 업무 실행은 Lina API 연결 상태에 맞춰 확장됩니다.');
  }

  function bind() {
    document.querySelectorAll('.chip').forEach(button => {
      button.onclick = () => {
        document.querySelectorAll('.chip').forEach(item => item.classList.remove('active'));
        button.classList.add('active'); filter = button.dataset.filter; renderProjects();
      };
    });

    const projectDialog = $('#projectDialog');
    $('#newProjectBtn').onclick = () => projectDialog.showModal();
    $('#projectForm').addEventListener('submit', event => {
      const formData = new FormData(event.currentTarget);
      if (event.submitter?.value === 'cancel') return;
      const title = formData.get('title');
      if (!title) return;
      event.preventDefault();
      const id = `P-${new Date().getFullYear()}-${String(projects.length + 1).padStart(3, '0')}`;
      projects.unshift({ id, title, category: formData.get('category'), type: formData.get('type'), status: 'running', statusLabel: '기획 중', progress: 5, updated: '방금 전', stages: [['주제 등록', 'done'], ['시장분석', 'active'], ['콘텐츠 기획', 'wait'], ['제작', 'wait'], ['QA', 'wait'], ['최종 승인', 'wait'], ['자동 배포', 'wait'], ['성과 추적', 'wait']] });
      selected = id; save(); projectDialog.close(); event.currentTarget.reset(); renderStats(); renderProjects(); renderDetail();
    });

    $('#emergencyBtn').onclick = () => {
      if (!confirm('실행 중인 전체 작업을 중지 상태로 바꿀까요?')) return;
      projects = projects.map(project => project.status === 'running' ? { ...project, status: 'error', statusLabel: '전체 중지' } : project);
      save(); renderStats(); renderProjects(); renderDetail();
    };

    const securityDialog = $('#securityDialog');
    $('#securityBtn').onclick = async () => { securityDialog.showModal(); await loadSecurityStatus(); };
    $('#securityClose').onclick = async () => { await cancelActivePairing(); securityDialog.close(); };
    securityDialog.addEventListener('cancel', event => {
      event.preventDefault();
      cancelActivePairing().finally(() => securityDialog.close());
    });
    securityDialog.addEventListener('close', () => { cancelActivePairing(); });
    $('#generateQrBtn').onclick = generatePairingQr;
    $('#logoutDeviceBtn').onclick = logoutDevice;

    $('#linaLauncher').onclick = () => { $('#linaPanel').hidden = false; $('#linaLauncher').hidden = true; };
    $('#linaMinimize').onclick = () => { $('#linaPanel').hidden = true; $('#linaLauncher').hidden = false; };
    document.querySelectorAll('[data-lina-quick]').forEach(button => { button.onclick = () => handleLinaPrompt(button.dataset.linaQuick); });
    $('#linaForm').addEventListener('submit', event => {
      event.preventDefault();
      const input = $('#linaInput');
      const prompt = input.value.trim();
      if (!prompt) return;
      input.value = '';
      handleLinaPrompt(prompt);
    });
  }

  renderTree(); renderStats(); renderProjects(); renderDetail(); renderDepartments(); bind();
})();