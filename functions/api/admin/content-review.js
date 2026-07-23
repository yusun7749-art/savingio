import { getTrustedDevice } from '../../_lib/admin-auth.js';

const ACTION_PREFIX = 'content-action:';
const STATUS_PREFIX = 'content-status:';
const SAFE_ID = /^[0-9]+-[a-f0-9-]{8,}$/i;
const ALLOWED_DECISIONS = new Set(['approve_plan', 'reject_plan', 'regenerate_plan']);

function json(data, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

async function authenticate(context) {
  const device = await getTrustedDevice(context.request, context.env);
  if (!device) return { error: json({ ok: false, error: '신뢰된 관리자 기기에서만 사용할 수 있습니다.' }, 401) };
  if (!context.env.ADMIN_SECURITY_KV) return { error: json({ ok: false, error: 'ADMIN_SECURITY_KV 저장소가 연결되어 있지 않습니다.' }, 503) };
  return { device };
}

export async function onRequestGet(context) {
  const auth = await authenticate(context);
  if (auth.error) return auth.error;
  const id = new URL(context.request.url).searchParams.get('id') || '';
  if (!SAFE_ID.test(id)) return json({ ok: false, error: '유효한 작업 번호가 필요합니다.' }, 400);
  const record = await context.env.ADMIN_SECURITY_KV.get(`${ACTION_PREFIX}${id}`, 'json');
  if (!record) return json({ ok: false, error: '검토 작업을 찾을 수 없습니다.' }, 404);
  return json({ ok: true, record });
}

export async function onRequestPost(context) {
  const auth = await authenticate(context);
  if (auth.error) return auth.error;

  let body = {};
  try { body = await context.request.json(); } catch {
    return json({ ok: false, error: '요청 내용을 읽을 수 없습니다.' }, 400);
  }

  const id = String(body.id || '');
  const decision = String(body.decision || '');
  if (!SAFE_ID.test(id) || !ALLOWED_DECISIONS.has(decision)) {
    return json({ ok: false, error: '유효한 작업 번호와 검토 결정을 입력해주세요.' }, 400);
  }

  const record = await context.env.ADMIN_SECURITY_KV.get(`${ACTION_PREFIX}${id}`, 'json');
  if (!record || record.action !== 'rewrite') return json({ ok: false, error: '헌법 수정 검토 작업을 찾을 수 없습니다.' }, 404);

  const now = new Date().toISOString();
  record.review = {
    decision,
    decidedAt: now,
    decidedBy: { deviceId: auth.device.deviceId || null, name: auth.device.name || '신뢰된 관리자 기기' }
  };

  if (decision === 'approve_plan') {
    record.state = 'generation_pending';
    record.nextStatus = 'generation_pending';
  } else if (decision === 'reject_plan') {
    record.state = 'rejected';
    record.nextStatus = 'hold';
  } else {
    record.state = 'regeneration_pending';
    record.nextStatus = 'rewrite_pending';
  }

  await context.env.ADMIN_SECURITY_KV.put(`${ACTION_PREFIX}${id}`, JSON.stringify(record), { expirationTtl: 60 * 60 * 24 * 90 });
  await context.env.ADMIN_SECURITY_KV.put(`${STATUS_PREFIX}${record.article.path}`, record.nextStatus);

  const message = decision === 'approve_plan'
    ? '수정 설계를 승인했습니다. 실제 AI 본문 생성 대기 상태로 이동했습니다.'
    : decision === 'reject_plan'
      ? '수정 설계를 반려하고 글을 보류 상태로 이동했습니다.'
      : '수정 설계 재생성 요청을 등록했습니다.';

  return json({ ok: true, status: record.nextStatus, state: record.state, record, message });
}