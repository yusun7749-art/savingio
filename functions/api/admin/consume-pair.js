import {
  createTrustedDeviceToken,
  trustedCookie,
  verifySignedPayload
} from '../../_lib/admin-auth.js';

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const token = url.searchParams.get('token') || '';
  const pairing = await verifySignedPayload(token, env.ADMIN_DEVICE_SECRET);
  const pairingKey = pairing?.pairingId ? `pairing:${pairing.pairingId}` : '';
  const storedPairing = pairingKey && env.ADMIN_SECURITY_KV
    ? await env.ADMIN_SECURITY_KV.get(pairingKey)
    : null;

  if (!pairing || pairing.type !== 'device-pairing' || !storedPairing) {
    return new Response('QR이 이미 사용되었거나 만료되었습니다. 컴퓨터 HQ에서 새 QR을 만들어주세요.', {
      status: 401,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store'
      }
    });
  }

  await env.ADMIN_SECURITY_KV.delete(pairingKey);

  const trustedToken = await createTrustedDeviceToken(env, {
    name: pairing.requestedName || '내 휴대폰'
  });

  return new Response(null, {
    status: 302,
    headers: {
      Location: new URL('/admin/', request.url).toString(),
      'Set-Cookie': trustedCookie(trustedToken),
      'Cache-Control': 'no-store'
    }
  });
}
