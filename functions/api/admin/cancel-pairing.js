import { getTrustedDevice } from '../../_lib/admin-auth.js';

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

async function hasBootstrapAccess(request) {
  const token = parseCookies(request)[ADMIN_BOOTSTRAP_COOKIE];
  if (!token) return false;
  return (await sha256Hex(token)) === ADMIN_BOOTSTRAP_HASH;
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const trustedDevice = await getTrustedDevice(request, env);
  const bootstrap = await hasBootstrapAccess(request);

  if (!trustedDevice && !bootstrap) {
    return Response.json({ ok: false, error: '관리자 인증이 필요합니다.' }, { status: 401 });
  }

  let body = {};
  try { body = await request.json(); } catch {}
  const pairingId = String(body.pairingId || '').trim();

  if (pairingId && env.ADMIN_SECURITY_KV) {
    await env.ADMIN_SECURITY_KV.delete(`pairing:${pairingId}`);
  }

  return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}