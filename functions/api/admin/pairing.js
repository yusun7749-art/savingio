import { createPairingToken, getTrustedDevice } from '../../_lib/admin-auth.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  const device = await getTrustedDevice(request, env);
  if (!device) {
    return Response.json({ ok: false, error: '신뢰된 기기에서만 QR을 만들 수 있습니다.' }, { status: 401 });
  }

  let body = {};
  try { body = await request.json(); } catch {}
  const requestedName = String(body.requestedName || '내 휴대폰').slice(0, 60);
  const token = await createPairingToken(env, requestedName);
  const url = new URL('/admin/', request.url);
  url.searchParams.set('pair', token);

  return Response.json({
    ok: true,
    pairingUrl: url.toString(),
    expiresIn: 300,
    requestedName
  }, { headers: { 'Cache-Control': 'no-store' } });
}
