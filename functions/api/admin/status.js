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

async function getBootstrapDevice(request) {
  const token = parseCookies(request)[ADMIN_BOOTSTRAP_COOKIE];
  if (!token || (await sha256Hex(token)) !== ADMIN_BOOTSTRAP_HASH) return null;
  return {
    deviceId: 'bootstrap-primary-pc',
    name: '내 컴퓨터',
    createdAt: Date.now()
  };
}

export async function onRequestGet(context) {
  const device = await getTrustedDevice(context.request, context.env) || await getBootstrapDevice(context.request);
  if (!device) {
    return Response.json({ ok: false, trusted: false }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }

  return Response.json({
    ok: true,
    trusted: true,
    device: {
      id: device.deviceId,
      name: device.name,
      createdAt: device.createdAt
    }
  }, { headers: { 'Cache-Control': 'no-store' } });
}
