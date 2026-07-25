(() => {
  'use strict';

  const REPORT_KEY = 'savingio-admin-hq-final-qa-v1';
  const now = () => new Date().toISOString();
  const clone = value => JSON.parse(JSON.stringify(value));
  const safe = (name, fn) => {
    try {
      const result = fn();
      return { name, ok:true, result };
    } catch (error) {
      return { name, ok:false, error:error?.message || String(error) };
    }
  };

  function normalize(name, result) {
    if (!result) return { name, status:'WARN', valid:false, warnings:['검사 결과가 없습니다.'], errors:[] };
    const status = String(result.status || (result.valid === false ? 'WARN' : 'PASS')).toUpperCase();
    return {
      name,
      status:['PASS','WARN','FAIL'].includes(status) ? status : 'WARN',
      valid:result.valid !== false && status !== 'FAIL',
      warnings:[...(result.warnings || [])],
      errors:[...(result.errors || [])],
      detail:result
    };
  }

  function modulePresence() {
    const required = [
      ['Admin HQ Core','SavingioAdminHQ'],
      ['Admin HQ Router','SavingioAdminRouter'],
      ['Role Engine','SavingioAdminRole'],
      ['State Manager','SavingioAdminState'],
      ['Project Engine','SavingioProject'],
      ['Workflow Engine','SavingioWorkflow'],
      ['Automation Engine','SavingioAutomation'],
      ['Approval Center','SavingioApprovalCenter'],
      ['Operations HQ','SavingioOperationsHQ'],
      ['Plugin Manager','SavingioPluginManager'],
      ['GitHub Status','SavingioGitHubStatus'],
      ['Cloudflare Deploy','SavingioCloudflareDeploy'],
      ['URL Health','SavingioUrlHealth']
    ];
    const missing = required.filter(([, global]) => !window[global]);
    return {
      valid:missing.length === 0,
      status:missing.length ? 'WARN' : 'PASS',
      checkedAt:now(),
      total:required.length,
      loaded:required.length - missing.length,
      missing:missing.map(([label, global]) => ({ label, global })),
      warnings:missing.map(([label]) => `${label} 모듈이 로딩되지 않았습니다.`),
      errors:[]
    };
  }

  function eventAndDomAudit() {
    const duplicateScripts = [...document.scripts]
      .map(script => script.src)
      .filter(Boolean)
      .filter((src, index, list) => list.indexOf(src) !== index);
    const duplicateIds = [...document.querySelectorAll('[id]')]
      .map(node => node.id)
      .filter((id, index, list) => list.indexOf(id) !== index);
    const routeShell = Boolean(document.getElementById('adminHqRouterShell'));
    const statusBar = Boolean(document.getElementById('adminHqStatusBar'));
    const roleBadge = Boolean(document.getElementById('adminRoleBadge'));
    const warnings = [];
    if (duplicateScripts.length) warnings.push(`중복 스크립트 ${new Set(duplicateScripts).size}개`);
    if (duplicateIds.length) warnings.push(`중복 DOM ID ${new Set(duplicateIds).size}개`);
    if (!routeShell) warnings.push('Admin HQ 라우터 셸이 없습니다.');
    if (!statusBar) warnings.push('Admin HQ 상태바가 없습니다.');
    if (!roleBadge) warnings.push('권한 역할 배지가 없습니다.');
    return {
      valid:warnings.length === 0,
      status:warnings.length ? 'WARN' : 'PASS',
      checkedAt:now(),
      duplicateScripts:[...new Set(duplicateScripts)],
      duplicateIds:[...new Set(duplicateIds)],
      routeShell,
      statusBar,
      roleBadge,
      warnings,
      errors:[]
    };
  }

  function localStorageAudit() {
    const corrupt = [];
    const keys = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key || !key.startsWith('savingio-')) continue;
      keys.push(key);
      const raw = localStorage.getItem(key);
      if (raw === null) continue;
      try { JSON.parse(raw); } catch { corrupt.push(key); }
    }
    return {
      valid:corrupt.length === 0,
      status:corrupt.length ? 'WARN' : 'PASS',
      checkedAt:now(),
      keys:keys.length,
      corrupt,
      warnings:corrupt.map(key => `${key}: JSON 파싱 실패`),
      errors:[]
    };
  }

  function integrationAudit() {
    const checks = [];
    const sources = [
      ['Admin HQ Core', () => window.SavingioAdminHQ?.audit?.()],
      ['Router', () => window.SavingioAdminRouter?.audit?.()],
      ['Role', () => window.SavingioAdminRole?.audit?.()],
      ['State', () => window.SavingioAdminState?.audit?.()],
      ['Project', () => window.SavingioProjectQA?.run?.() || window.SavingioProject?.audit?.()],
      ['Automation', () => window.SavingioAutomationQA?.run?.() || window.SavingioAutomation?.audit?.()],
      ['Operations', () => window.SavingioOperationsHQQA?.run?.() || window.SavingioOperationsHQ?.audit?.()],
      ['Plugin Store', () => window.SavingioPluginStoreQA?.run?.() || window.SavingioPluginManager?.audit?.()],
      ['Plugin Marketplace', () => window.SavingioPluginMarketplaceQA?.run?.()]
    ];
    sources.forEach(([name, fn]) => {
      const executed = safe(name, fn);
      if (!executed.ok) checks.push({ name, status:'FAIL', valid:false, warnings:[], errors:[executed.error] });
      else if (executed.result) checks.push(normalize(name, executed.result));
      else checks.push({ name, status:'WARN', valid:false, warnings:['검사 API가 없거나 결과가 비어 있습니다.'], errors:[] });
    });
    return checks;
  }

  function summarize(checks) {
    const counts = { PASS:0, WARN:0, FAIL:0 };
    checks.forEach(check => { counts[check.status] = (counts[check.status] || 0) + 1; });
    const status = counts.FAIL ? 'FAIL' : counts.WARN ? 'WARN' : 'PASS';
    return { status, valid:status === 'PASS', counts };
  }

  function run(options={}) {
    const checks = [
      normalize('모듈 로딩', modulePresence()),
      ...integrationAudit(),
      normalize('DOM·이벤트 구조', eventAndDomAudit()),
      normalize('LocalStorage 무결성', localStorageAudit())
    ];
    const summary = summarize(checks);
    const report = {
      id:`ADMIN-QA-${Date.now()}`,
      phase:'8-05',
      title:'Admin HQ Final QA',
      status:summary.status,
      valid:summary.valid,
      counts:summary.counts,
      checkedAt:now(),
      checks,
      environment:{ href:location.href, userAgent:navigator.userAgent, online:navigator.onLine }
    };
    localStorage.setItem(REPORT_KEY, JSON.stringify(report));
    window.dispatchEvent(new CustomEvent('savingio:admin-hq-final-qa-complete', { detail:clone(report) }));
    if (options.render !== false) render(report);
    return clone(report);
  }

  function latest() {
    try { return JSON.parse(localStorage.getItem(REPORT_KEY) || 'null'); } catch { return null; }
  }

  function render(input=latest() || run({ render:false })) {
    let panel = document.getElementById('adminHqFinalQaPanel');
    if (!panel) {
      panel = document.createElement('section');
      panel.id = 'adminHqFinalQaPanel';
      panel.className = 'admin-hq-final-qa';
      document.body.appendChild(panel);
    }
    panel.innerHTML = `<header><div><small>PHASE 8-05</small><h2>Admin HQ 최종 QA</h2><p>${input.checkedAt}</p></div><strong class="qa-status ${input.status.toLowerCase()}">${input.status}</strong></header><div class="qa-counts"><span>PASS ${input.counts.PASS}</span><span>WARN ${input.counts.WARN}</span><span>FAIL ${input.counts.FAIL}</span></div><div class="qa-list">${input.checks.map(check => `<article><h3>${check.name}<em class="${check.status.toLowerCase()}">${check.status}</em></h3>${check.warnings.length ? `<ul>${check.warnings.map(item => `<li>${item}</li>`).join('')}</ul>` : '<p>이상 없음</p>'}${check.errors.length ? `<ul class="errors">${check.errors.map(item => `<li>${item}</li>`).join('')}</ul>` : ''}</article>`).join('')}</div><footer><button type="button" data-admin-final-qa-rerun>다시 검사</button><button type="button" data-admin-final-qa-close>닫기</button></footer>`;
    panel.querySelector('[data-admin-final-qa-rerun]')?.addEventListener('click', () => run());
    panel.querySelector('[data-admin-final-qa-close]')?.addEventListener('click', () => panel.remove());
    return panel;
  }

  function exportReport(input=latest() || run({ render:false })) {
    const blob = new Blob([JSON.stringify(input, null, 2)], { type:'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `savingio-admin-hq-final-qa-${input.id}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return input.id;
  }

  function boot() {
    if (!document.querySelector('link[data-admin-hq-final-qa-css]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '/admin/os/admin-hq-final-qa.css';
      link.dataset.adminHqFinalQaCss = 'true';
      document.head.appendChild(link);
    }
    window.SavingioAdminHQQA = Object.freeze({ run, latest, render, exportReport, modulePresence, localStorageAudit, eventAndDomAudit });
    window.addEventListener('savingio:admin-hq-final-qa-open', () => render());
    window.dispatchEvent(new CustomEvent('savingio:admin-hq-final-qa-ready', { detail:{ latest:latest() } }));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();