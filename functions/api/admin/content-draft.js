import { getAdminDevice } from '../../_lib/admin-auth.js';

const ACTION_PREFIX = 'content-action:';
const BACKUP_PREFIX = 'content-backup:';
const DRAFT_PREFIX = 'content-draft:';
const APPROVAL_PREFIX = 'content-final-approval:';
const PUBLISH_PREFIX = 'content-publish-queue:';
const STATUS_PREFIX = 'content-status:';
const SAFE_ID = /^[0-9]+-[a-f0-9-]{8,}$/i;
const PUBLISHER_ID = 'pub-7605193583747751';

function json(data, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

async function authenticate(context) {
  const device = await getAdminDevice(context.request, context.env);
  if (!device) return { error: json({ ok: false, error: '신뢰된 관리자 기기에서만 사용할 수 있습니다.' }, 401) };
  if (!context.env.ADMIN_SECURITY_KV) return { error: json({ ok: false, error: 'ADMIN_SECURITY_KV 저장소가 연결되어 있지 않습니다.' }, 503) };
  return { device };
}

async function sha256(text) {
  const bytes = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].map(value => value.toString(16).padStart(2, '0')).join('');
}

function plainTextLength(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, '')
    .length;
}

function extract(html, pattern) {
  return String(html || '').match(pattern)?.[1]?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || '';
}

function countMatches(html, pattern) {
  return (String(html || '').match(pattern) || []).length;
}

