(() => {
  'use strict';

  const HISTORY_KEY = 'savingio-lina-chat-history-v1';
  const MEMORY_KEY = 'savingio-lina-memory-v1';
  const MAX_HISTORY = 24;

  const $ = selector => document.querySelector(selector);

  function readJson(key, fallback = []) {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch (_) { return fallback; }
  }

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function history() {
    return readJson(HISTORY_KEY, []).slice(-MAX_HISTORY);
  }

  function saveTurn(role, content) {
    const next = [...history(), { role, content: String(content || '').slice(0, 8000), at: new Date().toISOString() }].slice(-MAX_HISTORY);
    writeJson(HISTORY_KEY, next);
  }

  function append(text, role = 'bot', extraClass = '') {
    const messages = $('#linaMessages');
    if (!messages || !text) return null;
    const item = document.createElement('div');
    item.className = `lina-msg ${role}${extraClass ? ` ${extraClass}` : ''}`;
    item.textContent = text;
    messages.appendChild(item);
    messages.scrollTop = messages.scrollHeight;
    return item;
  }

  function dashboardContext() {
    const rows = [...document.querySelectorAll('#contentApprovalRows tr[data-path]')];
    const failed = rows.filter(row => /미달|❌|B|C|D/.test(row.textContent || '')).length;
    const health = $('#linaHealthScore')?.textContent?.trim() || '측정 중';
    const page = $('#pageTitle')?.textContent?.trim() || '통합 상황실';
    const projects = document.querySelectorAll('#projectList [data-project-id], #projectList .project-card').length;
    const executionQueue = readJson('savingio-execution-jobs', []);
    const memory = readJson(MEMORY_KEY, []);
    return { page, health, articleRows: rows.length, failed, projects, executionQueue, memory };
  }

  function fallbackReply(prompt, message) {
    if (message) return message;
    if (/안녕|리나/.test(prompt)) return '네, 선장님. 현재 실제 AI 연결 준비 상태를 확인하지 못했습니다. Cloudflare의 OPENAI_API_KEY 설정을 확인해 주세요.';
    return '현재 LINA CORE 서버와 대화하지 못했습니다. 잠시 후 다시 시도해 주세요.';
  }

  async function askLina(prompt) {
    const clean = String(prompt || '').trim();
    if (!clean || window.__linaChatBusy) return;
    window.__linaChatBusy = true;

    const input = $('#linaInput');
    const submit = $('#linaForm button[type="submit"]');
    if (input) input.value = '';
    if (submit) submit.disabled = true;

    append(clean, 'user');
    saveTurn('user', clean);
    const thinking = append('리나가 Savingio 상황을 확인하고 있습니다…', 'bot', 'thinking');

    try {
      const response = await fetch('/api/admin/lina-chat', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: clean,
          history: history().slice(0, -1),
          context: dashboardContext()
        })
      });
      const payload = await response.json().catch(() => ({}));
      thinking?.remove();

      if (!response.ok || !payload.ok) {
        const answer = fallbackReply(clean, payload.message);
        append(answer, 'bot', 'error');
        return;
      }

      append(payload.answer, 'bot');
      saveTurn('assistant', payload.answer);
      document.dispatchEvent(new CustomEvent('savingio:lina-answer', { detail: payload }));
    } catch (error) {
      thinking?.remove();
      append(fallbackReply(clean, error.message), 'bot', 'error');
    } finally {
      window.__linaChatBusy = false;
      if (submit) submit.disabled = false;
      input?.focus();
    }
  }

  async function checkStatus() {
    try {
      const response = await fetch('/api/admin/lina-chat', { cache: 'no-store', credentials: 'same-origin' });
      const payload = await response.json().catch(() => ({}));
      const panel = $('#linaPanel');
      if (panel) panel.dataset.linaCore = payload.ready ? 'ready' : 'setup-required';
      const small = panel?.querySelector('.lina-id small');
      if (small) small.textContent = payload.ready ? `LINA CORE · ${payload.model} 연결` : 'LINA CORE · API 키 설정 필요';
    } catch (_) {
      const panel = $('#linaPanel');
      if (panel) panel.dataset.linaCore = 'offline';
    }
  }

  function restoreHistory() {
    const messages = $('#linaMessages');
    const saved = history();
    if (!messages || !saved.length) return;
    messages.innerHTML = '';
    saved.forEach(item => append(item.content, item.role === 'assistant' ? 'bot' : 'user'));
  }

  function bind() {
    const form = $('#linaForm');
    const input = $('#linaInput');
    if (!form || !input || form.dataset.linaCoreBound) return;
    form.dataset.linaCoreBound = 'true';

    restoreHistory();
    checkStatus();

    form.addEventListener('submit', event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      askLina(input.value);
    }, true);

    input.addEventListener('keydown', event => {
      if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
        event.preventDefault();
        event.stopImmediatePropagation();
        askLina(input.value);
      }
    }, true);

    document.addEventListener('click', event => {
      const quick = event.target.closest('[data-lina-quick]');
      if (!quick) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      askLina(quick.dataset.linaQuick || quick.textContent || '');
    }, true);

    window.SavingioLinaCore = {
      ask: askLina,
      clearHistory() {
        localStorage.removeItem(HISTORY_KEY);
        const messages = $('#linaMessages');
        if (messages) messages.innerHTML = '<div class="lina-msg bot">대화 기록을 비웠습니다. 무엇을 도와드릴까요?</div>';
      },
      remember(note) {
        const clean = String(note || '').trim();
        if (!clean) return;
        const next = [...readJson(MEMORY_KEY, []), clean].slice(-30);
        writeJson(MEMORY_KEY, next);
      },
      status: checkStatus
    };
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', bind, { once: true })
    : bind();
})();
