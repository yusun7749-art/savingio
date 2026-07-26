(() => {
  'use strict';

  const ready = callback => document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', callback, { once: true })
    : callback();

  ready(() => {
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
      const active = tree?.querySelector('.active,[aria-current="page"],button:focus,a:focus');
      return active?.textContent?.trim() || pageTitle?.textContent?.trim() || '통합 상황실';
    };

    const statusReply = command => {
      const context = currentContext();
      const projectCount = document.querySelectorAll('#projectList [data-project-id],#projectList .project-card').length;
      const articleRows = document.querySelectorAll('#contentApprovalRows tr[data-path]').length;
      const failed = [...document.querySelectorAll('#contentApprovalRows tr[data-path]')].filter(row => /미달|❌|B|C|D/.test(row.textContent || '')).length;
      const normalized = command.replace(/\s+/g, ' ').trim();

      if (/살아|응답|리나/.test(normalized)) {
        return `리나 HQ 정상 응답 중입니다. 현재 위치는 ${context}입니다.`;
      }
      if (/오늘 상황|상황|현황/.test(normalized)) {
        return `현재 ${context} 화면입니다. 프로젝트 ${projectCount}건, Doctor 표시 글 ${articleRows}건, 확인 필요 항목 약 ${failed}건입니다.`;
      }
      if (/오늘 할 일|할 일|다음/.test(normalized)) {
        if (!articleRows) return '먼저 전체 Doctor 검사를 실행해 콘텐츠 상태를 불러오겠습니다. 그다음 미달 글 → 중복 → 승인 → 배포 순서로 진행합니다.';
        if (failed) return `우선 헌법/DNA 미달로 보이는 ${failed}건부터 확인한 뒤 승인과 배포 상태를 점검하겠습니다.`;
        return '현재 큰 미달 표시는 없습니다. GitHub 반영, Cloudflare 배포, 실제 URL 검증 순서로 확인하겠습니다.';
      }
      if (/오류/.test(normalized)) {
        return failed ? `현재 화면에서 확인이 필요한 항목이 약 ${failed}건 보입니다. 콘텐츠 운영센터의 미달 필터로 이동해 주세요.` : '현재 화면에서 즉시 집계되는 오류는 없습니다. Doctor 검사와 사이트 무결성 보고서를 함께 확인하겠습니다.';
      }
      if (/휴대폰|보안|QR/.test(normalized)) {
        document.getElementById('securityBtn')?.click();
        return '보안센터를 열었습니다. 휴대폰 이름을 확인한 뒤 연결 QR 만들기를 누르세요.';
      }
      if (/프로젝트/.test(normalized) && /새|생성|추가/.test(normalized)) {
        document.getElementById('newProjectBtn')?.click();
        return '새 프로젝트 창을 열었습니다. Explorer 부서와 실제 업무 프로그램 연결을 기준으로 생성합니다.';
      }
      if (/닥터|doctor|검사/i.test(normalized)) {
        document.getElementById('runContentAuditBtn')?.click();
        return '전체 Doctor 검사를 실행했습니다. 결과가 표시되면 우선순위를 다시 정리하겠습니다.';
      }
      return `명령을 확인했습니다: “${normalized}”. 현재 ${context} 기준으로 작업하겠습니다. 사용할 수 있는 빠른 명령은 오늘 상황, 오늘 할 일, 오류 확인, Doctor 검사, 새 프로젝트, 휴대폰 연결입니다.`;
    };

    if (form && input && messages && !form.dataset.hqFallbackBound) {
      form.dataset.hqFallbackBound = 'true';
      form.addEventListener('submit', event => {
        const text = input.value.trim();
        if (!text) return;
        const before = messages.children.length;
        setTimeout(() => {
          if (messages.children.length === before) append(statusReply(text), 'bot');
        }, 350);
      });
    }

    document.querySelectorAll('[data-lina-quick]').forEach(button => {
      if (button.dataset.hqBound) return;
      button.dataset.hqBound = 'true';
      button.addEventListener('click', () => {
        const command = button.dataset.linaQuick || button.textContent || '';
        setTimeout(() => {
          const last = messages?.lastElementChild?.textContent || '';
          if (!last || last === command) append(statusReply(command), 'bot');
        }, 350);
      });
    });

    const observer = new MutationObserver(() => {
      const active = tree?.querySelector('.active,[aria-current="page"]');
      if (panel && active) panel.dataset.context = active.textContent.trim();
    });
    if (tree) observer.observe(tree, { subtree: true, attributes: true, attributeFilter: ['class', 'aria-current'] });

    window.SavingioHQ = Object.freeze({
      version: 'V3.031',
      mode: 'legacy-admin-hq',
      assistant: 'online',
      explorer: 'primary',
      v2Protected: true,
      context: currentContext,
      reply: statusReply
    });
  });
})();
