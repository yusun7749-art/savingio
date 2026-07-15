const ALLOWED = new Set(['calculator_view','calculator_start','calculator_complete','calculator_action_click','calculator_related_click']);

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    if (!body || !ALLOWED.has(body.event) || !body.calculator_id) {
      return Response.json({ok:false,error:'invalid_event'}, {status:400});
    }
    const record = {
      event: body.event,
      calculator_id: String(body.calculator_id).slice(0,80),
      action_level: body.action_level ? String(body.action_level).slice(0,40) : null,
      result_bucket: body.result_bucket ? String(body.result_bucket).slice(0,40) : null,
      target_url: body.target_url ? String(body.target_url).slice(0,300) : null,
      page: body.page ? String(body.page).slice(0,300) : null,
      session_id: body.session_id ? String(body.session_id).slice(0,100) : null,
      timestamp: new Date().toISOString()
    };
    console.log(JSON.stringify({type:'savingio_calculator_event', ...record}));
    if (context.env.CALCULATOR_EVENTS) {
      const key = `${Date.now()}-${crypto.randomUUID()}`;
      await context.env.CALCULATOR_EVENTS.put(key, JSON.stringify(record), {expirationTtl: 60 * 60 * 24 * 90});
    }
    return Response.json({ok:true,stored:Boolean(context.env.CALCULATOR_EVENTS)}, {status:202});
  } catch (error) {
    return Response.json({ok:false,error:'bad_request'}, {status:400});
  }
}

export function onRequestGet() {
  return Response.json({ok:true,service:'Savingio Calculator Events',version:'2.047'});
}
