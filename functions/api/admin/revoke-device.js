const DEVICE_INDEX_KEY = 'trusted-devices:index';

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.ADMIN_SECURITY_KV) {
    return Response.json({ ok: false, error: '기기 저장소가 연결되어 있지 않습니다.' }, { status: 503 });
  }

  let body = {};
  try { body = await request.json(); } catch {}
  const deviceId = String(body.deviceId || '').trim();
  if (!deviceId) {
    return Response.json({ ok: false, error: '해제할 기기를 선택해주세요.' }, { status: 400 });
  }

  await env.ADMIN_SECURITY_KV.put(`revoked-device:${deviceId}`, String(Date.now()), {
    expirationTtl: 60 * 60 * 24 * 370
  });

  let devices = [];
  try {
    devices = JSON.parse(await env.ADMIN_SECURITY_KV.get(DEVICE_INDEX_KEY) || '[]');
  } catch {}
  devices = (Array.isArray(devices) ? devices : []).filter(device => device?.id !== deviceId);
  await env.ADMIN_SECURITY_KV.put(DEVICE_INDEX_KEY, JSON.stringify(devices));

  return Response.json({ ok: true, revokedDeviceId: deviceId }, {
    headers: { 'Cache-Control': 'no-store' }
  });
}
