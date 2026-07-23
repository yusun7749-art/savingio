import { getTrustedDevice } from '../../_lib/admin-auth.js';

const INDEX_KEY = 'content-actions:index';
const STATUS_PREFIX = 'content-status:';
const ACTION_PREFIX = 'content-action:';
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

export async function onRequestGet(context) {
  const { request, env } = context;
  const device = await getTrustedDevice(request, env);
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
  const device = await getTrustedDevice(request, env);
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
    rewrite: 'rewrite_pending',
    hold: 'hold',
    approve: 'approved',
    hide: 'hide_pending',
    delete: 'delete_pending'
  })[action];

  const record = {
    id,
    action,
    state: 'queued',
    nextStatus,
    article: {
      path,
      title,
      score: Number.isFinite(Number(article.score)) ? Number(article.score) : null,
      missing: Array.isArray(article.missing) ? article.missing.slice(0, 40).map(String) : []
    },
    requestedAt: now,
    requestedBy: {
      deviceId: device.deviceId || null,
      name: device.name || '신뢰된 관리자 기기'
    },
    safety: {
      requiresBackup: ['rewrite', 'hide', 'delete'].includes(action),
      requiresFinalApproval: ['rewrite', 'hide', 'delete'].includes(action),
      destructiveWritePerformed: false
    }
  };

  await env.ADMIN_SECURITY_KV.put(`${ACTION_PREFIX}${id}`, JSON.stringify(record), {
    expirationTtl: 60 * 60 * 24 * 90
  });
  const index = await readIndex(env.ADMIN_SECURITY_KV);
  index.unshift({ id, action, path, requestedAt: now });
  await env.ADMIN_SECURITY_KV.put(INDEX_KEY, JSON.stringify(index.slice(0, 500)));
  await env.ADMIN_SECURITY_KV.put(`${STATUS_PREFIX}${path}`, nextStatus);

  const messages = {
    rewrite: '헌법 자동수정 요청을 안전 대기열에 등록했습니다. 기존 글은 아직 변경되지 않았습니다.',
    hold: '보류 상태를 서버에 저장했습니다.',
    approve: '승인 상태를 서버에 저장했습니다. 배포 실행은 별도 배포 엔진 연결 후 진행됩니다.',
    hide: '숨김 요청을 대기열에 등록했습니다. 실제 페이지는 아직 숨겨지지 않았습니다.',
    delete: '삭제 요청을 대기열에 등록했습니다. 백업과 최종 승인 전에는 삭제되지 않습니다.'
  };

  return json({ ok: true, actionId: id, status: nextStatus, record, message: messages[action] }, 202);
}
