import { createPairingToken, getTrustedDevice, verifySignedPayload } from '../../_lib/admin-auth.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  const device = await getTrustedDevice(request, env);
  if (!device) {
    return Response.json({ ok: false, error: '신뢰된 기기에서만 QR을 만들 수 있습니다.' }, { status: 401 });
  }
  if (!env.ADMIN_SECURITY_KV) {
    return Response.json({ ok: false, error: 'ADMIN_SECURITY_KV 연결이 필요합니다.' }, { status: 503 });
  }

  let body = {};
  try { body = await request.json(); } catch {}
  const requestedName = String(body.requestedName || '내 휴대폰').slice(0, 60);
  const token = await createPairingToken(env, requestedName);
  const payload = await verifySignedPayload(token, env.ADMIN_DEVICE_SECRET);
  await env.ADMIN_SECURITY_KV.put(`pairing:${payload.pairingId}`, JSON.stringify({
    requestedName,
    createdBy: device.deviceId,
    issuedAt: payload.issuedAt
  }), { expirationTtl: 300 });

  const url = new URL('/admin/', request.url);
  url.searchParams.set('pair', token);

  return Response.json({
    ok: true,
    pairingUrl: url.toString(),
    expiresIn: 300,
    requestedName
  }, { headers: { 'Cache-Control': 'no-store' } });
}
