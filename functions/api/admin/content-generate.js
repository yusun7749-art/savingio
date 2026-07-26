import { getAdminDevice } from '../../_lib/admin-auth.js';

const ACTION_PREFIX = 'content-action:';
const BACKUP_PREFIX = 'content-backup:';
const SAFE_ID = /^[0-9]+-[a-f0-9-]{8,}$/i;

function json(data, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

function outputText(response) {
  if (typeof response?.output_text === 'string') return response.output_text;
  return (response?.output || [])
    .flatMap(item => item?.content || [])
    .filter(item => item?.type === 'output_text' && typeof item.text === 'string')
    .map(item => item.text)
    .join('\n');
}

function cleanHtml(value) {
  return String(value || '')
    .replace(/^```html\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
}

function buildPrompt(record, backup) {
  const plan = record.rewritePlan || {};
  const preserve = plan.preserve || {};
  const target = plan.target || {};
  const source = String(backup.html || '').slice(0, 120000);
  return `Savingio 운영 글을 새로 작성하라. 웹 검색으로 현재 한국 기준의 공식 자료와 검색 의도를 조사한 뒤 완성된 HTML 문서만 출력하라.

절대 보존:
- URL 경로: ${preserve.path || record.article.path}
- H1: ${preserve.h1 || record.article.title}
- canonical: ${preserve.canonical || ''}
- 카테고리: ${preserve.category || record.article.category || ''}
- Publisher ID는 pub-7605193583747751만 허용

Savingio 헌법:
- 기존 본문 문장을 재사용하지 말고 처음부터 새로 작성
- 최소 ${target.minimumTextLength || 5000}자
- 흐름: ${(target.requiredFlow || []).join(' → ')}
- 데스크톱 3분할 구조 유지
- 왼쪽 Navigation/Explorer 유지
- 오른쪽 카드 정확히 5개: 지금 해야 할 행동, 계산기/점검도구, 같은 카테고리 글, 함께 볼 관련 글, 다음 단계/주의사항
- 표, 체크리스트, 사례, FAQ, 공식기관 링크, 관련글 문제 해결 사슬 포함
- 보험·법률·정책·수치는 단정하지 말고 조건과 예외를 명시
- meta description, canonical, 구조화된 FAQ 데이터 포함
- 외부 검색으로 확인한 내용은 본문에서 출처 기관명을 자연스럽게 밝힐 것
- 마크다운 금지, 설명 금지, <!doctype html>부터 </html>까지 완성 HTML만 출력

기존 운영 HTML은 구조 참고용이다. 본문 문장 재사용 금지:
${source}`;
}

async function callOpenAI(env, prompt) {
  if (!env.OPENAI_API_KEY) throw new Error('Cloudflare 환경변수 OPENAI_API_KEY가 연결되어 있지 않습니다.');
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL || 'gpt-5',
      tools: [{ type: 'web_search' }],
      input: prompt
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || `OpenAI API HTTP ${response.status}`);
  const html = cleanHtml(outputText(data));
  if (!/^<!doctype html>/i.test(html) || !/<\/html>\s*$/i.test(html)) throw new Error('AI가 완성 HTML 문서를 반환하지 않았습니다.');
  return { html, responseId: data.id || null, model: data.model || env.OPENAI_MODEL || 'gpt-5' };
}

export async function onRequestGet(context) {
  const device = await getAdminDevice(context.request, context.env);
  if (!device) return json({ ok: false, error: '신뢰된 관리자 기기에서만 사용할 수 있습니다.' }, 401);
  return json({
    ok: Boolean(context.env.OPENAI_API_KEY),
    checks: { openaiKeyAvailable: Boolean(context.env.OPENAI_API_KEY), model: context.env.OPENAI_MODEL || 'gpt-5' },
    message: context.env.OPENAI_API_KEY ? 'AI SEO·헌법 글 생성 엔진이 연결되어 있습니다.' : 'OPENAI_API_KEY 연결이 필요합니다.'
  }, context.env.OPENAI_API_KEY ? 200 : 503);
}

export async function onRequestPost(context) {
  const device = await getAdminDevice(context.request, context.env);
  if (!device) return json({ ok: false, error: '신뢰된 관리자 기기에서만 사용할 수 있습니다.' }, 401);
  if (!context.env.ADMIN_SECURITY_KV) return json({ ok: false, error: 'ADMIN_SECURITY_KV 저장소가 연결되어 있지 않습니다.' }, 503);

  let body = {};
  try { body = await context.request.json(); } catch { return json({ ok: false, error: '요청 내용을 읽을 수 없습니다.' }, 400); }
  const actionId = String(body.actionId || '');
  if (!SAFE_ID.test(actionId)) return json({ ok: false, error: '유효한 작업 번호가 필요합니다.' }, 400);

  const store = context.env.ADMIN_SECURITY_KV;
  const record = await store.get(`${ACTION_PREFIX}${actionId}`, 'json');
  if (!record || record.action !== 'rewrite') return json({ ok: false, error: '헌법 재작성 작업을 찾을 수 없습니다.' }, 404);
  if (!['generation_approved', 'draft_validation_failed', 'draft_review_ready'].includes(record.state)) {
    return json({ ok: false, error: `현재 상태(${record.state})에서는 AI 초안을 생성할 수 없습니다.` }, 409);
  }
  const backup = await store.get(`${BACKUP_PREFIX}${record.backupId}`, 'json');
  if (!backup?.html || backup.sourceHash !== record.sourceHash) return json({ ok: false, error: '검증된 원본 백업을 찾을 수 없습니다.' }, 409);

  try {
    record.state = 'ai_generating';
    record.nextStatus = 'ai_generating';
    record.aiGeneration = { startedAt: new Date().toISOString(), requestedBy: device.name || '신뢰된 관리자 기기' };
    await store.put(`${ACTION_PREFIX}${actionId}`, JSON.stringify(record), { expirationTtl: 60 * 60 * 24 * 90 });

    const generated = await callOpenAI(context.env, buildPrompt(record, backup));
    const draftResponse = await fetch(new URL('/api/admin/content-draft', context.request.url), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: context.request.headers.get('Cookie') || ''
      },
      body: JSON.stringify({ command: 'submit_draft', actionId, html: generated.html })
    });
    const draftResult = await draftResponse.json().catch(() => ({}));
    if (![201, 422].includes(draftResponse.status) || !draftResult.record) throw new Error(draftResult.error || '생성된 초안의 헌법 검증 저장에 실패했습니다.');

    draftResult.record.aiGeneration = {
      ...(record.aiGeneration || {}),
      completedAt: new Date().toISOString(),
      responseId: generated.responseId,
      model: generated.model
    };
    await store.put(`${ACTION_PREFIX}${actionId}`, JSON.stringify(draftResult.record), { expirationTtl: 60 * 60 * 24 * 90 });

    return json({
      ok: Boolean(draftResult.draft?.validation?.pass),
      actionId,
      html: generated.html,
      record: draftResult.record,
      draft: draftResult.draft,
      status: draftResult.status,
      message: draftResult.draft?.validation?.pass
        ? 'SEO 조사·헌법 글 생성·자동 검수까지 완료했습니다. 최종 승인만 남았습니다.'
        : 'AI 초안 생성은 완료했지만 헌법 검수 미달 항목이 남았습니다.'
    }, draftResult.draft?.validation?.pass ? 201 : 422);
  } catch (error) {
    record.state = 'ai_generation_failed';
    record.nextStatus = 'ai_generation_failed';
    record.aiGeneration = { ...(record.aiGeneration || {}), failedAt: new Date().toISOString(), error: error.message };
    await store.put(`${ACTION_PREFIX}${actionId}`, JSON.stringify(record), { expirationTtl: 60 * 60 * 24 * 90 });
    return json({ ok: false, error: error.message, record }, 502);
  }
}
