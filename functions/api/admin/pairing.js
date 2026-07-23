import { createPairingToken, getTrustedDevice, verifySignedPayload } from '../../_lib/admin-auth.js';

const ADMIN_BOOTSTRAP_HASH = 'f4e2ba3fe9c051392c8550dee7b3ce17be257bf893a114cb6500cf8145394608';
const ADMIN_BOOTSTRAP_COOKIE = 'savingio_admin_bootstrap';

function parseCookies(request) {
  const raw = request.headers.get('Cookie') || '';
  return Object.fromEntries(raw.split(';').map(item => item.trim()).filter(Boolean).map(item => {
    const index = item.indexOf('=');
    return index < 0 ? [item, ''] : [item.slice(0, index), decodeURIComponent(item.slice(index + 1))];
  }));
}

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('');
}

async function getBootstrapToken(request) {
  const token = parseCookies(request)[ADMIN_BOOTSTRAP_COOKIE];
  if (!token || (await sha256Hex(token)) !== ADMIN_BOOTSTRAP_HASH) return '';
  return token;
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const trustedDevice = await getTrustedDevice(request, env);
  const bootstrapToken = await getBootstrapToken(request);

  if (!trustedDevice && !bootstrapToken) {
    return Response.json({ ok: false, error: '신뢰된 기기에서만 QR을 만들 수 있습니다.' }, { status: 401 });
  }

  if (!env.ADMIN_DEVICE_SECRET || !env.ADMIN_SECURITY_KV) {
    return Response.json({ ok: false, error: '휴대폰 연결용 보안 설정이 완료되지 않았습니다.' }, { status: 503 });
  }

  let body = {};
  try { body = await request.json(); } catch {}
  const requestedName = String(body.requestedName || '내 휴대폰').slice(0, 60);
  const token = await createPairingToken(env, requestedName);
  const payload = await verifySignedPayload(token, env.ADMIN_DEVICE_SECRET);

  await env.ADMIN_SECURITY_KV.put(`pairing:${payload.pairingId}`, JSON.stringify({
    requestedName,
    createdBy: trustedDevice?.deviceId || 'bootstrap-primary-pc',
    issuedAt: payload.issuedAt
  }), { expirationTtl: 300 });

  const url = new URL('/api/admin/consume-pair', request.url);
  url.searchParams.set('token', token);

  return Response.json({
    ok: true,
    pairingUrl: url.toString(),
    expiresIn: 300,
    requestedName
  }, { headers: { 'Cache-Control': 'no-store' } });
}
