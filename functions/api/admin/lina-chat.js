import { getAdminDevice } from '../../_lib/admin-auth.js';

const json = (body, status = 200) => Response.json(body, {
  status,
  headers: {
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8'
  }
});

const text = value => String(value ?? '').trim();

function openAIConfig(env = {}) {
  const candidates = [
    ['OPENAI_API_KEY', env.OPENAI_API_KEY],
    ['SAVINGIO_OPENAI_API_KEY', env.SAVINGIO_OPENAI_API_KEY],
    ['OPENAI_KEY', env.OPENAI_KEY]
  ];
  const found = candidates.find(([, value]) => text(value));
  return {
    apiKey: found ? text(found[1]) : '',
    binding: found ? found[0] : null,
    model: text(env.LINA_OPENAI_MODEL || env.OPENAI_MODEL || 'gpt-5')
  };
}

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

function errorMessage(payload, fallback) {
  return text(payload?.error?.message || payload?.message || fallback);
}

export async function onRequestGet(context) {
  const device = await getAdminDevice(context.request, context.env);
  if (!device) return json({ ok: false, error: 'UNAUTHORIZED' }, 401);

  const config = openAIConfig(context.env);
  return json({
    ok: true,
    service: 'LINA CORE Chat',
    ready: Boolean(config.apiKey),
    model: config.model,
    binding: config.binding,
    device: { id: device.deviceId, name: device.name },
    checkedAt: new Date().toISOString()
  });
}

export async function onRequestPost(context) {
  try {
    const device = await getAdminDevice(context.request, context.env);
    if (!device) return json({ ok: false, error: 'UNAUTHORIZED', message: '관리자 인증이 필요합니다.' }, 401);

    const config = openAIConfig(context.env);
    if (!config.apiKey) {
      return json({
        ok: false,
        error: 'OPENAI_API_KEY_REQUIRED',
        message: '현재 배포에서 OPENAI_API_KEY 비밀 변수를 읽지 못했습니다. 변수를 저장한 뒤 새 Production 배포가 완료되어야 적용됩니다.'
      });
    }

    let body;
    try {
      body = await context.request.json();
    } catch {
      return json({ ok: false, error: 'INVALID_JSON', message: '요청 형식을 읽지 못했습니다.' }, 400);
    }

    const prompt = text(body?.message).slice(0, 12000);
    if (!prompt) return json({ ok: false, error: 'EMPTY_MESSAGE', message: '메시지를 입력해 주세요.' }, 400);

    const contextData = safeContext(body?.context);
    const history = safeHistory(body?.history);
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

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort('OPENAI_TIMEOUT'), 25000);
    let apiResponse;
    try {
      apiResponse = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: config.model,
          instructions,
          input,
          max_output_tokens: 1200,
          store: false
        }),
        signal: controller.signal
      });
    } catch (error) {
      clearTimeout(timeout);
      return json({
        ok: false,
        error: error?.name === 'AbortError' ? 'OPENAI_TIMEOUT' : 'OPENAI_NETWORK_ERROR',
        message: error?.name === 'AbortError'
          ? 'OpenAI 응답 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.'
          : `OpenAI 연결 오류: ${text(error?.message || error)}`,
        model: config.model
      });
    }
    clearTimeout(timeout);

    const raw = await apiResponse.text();
    let payload = {};
    try { payload = raw ? JSON.parse(raw) : {}; } catch (_) { payload = {}; }

    if (!apiResponse.ok) {
      return json({
        ok: false,
        error: 'OPENAI_API_ERROR',
        message: errorMessage(payload, raw.slice(0, 800) || `OpenAI API HTTP ${apiResponse.status}`),
        upstreamStatus: apiResponse.status,
        model: config.model
      });
    }

    const answer = outputText(payload);
    if (!answer) {
      return json({
        ok: false,
        error: 'EMPTY_MODEL_RESPONSE',
        message: 'OpenAI 응답은 도착했지만 표시할 답변이 없었습니다.',
        upstreamStatus: apiResponse.status,
        model: config.model
      });
    }

    return json({
      ok: true,
      answer,
      model: config.model,
      responseId: payload.id || null,
      answeredAt: new Date().toISOString()
    });
  } catch (error) {
    return json({
      ok: false,
      error: 'LINA_SERVER_ERROR',
      message: `LINA CORE 서버 오류: ${text(error?.message || error)}`
    });
  }
}