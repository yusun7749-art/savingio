import { getAdminDevice } from '../../_lib/admin-auth.js';

const INDEX_KEY = 'content-actions:index';
const STATUS_PREFIX = 'content-status:';
const ACTION_PREFIX = 'content-action:';
const BACKUP_PREFIX = 'content-backup:';
const ALLOWED_ACTIONS = new Set(['rewrite', 'hold', 'approve', 'hide', 'delete']);
const SAFE_PATH = /^\/articles\/[a-z0-9][a-z0-9-]*$/i;

function json(data, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

function normalizePath(value) {
  const path = String(value || '').trim().replace(/\?.*$/, '').replace(/\/$/, '');
  return SAFE_PATH.test(path) ? path : '';
}

async function readIndex(store) {
  try {
    const value = JSON.parse(await store.get(INDEX_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

async function sha256(text) {
  const bytes = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].map(value => value.toString(16).padStart(2, '0')).join('');
}

function extractSourceMeta(html, path) {
  const title = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || '';
  const canonical = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/i)?.[1] || '';
  const description = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i)?.[1] || '';
  const textLength = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, '').length;
  return { title, canonical, description, textLength, path };
}

function buildRewritePlan(article, source) {
  const missing = Array.isArray(article.missing) ? article.missing.map(String).slice(0, 40) : [];
  const requiredFlow = [
    'Lead', '작성·검수', '5초 결론', '30초 질문', '지금 해야 할 행동', '목차',
    '상세 본문', '비교표', '체크리스트·내 상황 찾기', '사례', '보험·제도·법률',
    '계산기·공식기관', 'FAQ', '문제 해결 사슬형 관련 글', 'Footer'
  ];
  return {
    mode: 'constitution_rewrite',
    preserve: {
      path: source.path,
      slug: source.path.split('/').pop(),
      h1: source.title || article.title,
      canonical: source.canonical,
      category: article.category || null
    },
    current: {
      score: Number.isFinite(Number(article.score)) ? Number(article.score) : null,
      textLength: source.textLength,
      missing
    },
    target: {
      minimumTextLength: 5000,
      expectedScore: 95,
      requiredFlow,
      rightRailCards: 5,
      requireTable: true,
      requireChecklist: true,
      requireFaq: true,
      requireOfficialSourceCheck: true,
      requireRelatedArticleChain: true
    },
    safety: {
      overwriteBlocked: true,
      humanApprovalRequired: true,
      urlChangeBlocked: true,
      h1ChangeBlocked: true,
      publisherLockRequired: true
    }
  };
}

async function prepareRewrite(context, record) {
  const sourceUrl = new URL(record.article.path, context.request.url).toString();
  const response = await fetch(sourceUrl, { headers: { 'User-Agent': 'Savingio-Admin-Doctor/1.0' } });
  if (!response.ok) throw new Error(`기존 글을 읽지 못했습니다. HTTP ${response.status}`);
  const html = await response.text();
  const source = extractSourceMeta(html, record.article.path);
  const backupId = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  const sourceHash = await sha256(html);
  const backup = {
    id: backupId,
    path: record.article.path,
    title: source.title || record.article.title,
    sourceHash,
    html,
    createdAt: new Date().toISOString(),
    reason: 'constitution_rewrite'
  };
  await context.env.ADMIN_SECURITY_KV.put(`${BACKUP_PREFIX}${backupId}`, JSON.stringify(backup), {
    expirationTtl: 60 * 60 * 24 * 90
  });
  record.backupId = backupId;
  record.sourceHash = sourceHash;
  record.source = source;
  record.rewritePlan = buildRewritePlan(record.article, source);
  record.state = 'review_ready';
  record.nextStatus = 'rewrite_review';
  record.preparedAt = new Date().toISOString();
  record.safety.backupCreated = true;
  return record;
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const device = await getAdminDevice(request, env);
  if (!device) return json({ ok: false, error: '신뢰된 관리자 기기에서만 사용할 수 있습니다.' }, 401);
  if (!env.ADMIN_SECURITY_KV) return json({ ok: false, error: 'ADMIN_SECURITY_KV 저장소가 연결되어 있지 않습니다.' }, 503);

  const url = new URL(request.url);
  const path = normalizePath(url.searchParams.get('path'));
  if (path) {
    const status = await env.ADMIN_SECURITY_KV.get(`${STATUS_PREFIX}${path}`) || 'published';
    return json({ ok: true, path, status });
  }

  const index = await readIndex(env.ADMIN_SECURITY_KV);
  const actions = [];
  for (const item of index.slice(0, 100)) {
    const record = await env.ADMIN_SECURITY_KV.get(`${ACTION_PREFIX}${item.id}`, 'json');
    if (record) actions.push(record);
  }
  return json({ ok: true, actions });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const device = await getAdminDevice(request, env);
  if (!device) return json({ ok: false, error: '신뢰된 관리자 기기에서만 사용할 수 있습니다.' }, 401);
  if (!env.ADMIN_SECURITY_KV) return json({ ok: false, error: 'ADMIN_SECURITY_KV 저장소가 연결되어 있지 않습니다.' }, 503);

  let body = {};
  try { body = await request.json(); } catch {
    return json({ ok: false, error: '요청 내용을 읽을 수 없습니다.' }, 400);
  }

  const action = String(body.action || '').trim();
  const article = body.article || {};
  const path = normalizePath(article.path);
  const title = String(article.title || '').trim().slice(0, 240);
  if (!ALLOWED_ACTIONS.has(action)) return json({ ok: false, error: '지원하지 않는 작업입니다.' }, 400);
  if (!path || !title) return json({ ok: false, error: '유효한 글 경로와 제목이 필요합니다.' }, 400);

  const now = new Date().toISOString();
  const id = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  const nextStatus = ({
    rewrite: 'rewrite_pending', hold: 'hold', approve: 'approved', hide: 'hide_pending', delete: 'delete_pending'
  })[action];

  let record = {
    id,
    action,
    state: 'queued',
    nextStatus,
    article: {
      path,
      title,
      category: String(article.category || '').slice(0, 120),
      score: Number.isFinite(Number(article.score)) ? Number(article.score) : null,
      missing: Array.isArray(article.missing) ? article.missing.slice(0, 40).map(String) : []
    },
    requestedAt: now,
    requestedBy: { deviceId: device.deviceId || null, name: device.name || '신뢰된 관리자 기기' },
    safety: {
      requiresBackup: ['rewrite', 'hide', 'delete'].includes(action),
      requiresFinalApproval: ['rewrite', 'hide', 'delete'].includes(action),
      destructiveWritePerformed: false,
      backupCreated: false
    }
  };

  if (action === 'rewrite') {
    try {
      record = await prepareRewrite(context, record);
    } catch (error) {
      record.state = 'preparation_failed';
      record.error = error.message;
    }
  }

  await env.ADMIN_SECURITY_KV.put(`${ACTION_PREFIX}${id}`, JSON.stringify(record), { expirationTtl: 60 * 60 * 24 * 90 });
  const index = await readIndex(env.ADMIN_SECURITY_KV);
  index.unshift({ id, action, path, requestedAt: now });
  await env.ADMIN_SECURITY_KV.put(INDEX_KEY, JSON.stringify(index.slice(0, 500)));
  await env.ADMIN_SECURITY_KV.put(`${STATUS_PREFIX}${path}`, record.nextStatus);

  const messages = {
    rewrite: record.state === 'review_ready'
      ? '기존 글 백업과 헌법 수정 설계가 완료되었습니다. 검토 화면에서 보존 항목과 수정 계획을 확인하세요.'
      : `수정 준비 중 오류가 발생했습니다: ${record.error || '원인 불명'}`,
    hold: '보류 상태를 서버에 저장했습니다.',
    approve: '승인 상태를 서버에 저장했습니다. 배포 실행은 별도 배포 엔진 연결 후 진행됩니다.',
    hide: '숨김 요청을 대기열에 등록했습니다. 실제 페이지는 아직 숨겨지지 않았습니다.',
    delete: '삭제 요청을 대기열에 등록했습니다. 백업과 최종 승인 전에는 삭제되지 않습니다.'
  };

  return json({ ok: true, actionId: id, status: record.nextStatus, state: record.state, record, message: messages[action] }, 202);
}
