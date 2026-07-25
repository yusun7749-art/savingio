(() => {
  'use strict';

  const FORMAT = 'savingio-plugin-backup';
  const FORMAT_VERSION = 1;
  const HISTORY_KEY = 'savingio-plugin-backup-history-v1';
  const clone = value => JSON.parse(JSON.stringify(value));
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const now = () => new Date().toISOString();

  function manager() {
    if (!window.SavingioPluginManager) throw Object.assign(new Error('Plugin Manager가 준비되지 않았습니다.'), { code:'PLUGIN_MANAGER_NOT_READY' });
    return window.SavingioPluginManager;
  }

  function readHistory() {
    try {
      const value = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function writeHistory(items) {
    const limited = items.slice(0, 100);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(limited));
    return clone(limited);
  }

  function addHistory(action, detail={}) {
    const items = readHistory();
    items.unshift({ id:`PBR-${Date.now()}`, action, detail:clone(detail), createdAt:now() });
    writeHistory(items);
  }

  function snapshot(ids=[]) {
    const selected = new Set((ids || []).map(id => String(id).trim().toLowerCase()).filter(Boolean));
    const plugins = manager().list().filter(plugin => !selected.size || selected.has(plugin.id));
    return {
      format:FORMAT,
      formatVersion:FORMAT_VERSION,
      createdAt:now(),
      source:'savingio-admin',
      pluginCount:plugins.length,
      plugins:clone(plugins)
    };
  }

  function exportJson(ids=[]) {
    const backup = snapshot(ids);
    addHistory('export', { pluginCount:backup.pluginCount, pluginIds:backup.plugins.map(plugin => plugin.id) });
    window.dispatchEvent(new CustomEvent('savingio:plugin-backup-exported', { detail:{ pluginCount:backup.pluginCount } }));
    return JSON.stringify(backup, null, 2);
  }

  function download(ids=[], filename='') {
    const json = exportJson(ids);
    const blob = new Blob([json], { type:'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename || `savingio-plugin-backup-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    return json;
  }

  function parse(input) {
    if (typeof input === 'string') {
      try { return JSON.parse(input); }
      catch { throw Object.assign(new Error('백업 JSON을 해석할 수 없습니다.'), { code:'PLUGIN_BACKUP_JSON_INVALID' }); }
    }
    if (!input || typeof input !== 'object') throw Object.assign(new Error('백업 데이터가 비어 있습니다.'), { code:'PLUGIN_BACKUP_EMPTY' });
    return clone(input);
  }

  function validate(input) {
    let backup;
    const errors=[];
    const warnings=[];
    try { backup=parse(input); }
    catch (error) { return { valid:false, errors:[error.code || 'PLUGIN_BACKUP_JSON_INVALID'], warnings, backup:null, preview:[] }; }

    if (backup.format !== FORMAT) errors.push('BACKUP_FORMAT_INVALID');
    if (Number(backup.formatVersion) !== FORMAT_VERSION) errors.push('BACKUP_VERSION_UNSUPPORTED');
    if (!Array.isArray(backup.plugins)) errors.push('BACKUP_PLUGINS_INVALID');

    const preview=[];
    const ids=new Set();
    (Array.isArray(backup.plugins) ? backup.plugins : []).forEach((plugin, index) => {
      if (!plugin?.id || !plugin?.manifest) {
        errors.push(`PLUGIN_RECORD_INVALID:${index}`);
        return;
      }
      if (ids.has(plugin.id)) errors.push(`PLUGIN_DUPLICATE:${plugin.id}`);
      ids.add(plugin.id);
      const installed=manager().get(plugin.id);
      const manifestValidation=window.SavingioPluginManifest?.validate?.(plugin.manifest) || { valid:true, errors:[] };
      if (!manifestValidation.valid) errors.push(...manifestValidation.errors.map(item => `MANIFEST:${plugin.id}:${item}`));
      const comparison = installed && window.SavingioPluginManifest?.compareVersions
        ? window.SavingioPluginManifest.compareVersions(plugin.version, installed.version)
        : 0;
      if (installed && comparison < 0) warnings.push(`DOWNGRADE:${plugin.id}:${installed.version}->${plugin.version}`);
      preview.push({ id:plugin.id, name:plugin.name || plugin.manifest.name || plugin.id, backupVersion:plugin.version, installedVersion:installed?.version || '', action:installed?'replace':'install', enabled:Boolean(plugin.enabled) });
    });

    if (Number(backup.pluginCount) !== (backup.plugins || []).length) warnings.push('PLUGIN_COUNT_MISMATCH');
    return { valid:errors.length===0, errors:[...new Set(errors)], warnings:[...new Set(warnings)], backup, preview };
  }

  function restore(input, options={}) {
    const report=validate(input);
    if (!report.valid) throw Object.assign(new Error(`Plugin 백업 검증 실패: ${report.errors.join(', ')}`), { code:'PLUGIN_BACKUP_INVALID', details:report });
    const selected = new Set((options.ids || []).map(id => String(id).trim().toLowerCase()).filter(Boolean));
    const targets=report.backup.plugins.filter(plugin => !selected.size || selected.has(plugin.id));
    const restored=[];
    const failed=[];

    targets.forEach(plugin => {
      try {
        const existing=manager().get(plugin.id);
        manager().install(plugin.manifest, {
          replace:Boolean(existing),
          enabled:plugin.enabled,
          installedAt:plugin.installedAt,
          source:'backup-restore',
          settings:plugin.settings || {},
          requireIntegrity:Boolean(options.requireIntegrity)
        });
        restored.push(plugin.id);
      } catch (error) {
        failed.push({ id:plugin.id, code:error?.code || 'UNKNOWN', message:error?.message || '' });
        if (options.stopOnError) throw error;
      }
    });

    window.SavingioPluginUI?.sync?.();
    addHistory('restore', { restored, failed, total:targets.length });
    window.dispatchEvent(new CustomEvent('savingio:plugin-backup-restored', { detail:{ restored:clone(restored), failed:clone(failed) } }));
    return { valid:failed.length===0, restored, failed, total:targets.length };
  }

  function history() { return clone(readHistory()); }

  function render(root) {
    const plugins=manager().list();
    root.innerHTML=`<section class="workboard-view"><header class="workboard-head"><div><p class="eyebrow">SAVINGIO PLUGIN BACKUP</p><h3>Plugin 백업·복원</h3><p>설치된 Plugin과 설정을 JSON으로 내보내고 검증 후 선택 복원합니다.</p></div><div class="workboard-current"><small>백업 대상</small><strong>${plugins.length}개</strong><span>복원 이력 ${history().filter(item=>item.action==='restore').length}건</span></div></header><div class="workboard-layout"><main class="workboard-phases"><details open><summary><strong>백업 내보내기</strong><span>${plugins.length}</span></summary><form data-plugin-backup-form><ul>${plugins.map(plugin=>`<li class="workboard-task done"><span class="workboard-mark">✓</span><span><strong>${esc(plugin.name)}</strong>${esc(plugin.id)} · v${esc(plugin.version)}</span><em><label><input type="checkbox" name="pluginId" value="${esc(plugin.id)}" checked> 포함</label></em></li>`).join('') || '<li>설치된 Plugin이 없습니다.</li>'}</ul><button type="button" data-plugin-backup-download ${plugins.length?'':'disabled'}>선택 백업 다운로드</button></form></details><details open><summary><strong>백업 복원</strong><span>JSON</span></summary><textarea data-plugin-backup-input rows="12" placeholder="백업 JSON을 붙여넣으세요."></textarea><div><button type="button" data-plugin-backup-preview>복원 미리보기</button><button type="button" data-plugin-backup-restore>검증 후 복원</button></div><div data-plugin-backup-preview-result></div></details></main><aside class="workboard-side"><section><h4>검증 규칙</h4><p>백업 형식·버전·중복 ID·Manifest·Plugin 개수를 검사합니다.</p></section><section><h4>복원 방식</h4><p>기존 Plugin은 설정과 활성 상태를 보존한 백업 값으로 교체합니다.</p></section><section><h4>실행 결과</h4><p data-plugin-backup-message>작업 대기 중</p></section></aside></div></section>`;
    bind(root);
    return plugins;
  }

  function bind(root) {
    const message=root.querySelector('[data-plugin-backup-message]');
    const input=root.querySelector('[data-plugin-backup-input]');
    const previewRoot=root.querySelector('[data-plugin-backup-preview-result]');
    const selectedIds=()=>[...root.querySelectorAll('input[name="pluginId"]:checked')].map(item=>item.value);

    root.querySelector('[data-plugin-backup-download]')?.addEventListener('click', () => {
      try { download(selectedIds()); if(message)message.textContent='선택 Plugin 백업을 다운로드했습니다.'; }
      catch(error){ if(message)message.textContent=`실패: ${error?.message || '알 수 없는 오류'}`; }
    });

    root.querySelector('[data-plugin-backup-preview]')?.addEventListener('click', () => {
      const report=validate(input?.value || '');
      if (previewRoot) previewRoot.innerHTML=report.valid
        ? `<p>검증 통과 · ${report.preview.length}개</p><ul>${report.preview.map(item=>`<li>${esc(item.name)} · ${esc(item.action)} · 백업 v${esc(item.backupVersion)}</li>`).join('')}</ul>${report.warnings.length?`<p>주의: ${esc(report.warnings.join(', '))}</p>`:''}`
        : `<p>검증 실패: ${esc(report.errors.join(', '))}</p>`;
      if(message)message.textContent=report.valid?'복원 미리보기 완료':'백업 검증 실패';
    });

    root.querySelector('[data-plugin-backup-restore]')?.addEventListener('click', () => {
      try {
        const result=restore(input?.value || '');
        if(message)message.textContent=`복원 ${result.restored.length}개 · 실패 ${result.failed.length}개`;
        render(root);
      } catch(error) {
        if(message)message.textContent=`실패: ${error?.message || '알 수 없는 오류'}`;
      }
    });
  }

  function audit() {
    const backup=snapshot();
    const report=validate(backup);
    return { valid:report.valid, errors:report.errors, warnings:report.warnings, pluginCount:backup.pluginCount, history:readHistory().length };
  }

  window.SavingioPluginBackupRestore=Object.freeze({ snapshot, exportJson, download, parse, validate, restore, history, render, audit });
  window.dispatchEvent(new CustomEvent('savingio:plugin-backup-ready', { detail:audit() }));
})();