function validateDraft(record, backup, html) {
  const plan = record.rewritePlan || {};
  const preserve = plan.preserve || {};
  const target = plan.target || {};
  const h1 = extract(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const canonical = extract(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/i);
  const textLength = plainTextLength(html);
  const requiredFlow = Array.isArray(target.requiredFlow) ? target.requiredFlow : [];
  const bodyText = String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const requiredFlowChecks = requiredFlow.map(label => ({ label, pass: bodyText.includes(label) }));
  const publisherIds = [...String(html || '').matchAll(/(?:ca-)?pub-\d+/g)].map(match => match[0].replace(/^ca-/, ''));
  const rightRailCards = countMatches(html, /class=["'][^"']*(?:right-card|side-card|sidebar-card|rail-card)[^"']*["']/gi);

  const checks = {
    sourceHashMatchesBackup: Boolean(record.sourceHash && backup?.sourceHash === record.sourceHash),
    urlUnchanged: preserve.path === record.article?.path,
    h1Unchanged: Boolean(h1 && h1 === (preserve.h1 || record.article?.title)),
    canonicalUnchanged: !preserve.canonical || canonical === preserve.canonical,
    publisherLockPass: publisherIds.length === 0 || publisherIds.every(id => id === PUBLISHER_ID),
    minimumTextLengthPass: textLength >= Number(target.minimumTextLength || 5000),
    requiredFlowPass: requiredFlowChecks.every(item => item.pass),
    rightRailExactlyFive: rightRailCards === Number(target.rightRailCards || 5),
    htmlDocumentPass: /<!doctype html>/i.test(html) && /<html[\s>]/i.test(html) && /<body[\s>]/i.test(html)
  };

  return {
    pass: Object.values(checks).every(Boolean),
    checks,
    metrics: { textLength, rightRailCards, h1, canonical, publisherIds: [...new Set(publisherIds)] },
    requiredFlowChecks
  };
}

async function readRecord(store, actionId) {
  return store.get(`${ACTION_PREFIX}${actionId}`, 'json');
}

async function fetchLiveSource(context, path) {
  const sourceUrl = new URL(path, context.request.url).toString();
  const response = await fetch(sourceUrl, { headers: { 'User-Agent': 'Savingio-Admin-Final-Approval/1.0' } });
  if (!response.ok) throw new Error(`운영 원본을 다시 확인하지 못했습니다. HTTP ${response.status}`);
  const html = await response.text();
  return { html, hash: await sha256(html), url: sourceUrl };
}

export async function onRequestGet(context) {
  const auth = await authenticate(context);
  if (auth.error) return auth.error;
  const actionId = new URL(context.request.url).searchParams.get('actionId') || '';
  if (!SAFE_ID.test(actionId)) return json({ ok: false, error: '유효한 작업 번호가 필요합니다.' }, 400);
  const store = context.env.ADMIN_SECURITY_KV;
  const record = await readRecord(store, actionId);
  if (!record) return json({ ok: false, error: '재작성 작업을 찾을 수 없습니다.' }, 404);
  const draft = await store.get(`${DRAFT_PREFIX}${actionId}`, 'json');
  const approval = await store.get(`${APPROVAL_PREFIX}${actionId}`, 'json');
  const publishQueue = await store.get(`${PUBLISH_PREFIX}${actionId}`, 'json');
  return json({ ok: true, record, draft, approval, publishQueue });
}

export async function onRequestPost(context) {
  const auth = await authenticate(context);
  if (auth.error) return auth.error;

  let body = {};
  try { body = await context.request.json(); } catch {
    return json({ ok: false, error: '요청 내용을 읽을 수 없습니다.' }, 400);
  }

  const actionId = String(body.actionId || '');
  const command = String(body.command || 'submit_draft');
  if (!SAFE_ID.test(actionId)) return json({ ok: false, error: '유효한 작업 번호가 필요합니다.' }, 400);
  if (!['submit_draft', 'approve_final'].includes(command)) return json({ ok: false, error: '지원하지 않는 초안 명령입니다.' }, 400);

  const store = context.env.ADMIN_SECURITY_KV;
  const record = await readRecord(store, actionId);
  if (!record || record.action !== 'rewrite') return json({ ok: false, error: '헌법 재작성 작업을 찾을 수 없습니다.' }, 404);
  const backup = await store.get(`${BACKUP_PREFIX}${record.backupId}`, 'json');
  if (!backup) return json({ ok: false, error: '원본 백업을 찾을 수 없어 검증을 중단했습니다.' }, 409);

  if (command === 'approve_final') {
    if (record.state !== 'draft_review_ready') {
      return json({ ok: false, error: `현재 상태(${record.state})에서는 최종 승인할 수 없습니다.` }, 409);
    }
    const draft = await store.get(`${DRAFT_PREFIX}${actionId}`, 'json');
    if (!draft?.html) return json({ ok: false, error: '최종 승인할 HTML 초안을 찾을 수 없습니다.' }, 409);

    const validation = validateDraft(record, backup, draft.html);
    const htmlHash = await sha256(draft.html);
    if (!validation.pass || htmlHash !== draft.htmlHash) {
      record.state = 'draft_validation_failed';
      record.nextStatus = record.state;
      record.safety = { ...record.safety, productionWriteAllowed: false, destructiveWritePerformed: false };
      await store.put(`${ACTION_PREFIX}${actionId}`, JSON.stringify(record), { expirationTtl: 60 * 60 * 24 * 90 });
      await store.put(`${STATUS_PREFIX}${record.article.path}`, record.nextStatus);
      return json({ ok: false, state: record.state, status: record.nextStatus, record, validation, error: '최종 승인 직전 재검사에 실패했습니다. 초안을 다시 저장하고 검사하세요.' }, 422);
    }

    let live;
    try { live = await fetchLiveSource(context, record.article.path); } catch (error) {
      return json({ ok: false, error: error.message }, 409);
    }
    if (live.hash !== record.sourceHash || live.hash !== backup.sourceHash) {
      return json({ ok: false, error: '초안 작업 중 운영 원본이 변경되었습니다. 충돌 방지를 위해 새 백업부터 다시 진행해야 합니다.', conflict: true, expectedHash: record.sourceHash, liveHash: live.hash }, 409);
    }

    const now = new Date().toISOString();
    const approver = { deviceId: auth.device.deviceId || null, name: auth.device.name || '신뢰된 관리자 기기', at: now };
    const approval = {
      actionId,
      path: record.article.path,
      sourceHash: record.sourceHash,
      draftHash: draft.htmlHash,
      validation,
      approvedAt: now,
      approvedBy: approver,
      productionWriteAllowed: true,
      destructiveWritePerformed: false
    };
    const publishQueue = {
      id: actionId,
      actionId,
      path: record.article.path,
      sourceHash: record.sourceHash,
      draftHash: draft.htmlHash,
      state: 'approved_for_publish',
      queuedAt: now,
      queuedBy: approver,
      requirements: ['source_hash_match', 'draft_hash_match', 'publisher_lock', 'atomic_write', 'rollback_on_failure', 'post_deploy_url_verification'],
      productionWriteAllowed: true,
      destructiveWritePerformed: false,
      deploymentEngineConnected: false
    };

    record.state = 'approved_for_publish';
    record.nextStatus = 'approved_for_publish';
    record.finalApproval = { approvedAt: now, approvedBy: approver, draftHash: draft.htmlHash };
    record.publishQueue = { queuedAt: now, state: publishQueue.state };
    record.safety = { ...record.safety, productionWriteAllowed: true, destructiveWritePerformed: false, finalApprovalRequired: false };
    draft.validation = validation;
    draft.finalApprovalRequired = false;
    draft.productionWriteAllowed = true;
    draft.finalApprovedAt = now;

    await Promise.all([
      store.put(`${APPROVAL_PREFIX}${actionId}`, JSON.stringify(approval), { expirationTtl: 60 * 60 * 24 * 365 }),
      store.put(`${PUBLISH_PREFIX}${actionId}`, JSON.stringify(publishQueue), { expirationTtl: 60 * 60 * 24 * 90 }),
      store.put(`${DRAFT_PREFIX}${actionId}`, JSON.stringify(draft), { expirationTtl: 60 * 60 * 24 * 90 }),
      store.put(`${ACTION_PREFIX}${actionId}`, JSON.stringify(record), { expirationTtl: 60 * 60 * 24 * 90 }),
      store.put(`${STATUS_PREFIX}${record.article.path}`, record.nextStatus)
    ]);

    return json({
      ok: true,
      state: record.state,
      status: record.nextStatus,
      record,
      approval,
      publishQueue,
      message: '최종 승인이 완료되어 안전한 운영 반영 대기열에 등록했습니다. 배포 엔진 연결 전에는 실제 파일을 덮어쓰지 않습니다.'
    }, 202);
  }

  if (!['generation_approved', 'draft_validation_failed', 'draft_review_ready'].includes(record.state)) {
    return json({ ok: false, error: `현재 상태(${record.state})에서는 HTML 초안을 제출할 수 없습니다.` }, 409);
  }

  const html = String(body.html || '');
  if (html.length < 1000) return json({ ok: false, error: 'HTML 초안이 너무 짧습니다.' }, 400);
  if (html.length > 2_000_000) return json({ ok: false, error: 'HTML 초안이 허용 크기를 초과했습니다.' }, 413);

  const htmlHash = await sha256(html);
  const validation = validateDraft(record, backup, html);
  const now = new Date().toISOString();
  const draft = {
    id: actionId,
    actionId,
    path: record.article.path,
    sourceHash: record.sourceHash,
    htmlHash,
    html,
    validation,
    submittedAt: now,
    submittedBy: { deviceId: auth.device.deviceId || null, name: auth.device.name || '신뢰된 관리자 기기' },
    productionWriteAllowed: false,
    finalApprovalRequired: true
  };

  await store.put(`${DRAFT_PREFIX}${actionId}`, JSON.stringify(draft), { expirationTtl: 60 * 60 * 24 * 90 });
  record.draft = { htmlHash, submittedAt: now, validationPass: validation.pass };
  record.state = validation.pass ? 'draft_review_ready' : 'draft_validation_failed';
  record.nextStatus = record.state;
  record.safety = { ...record.safety, destructiveWritePerformed: false, productionWriteAllowed: false, finalApprovalRequired: true };
  delete record.finalApproval;
  delete record.publishQueue;
  await store.put(`${ACTION_PREFIX}${actionId}`, JSON.stringify(record), { expirationTtl: 60 * 60 * 24 * 90 });
  await store.put(`${STATUS_PREFIX}${record.article.path}`, record.nextStatus);

  return json({
    ok: true,
    state: record.state,
    status: record.nextStatus,
    record,
    draft: { ...draft, html: undefined },
    message: validation.pass
      ? 'HTML 초안 저장과 헌법 검증이 완료되었습니다. 최종 승인 전까지 운영 글 반영은 차단됩니다.'
      : 'HTML 초안은 저장했지만 헌법 검증에 실패했습니다. 미달 항목을 수정한 뒤 다시 제출하세요.'
  }, validation.pass ? 201 : 422);
}
