(() => {
  'use strict';

  const HISTORY_KEY = 'savingio-lina-chat-history-v1';
  const MEMORY_KEY = 'savingio-lina-memory-v1';
  const EXECUTION_KEY = 'savingio-hq-execution-jobs-v1';
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
    const executionQueue = readJson(EXECUTION_KEY, []);
    const memory = readJson(MEMORY_KEY, []);
    return { page, health, articleRows: rows.length, failed, projects, executionQueue, memory };
  }

  function diagnosticReply(response, payload, rawText = '') {
    const parts = [];
    const message = String(payload?.message || rawText || 'LINA CORE 요청에 실패했습니다.').trim();
    parts.push(message);
    if (payload?.error) parts.push(`오류 코드: ${payload.error}`);
    if (payload?.upstreamStatus) parts.push(`OpenAI 상태: HTTP ${payload.upstreamStatus}`);
    else if (response?.status && response.status !== 200) parts.push(`서버 상태: HTTP ${response.status}`);
    if (payload?.model) parts.push(`모델: ${payload.model}`);
    return parts.join('\n');
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
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: clean,
          history: history().slice(0, -1),
          context: dashboardContext()
        })
      });

      const rawText = await response.text();
      let payload = {};
      try { payload = rawText ? JSON.parse(rawText) : {}; } catch (_) { payload = {}; }
      thinking?.remove();

      if (!response.ok || !payload.ok) {
        append(diagnosticReply(response, payload, rawText.slice(0, 1200)), 'bot', 'error');
        return;
      }

      append(payload.answer, 'bot');
      saveTurn('assistant', payload.answer);
      document.dispatchEvent(new CustomEvent('savingio:lina-answer', { detail: payload }));
    } catch (error) {
      thinking?.remove();
      append(`LINA CORE 네트워크 오류: ${error?.message || error}`, 'bot', 'error');
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