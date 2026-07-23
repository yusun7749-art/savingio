import {
  createTrustedDeviceToken,
  trustedCookie,
  verifySignedPayload
} from '../../_lib/admin-auth.js';

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const token = url.searchParams.get('token') || '';

  if (!env.ADMIN_DEVICE_SECRET) {
    return new Response('휴대폰 연결 보안키가 설정되지 않았습니다.', {
      status: 503,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store'
      }
    });
  }

  const pairing = await verifySignedPayload(token, env.ADMIN_DEVICE_SECRET);

  if (!pairing || pairing.type !== 'device-pairing') {
    return new Response('QR이 만료되었거나 올바르지 않습니다. 컴퓨터 HQ에서 새 QR을 만들어주세요.', {
      status: 401,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store'
      }
    });
  }

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
