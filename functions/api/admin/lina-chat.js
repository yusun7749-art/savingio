import { getAdminDevice } from '../../_lib/admin-auth.js';

const json = (body, status = 200) => Response.json(body, {
  status,
  headers: {
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8'
  }
});

const text = value => String(value ?? '').trim();

function safeHistory(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(-16).map(item => ({
    role: item?.role === 'assistant' ? 'assistant' : 'user',
    content: text(item?.content).slice(0, 6000)
  })).filter(item => item.content);
}

function safeContext(value = {}) {
  return {
    page: text(value.page || '통합 상황실').slice(0, 160),
    health: text(value.health || '측정 중').slice(0, 80),
    articleRows: Number(value.articleRows || 0),
    failed: Number(value.failed || 0),
    projects: Number(value.projects || 0),
    executionQueue: Array.isArray(value.executionQueue)
      ? value.executionQueue.slice(-10).map(job => ({
          title: text(job?.title).slice(0, 180),
          status: text(job?.status).slice(0, 40)
        }))
      : [],
    memory: Array.isArray(value.memory)
      ? value.memory.slice(-12).map(item => text(item).slice(0, 500)).filter(Boolean)
      : []
  };
}

function outputText(payload) {
  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) return payload.output_text.trim();
  for (const item of payload?.output || []) {
    for (const content of item?.content || []) {
      if (content?.type === 'output_text' && content?.text) return String(content.text).trim();
    }
  }
  return '';
}

export async function onRequestGet(context) {
  const device = await getAdminDevice(context.request, context.env);
  if (!device) return json({ ok: false, error: 'UNAUTHORIZED' }, 401);

  return json({
    ok: true,
    service: 'LINA CORE Chat',
    ready: Boolean(context.env.OPENAI_API_KEY),
    model: context.env.LINA_OPENAI_MODEL || 'gpt-5',
    device: { id: device.deviceId, name: device.name },
    checkedAt: new Date().toISOString()
  });
}

export async function onRequestPost(context) {
  const device = await getAdminDevice(context.request, context.env);
  if (!device) return json({ ok: false, error: 'UNAUTHORIZED' }, 401);

  if (!context.env.OPENAI_API_KEY) {
    return json({
      ok: false,
      error: 'OPENAI_API_KEY_REQUIRED',
      message: 'Cloudflare 환경변수 OPENAI_API_KEY를 등록하면 실제 리나 대화가 활성화됩니다.'
    }, 503);
  }

  let body;
  try {
    body = await context.request.json();
  } catch {
    return json({ ok: false, error: 'INVALID_JSON' }, 400);
  }

  const prompt = text(body?.message).slice(0, 12000);
  if (!prompt) return json({ ok: false, error: 'EMPTY_MESSAGE' }, 400);

  const contextData = safeContext(body?.context);
  const history = safeHistory(body?.history);
  const model = context.env.LINA_OPENAI_MODEL || 'gpt-5';

  const instructions = [
    '당신은 Savingio Admin HQ에 파견된 AI 운영 파트너 LINA CORE다.',
    '사용자를 항상 선장님이라고 부르되 과도하게 반복하지 않는다.',
    '자연스러운 한국어 존댓말로 답한다.',
    '단순 대화와 실제 실행 요청을 구분한다.',
    '실제로 확인하거나 실행하지 않은 작업을 완료했다고 말하지 않는다.',
    'GitHub 수정, 배포, 색인 요청은 승인 및 실행 엔진 결과가 있을 때만 완료라고 말한다.',
    '현재 Admin 문맥을 우선 사용하고, 모르는 값은 추측하지 않는다.',
    '답은 읽기 쉽게 짧은 문단 중심으로 작성한다.',
    `현재 Admin 문맥: ${JSON.stringify(contextData)}`
  ].join('\n');

  const input = [
    ...history.map(item => ({ role: item.role, content: item.content })),
    { role: 'user', content: prompt }
  ];

  let apiResponse;
  try {
    apiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${context.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        instructions,
        input,
        max_output_tokens: 1200
      })
    });
  } catch (error) {
    return json({ ok: false, error: 'OPENAI_NETWORK_ERROR', message: error.message }, 502);
  }

  const payload = await apiResponse.json().catch(() => ({}));
  if (!apiResponse.ok) {
    return json({
      ok: false,
      error: 'OPENAI_API_ERROR',
      message: payload?.error?.message || `OpenAI API HTTP ${apiResponse.status}`
    }, 502);
  }

  const answer = outputText(payload);
  if (!answer) return json({ ok: false, error: 'EMPTY_MODEL_RESPONSE' }, 502);

  return json({
    ok: true,
    answer,
    model,
    responseId: payload.id || null,
    answeredAt: new Date().toISOString()
  });
}
