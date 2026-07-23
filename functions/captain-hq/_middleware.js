const encoder = new TextEncoder();

async function digest(value) {
  const data = encoder.encode(value);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return new Uint8Array(hash);
}

async function secureEqual(left, right) {
  const [a, b] = await Promise.all([digest(left), digest(right)]);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

function lockedResponse(message, status, challenge = false) {
  const headers = new Headers({
    'Content-Type': 'text/plain; charset=UTF-8',
    'Cache-Control': 'private, no-store, max-age=0',
    'X-Robots-Tag': 'noindex, nofollow, noarchive',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
  });
  if (challenge) headers.set('WWW-Authenticate', 'Basic realm="Savingio HQ", charset="UTF-8"');
  return new Response(message, { status, headers });
}

export async function onRequest(context) {
  const expectedUser = context.env.SAVINGIO_HQ_USER;
  const expectedPassword = context.env.SAVINGIO_HQ_PASSWORD;

  // 비밀값이 설정되지 않은 배포는 무조건 잠급니다.
  if (!expectedUser || !expectedPassword) {
    return lockedResponse('Savingio HQ is locked.', 503);
  }

  const authorization = context.request.headers.get('Authorization') || '';
  if (!authorization.startsWith('Basic ')) {
    return lockedResponse('Authentication required.', 401, true);
  }

  let decoded = '';
  try {
    decoded = atob(authorization.slice(6));
  } catch {
    return lockedResponse('Authentication required.', 401, true);
  }

  const separator = decoded.indexOf(':');
  if (separator < 0) return lockedResponse('Authentication required.', 401, true);

  const suppliedUser = decoded.slice(0, separator);
  const suppliedPassword = decoded.slice(separator + 1);
  const [userOk, passwordOk] = await Promise.all([
    secureEqual(suppliedUser, expectedUser),
    secureEqual(suppliedPassword, expectedPassword),
  ]);

  if (!userOk || !passwordOk) {
    return lockedResponse('Authentication failed.', 401, true);
  }

  const response = await context.next();
  const protectedResponse = new Response(response.body, response);
  protectedResponse.headers.set('Cache-Control', 'private, no-store, max-age=0');
  protectedResponse.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  protectedResponse.headers.set('X-Content-Type-Options', 'nosniff');
  protectedResponse.headers.set('Referrer-Policy', 'no-referrer');
  protectedResponse.headers.set('X-Frame-Options', 'DENY');
  return protectedResponse;
}
