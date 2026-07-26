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
      if (!messages) return;
      const item = document.createElement('div');
      item.className = `lina-msg ${role}`;
      item.textContent = text;
      messages.appendChild(item);
      messages.scrollTop = messages.scrollHeight;
    };

    const currentContext = () => {
      const active = tree?.querySelector('.active,[aria-current="page"]');
      return active?.textContent?.replace(/[⌂◫▤▶↗₩✓⚙▥•◇]/g, '').trim()
        || pageTitle?.textContent?.trim()
        || '통합 상황실';
    };

    const readDashboard = () => {
      const rows = document.querySelectorAll('#contentApprovalRows tr[data-path]');
      let failed = 0;
      rows.forEach(row => {
        if (/미달|❌|B|C|D/.test(row.textContent || '')) failed += 1;
      });
      const healthNode = document.querySelector('.content-health-summary strong,.content-health-summary b');
      return {
        articleRows: rows.length,
        failed,
        healthText: healthNode?.textContent?.trim() || '확인 중'
      };
    };

    const statusReply = command => {
      const context = currentContext();
      const projectCount = document.querySelectorAll('#projectList [data-project-id],#projectList .project-card').length;
      const { articleRows, failed } = readDashboard();
      const normalized = command.replace(/\s+/g, ' ').trim();

      if (/살아|응답|리나/.test(normalized)) return `리나 HQ 정상 응답 중입니다. 현재 위치는 ${context}입니다.`;
      if (/오늘 상황|상황|현황/.test(normalized)) return `현재 ${context} 화면입니다. 프로젝트 ${projectCount}건, Doctor 표시 글 ${articleRows}건, 확인 필요 항목 약 ${failed}건입니다.`;
      if (/오늘 할 일|할 일|다음/.test(normalized)) {
        if (!articleRows) return '먼저 전체 Doctor 검사를 실행해 콘텐츠 상태를 불러오겠습니다. 그다음 미달 글 → 중복 → 승인 → 배포 순서로 진행합니다.';
        if (failed) return `우선 헌법/DNA 미달로 보이는 ${failed}건부터 확인한 뒤 승인과 배포 상태를 점검하겠습니다.`;
        return '현재 큰 미달 표시는 없습니다. GitHub 반영, Cloudflare 배포, 실제 URL 검증 순서로 확인하겠습니다.';
      }
      if (/오류/.test(normalized)) return failed ? `현재 화면에서 확인이 필요한 항목이 약 ${failed}건 보입니다.` : '현재 화면에서 즉시 집계되는 오류는 없습니다.';
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
      return `명령을 확인했습니다: “${normalized}”. 현재 ${context} 기준으로 작업하겠습니다.`;
    };

    const iconFor = label => {
      const text = label.replace(/[▶▼▾⌄]/g, '').trim();
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
        <div class="hq-health"><span>운영 Health</span><b data-hq-health>확인 중</b></div>
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

    const refreshBriefing = () => {
      const { articleRows, failed, healthText } = readDashboard();
      const context = currentContext();
      const setText = (selector, value) => {
        const node = panel?.querySelector(selector);
        if (node && node.textContent !== value) node.textContent = value;
      };
      setText('[data-hq-health]', String(healthText));
      setText('[data-hq-context]', context);
      setText('[data-hq-failed]', `${failed}건`);
      setText('[data-hq-rows]', `${articleRows}건`);
      const logText = document.querySelector('[data-hq-log-text]');
      if (logText) logText.textContent = `${context} · Explorer ACTIVE · Lina Assistant ONLINE · Admin V2 보호`;
    };

    if (form && input && messages && !form.dataset.hqFallbackBound) {
      form.dataset.hqFallbackBound = 'true';
      form.addEventListener('submit', () => {
        const text = input.value.trim();
        if (!text) return;
        const before = messages.children.length;
        window.setTimeout(() => {
          if (messages.children.length === before) append(statusReply(text), 'bot');
        }, 350);
      });
    }

    document.querySelectorAll('[data-lina-quick]').forEach(button => {
      if (button.dataset.hqBound) return;
      button.dataset.hqBound = 'true';
      button.addEventListener('click', () => {
        const command = button.dataset.linaQuick || button.textContent || '';
        window.setTimeout(() => {
          const last = messages?.lastElementChild?.textContent || '';
          if (!last || last === command) append(statusReply(command), 'bot');
        }, 350);
      });
    });

    decorateExplorer();
    buildBriefing();
    buildLog();
    refreshBriefing();

    tree?.addEventListener('click', () => {
      window.setTimeout(refreshBriefing, 0);
    });

    document.getElementById('runContentAuditBtn')?.addEventListener('click', () => {
      window.setTimeout(refreshBriefing, 1200);
    });

    window.SavingioHQ = Object.freeze({
      version: 'V3.033-stable',
      mode: 'legacy-admin-hq',
      assistant: 'online',
      explorer: 'primary',
      v2Protected: true,
      context: currentContext,
      reply: statusReply,
      refresh: refreshBriefing
    });
  });
})();