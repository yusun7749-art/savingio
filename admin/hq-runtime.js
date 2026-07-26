(() => {
  'use strict';

  const ready = callback => document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', callback, { once: true })
    : callback();

  ready(() => {
    if (window.__savingioHqRuntimeLoaded) return;
    window.__savingioHqRuntimeLoaded = true;

    const panel = document.getElementById('linaPanel');
    const form = document.getElementById('linaForm');
    const input = document.getElementById('linaInput');
    const messages = document.getElementById('linaMessages');
    const tree = document.getElementById('treeNav');
    const pageTitle = document.getElementById('pageTitle');

    if (panel) {
      panel.hidden = false;
      panel.setAttribute('data-hq-state', 'online');
    }

    const append = (text, role = 'bot') => {
      if (!messages || !text) return;
      const item = document.createElement('div');
      item.className = `lina-msg ${role}`;
      item.textContent = text;
      messages.appendChild(item);
      messages.scrollTop = messages.scrollHeight;
    };

    const cleanLabel = value => String(value || '')
      .replace(/[⌂◫▤▶↗₩✓⚙▥•◇]/g, '')
      .replace(/[▼▾⌄∨˅]+/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const currentContext = () => {
      const active = tree?.querySelector('.tree-child.active,[aria-current="page"],.tree-title.active');
      return cleanLabel(active?.textContent) || cleanLabel(pageTitle?.textContent) || '통합 상황실';
    };

    const findHealthValue = () => {
      const explicit = document.querySelector('[data-health-score],[data-operating-health],#operatingHealth,.operating-health,#linaHealthScore');
      const explicitNumber = Number(String(explicit?.textContent || explicit?.dataset?.healthScore || '').match(/\b(100|[1-9]?\d)\b/)?.[1]);
      if (Number.isFinite(explicitNumber) && explicitNumber >= 0 && explicitNumber <= 100) return `${explicitNumber}점`;
      return '측정 중';
    };

    const readDashboard = () => {
      const rows = document.querySelectorAll('#contentApprovalRows tr[data-path]');
      let failed = 0;
      rows.forEach(row => {
        if (/미달|❌|B|C|D/.test(row.textContent || '')) failed += 1;
      });
      return { articleRows: rows.length, failed, healthText: findHealthValue() };
    };

    const statusReply = command => {
      const context = currentContext();
      const projectCount = document.querySelectorAll('#projectList [data-project-id],#projectList .project-card').length;
      const { articleRows, failed } = readDashboard();
      const normalized = String(command || '').replace(/\s+/g, ' ').trim();

      if (/^(안녕|리나안녕|리나 안녕|하이|hello)/i.test(normalized)) return '안녕하세요, 선장님. 오늘은 업무 얘기만 하지 않아도 됩니다. 그냥 이야기하셔도 되고, 필요할 때 제가 Savingio 상황을 같이 보겠습니다.';
      if (/ㅋㅋ|ㅎㅎ|웃겨|업무 아니|그냥 말|대화하자/.test(normalized)) return '알고 있습니다. 모든 말을 업무 요청으로 바꾸지 않겠습니다. 지금은 그냥 이야기하셔도 됩니다. 😊';
      if (/힘들|지쳤|피곤|짜증|답답/.test(normalized)) return '오늘 정말 많이 붙잡고 계셨습니다. 지금은 새 기능을 늘리기보다, 고장 난 버튼과 실행 흐름부터 하나씩 안정시키는 게 맞습니다. 제가 순서를 놓치지 않겠습니다.';
      if (/이전 대답|아까 말|기억/.test(normalized)) return '네, 방금 대화 흐름을 이어서 보고 있습니다. 선장님은 리나가 명령어 봇이 아니라, 평소에는 대화하고 필요할 때 실제 운영을 도와주는 비서이길 원하셨습니다.';
      if (/그거 말고|말뜻|못 알아|한정|반복|무슨.*요청/.test(normalized)) return '맞습니다. 문장을 업무 요청으로 바꿔 되풀이하지 않겠습니다. 먼저 선장님이 그냥 대화하는지, 실제 실행을 원하는지 구분해서 답하겠습니다.';
      if (/글.*(써|작성|만들)|콘텐츠.*(써|작성|만들)/.test(normalized)) return '글 작업으로 이해했습니다. 제목이나 대상 URL을 말씀해 주시면 작업 요청으로 정리하겠습니다. 다만 실제 GitHub 수정은 승인 가능한 실행 흐름이 연결된 뒤 진행됩니다.';
      if (/살아|응답|리나/.test(normalized)) return `네, 여기 있습니다. 현재 화면은 ${context}입니다.`;
      if (/오늘 상황|상황|현황/.test(normalized)) return `현재 ${context} 화면입니다. 프로젝트 ${projectCount}건, Doctor 표시 글 ${articleRows}건, 확인 필요 항목 ${failed}건입니다.`;
      if (/오늘 할 일|할 일|다음/.test(normalized)) {
        if (!articleRows) return '우선 전체 Doctor 검사를 실행해 콘텐츠 상태를 불러온 뒤, 미달 글 → 중복 → 승인 → 배포 순서로 정리하겠습니다.';
        if (failed) return `헌법/DNA 미달로 보이는 ${failed}건부터 확인한 뒤 승인과 배포 상태를 점검하겠습니다.`;
        return '현재 큰 미달 표시는 없습니다. GitHub 반영, Cloudflare 배포, 실제 URL 검증 순서로 확인하겠습니다.';
      }
      if (/오류/.test(normalized)) return failed ? `현재 화면에서 확인이 필요한 항목이 ${failed}건 보입니다.` : '현재 화면에서 즉시 집계되는 콘텐츠 오류는 없습니다. 사이트 무결성과 Doctor 결과를 함께 확인해야 합니다.';
      if (/휴대폰|보안|QR/.test(normalized)) {
        document.getElementById('securityBtn')?.click();
        return '보안센터를 열었습니다.';
      }
      if (/프로젝트/.test(normalized) && /새|생성|추가/.test(normalized)) {
        document.getElementById('newProjectBtn')?.click();
        return '새 프로젝트 창을 열었습니다.';
      }
      if (/닥터|doctor|검사/i.test(normalized)) {
        document.getElementById('runContentAuditBtn')?.click();
        return '전체 Doctor 검사를 실행했습니다.';
      }
      return '네, 듣고 있습니다. 이 말이 그냥 대화인지, Savingio에서 실제로 처리할 일인지 제가 먼저 단정하지 않겠습니다. 이어서 말씀해 주세요.';
    };

    const iconFor = label => {
      const text = cleanLabel(label);
      if (/통합|상황실/.test(text)) return '⌂';
      if (/시장|분석/.test(text)) return '◫';
      if (/콘텐츠/.test(text)) return '▤';
      if (/쇼츠|영상/.test(text)) return '▶';
      if (/SNS|배포/.test(text)) return '↗';
      if (/상품|수익/.test(text)) return '₩';
      if (/승인/.test(text)) return '✓';
      if (/자동화|설정|시스템/.test(text)) return '⚙';
      if (/데이터/.test(text)) return '▥';
      if (/글|재작성|SEO|이미지|링크|계산기|QA/.test(text)) return '•';
      return '◇';
    };

    const decorateExplorer = () => {
      if (!tree) return;
      tree.querySelectorAll('.tree-title,.tree-child').forEach(item => {
        if (item.querySelector(':scope > .hq-tree-icon')) return;
        const icon = document.createElement('span');
        icon.className = 'hq-tree-icon';
        icon.setAttribute('aria-hidden', 'true');
        icon.textContent = iconFor(item.textContent || '');
        item.prepend(icon);
      });
    };

    const buildBriefing = () => {
      if (!panel || panel.querySelector('.hq-briefing')) return;
      const brief = document.createElement('section');
      brief.className = 'hq-briefing';
      brief.innerHTML = `
        <div class="hq-briefing-head"><strong>운영 브리핑</strong><span class="hq-online">ONLINE</span></div>
        <div class="hq-health"><span>운영 Health</span><b data-hq-health>측정 중</b></div>
        <div class="hq-brief-grid">
          <div><span>현재 위치</span><strong data-hq-context>통합 상황실</strong></div>
          <div><span>확인 필요</span><strong data-hq-failed>0건</strong></div>
          <div><span>Doctor 표시</span><strong data-hq-rows>0건</strong></div>
          <div><span>배포 상태</span><strong>대기</strong></div>
        </div>`;
      panel.querySelector('.lina-head')?.insertAdjacentElement('afterend', brief);
    };

    const buildLog = () => {
      if (document.getElementById('hqLog')) return;
      const log = document.createElement('div');
      log.id = 'hqLog';
      log.innerHTML = '<strong>HQ LOG</strong><span data-hq-log-text>Explorer 준비 · Lina Assistant ONLINE · Admin V2 보호</span>';
      document.body.appendChild(log);
    };

    const loadExecutionRuntime = () => {
      if (document.querySelector('script[data-hq-execution-runtime]')) return;
      const script = document.createElement('script');
      script.src = '/admin/execution-runtime.js';
      script.defer = true;
      script.dataset.hqExecutionRuntime = 'true';
      document.head.appendChild(script);
    };

    const refreshBriefing = () => {
      const { articleRows, failed, healthText } = readDashboard();
      const context = currentContext();
      const setText = (selector, value) => {
        const node = panel?.querySelector(selector);
        if (node && node.textContent !== value) node.textContent = value;
      };
      setText('[data-hq-health]', healthText);
      setText('[data-hq-context]', context);
      setText('[data-hq-failed]', `${failed}건`);
      setText('[data-hq-rows]', `${articleRows}건`);
      const logText = document.querySelector('[data-hq-log-text]');
      if (logText) logText.textContent = `${context} · Explorer ACTIVE · Lina Assistant ONLINE · Admin V2 보호`;
    };

    const sendChat = text => {
      const prompt = String(text || '').trim();
      if (!prompt) return;
      append(prompt, 'user');
      if (input) input.value = '';
      window.setTimeout(() => append(statusReply(prompt), 'bot'), 80);
    };

    if (form && input && messages && !form.dataset.hqChatBound) {
      form.dataset.hqChatBound = 'true';
      form.addEventListener('submit', event => {
        event.preventDefault();
        sendChat(input.value);
      });
      input.addEventListener('keydown', event => {
        if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
          event.preventDefault();
          sendChat(input.value);
        }
      });
    }

    document.querySelectorAll('[data-lina-quick]').forEach(button => {
      if (button.dataset.hqQuickBound) return;
      button.dataset.hqQuickBound = 'true';
      button.addEventListener('click', () => sendChat(button.dataset.linaQuick || button.textContent || ''));
    });

    document.addEventListener('click', event => {
      const button = event.target.closest('button');
      if (!button) return;

      const dialog = button.closest('dialog[open]');
      if (dialog && (button.value === 'cancel' || button.matches('[aria-label="닫기"]'))) {
        event.preventDefault();
        dialog.close('cancel');
        return;
      }

      if (dialog?.id === 'projectDialog' && button.value === 'default') {
        event.preventDefault();
        const projectForm = document.getElementById('projectForm');
        if (projectForm?.reportValidity()) projectForm.requestSubmit(button);
        return;
      }

      if (button.matches('[data-lina-target]')) {
        const selector = button.dataset.linaTarget;
        const target = selector ? document.querySelector(selector) : null;
        if (target) {
          event.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          target.classList.add('hq-target-flash');
          window.setTimeout(() => target.classList.remove('hq-target-flash'), 1200);
        }
        return;
      }

      if (button.matches('[data-decision-done]')) {
        const id = button.dataset.decisionDone;
        if (!id) return;
        const date = new Date().toISOString().slice(0, 10);
        localStorage.setItem(`savingio-lina-task:${date}:${id}`, 'done');
        button.textContent = '처리 완료됨';
        button.disabled = true;
        button.closest('.lina-decision-item')?.classList.add('hq-task-complete');
      }
    }, true);

    decorateExplorer();
    buildBriefing();
    buildLog();
    loadExecutionRuntime();
    refreshBriefing();

    tree?.addEventListener('click', () => window.setTimeout(refreshBriefing, 0));
    document.getElementById('runContentAuditBtn')?.addEventListener('click', () => window.setTimeout(refreshBriefing, 1200));

    window.SavingioHQ = Object.freeze({
      version: 'V3.037-execution-lina',
      mode: 'legacy-admin-hq',
      assistant: 'online',
      explorer: 'primary',
      v2Protected: true,
      context: currentContext,
      reply: statusReply,
      refresh: refreshBriefing,
      send: sendChat
    });
  });
})();