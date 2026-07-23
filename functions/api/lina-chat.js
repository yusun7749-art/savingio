const encoder=new TextEncoder();

async function digest(value){
  return new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(value)));
}

async function secureEqual(a,b){
  const[x,y]=await Promise.all([digest(a),digest(b)]);
  if(x.length!==y.length)return false;
  let diff=0;
  for(let i=0;i<x.length;i++)diff|=x[i]^y[i];
  return diff===0;
}

function json(data,status=200){
  return new Response(JSON.stringify(data),{
    status,
    headers:{
      'content-type':'application/json; charset=utf-8',
      'cache-control':'private, no-store',
      'x-robots-tag':'noindex, nofollow, noarchive'
    }
  });
}

async function authorized(request,env){
  const header=request.headers.get('authorization')||'';
  if(!header.startsWith('Basic ')||!env.SAVINGIO_HQ_USER||!env.SAVINGIO_HQ_PASSWORD)return false;
  let decoded='';
  try{decoded=atob(header.slice(6));}catch{return false;}
  const separator=decoded.indexOf(':');
  if(separator<0)return false;
  return (await secureEqual(decoded.slice(0,separator),env.SAVINGIO_HQ_USER))&&
    (await secureEqual(decoded.slice(separator+1),env.SAVINGIO_HQ_PASSWORD));
}

function extractText(response){
  if(typeof response.output_text==='string'&&response.output_text.trim())return response.output_text.trim();
  const parts=[];
  for(const item of response.output||[]){
    for(const content of item.content||[]){
      if(content.type==='output_text'&&content.text)parts.push(content.text);
    }
  }
  return parts.join('\n').trim();
}

export async function onRequest(context){
  if(!(await authorized(context.request,context.env)))return json({ok:false,error:'인증 필요'},401);
  if(context.request.method!=='POST')return json({ok:false,error:'지원하지 않는 요청'},405);
  if(!context.env.OPENAI_API_KEY)return json({ok:false,error:'OPENAI_API_KEY 미설정'},503);

  try{
    const body=await context.request.json();
    const message=String(body.message||'').trim();
    if(!message)return json({ok:false,error:'메시지가 없습니다'},400);
    if(message.length>4000)return json({ok:false,error:'메시지가 너무 깁니다'},400);

    const history=Array.isArray(body.history)?body.history.slice(-10):[];
    const contextData=body.context&&typeof body.context==='object'?body.context:{};
    const system=`당신은 Savingio 비공개 관리자 페이지 전용 운영봇 '리나 HQ'입니다.
사용자는 선장님이라고 부릅니다. 한국어 존댓말로 짧고 명확하게 답합니다.
Savingio의 최우선 목표는 애드센스 승인, 고품질 콘텐츠, 글 DNA 통일, Navigation, 내부링크, 안전한 배포입니다.
확인하지 않은 작업을 완료했다고 말하지 않습니다.
수정·숨김·삭제·배포 등 위험한 작업은 대상과 영향을 먼저 설명하고 사용자의 명시적 승인을 요구합니다.
현재 이 채팅 API는 조언과 상태 설명만 담당하며 실제 GitHub 작업을 직접 실행하지 않습니다.
관리 화면의 현재 요약: ${JSON.stringify(contextData)}.`;

    const input=[
      {role:'system',content:[{type:'input_text',text:system}]},
      ...history.filter(item=>item&&['user','assistant'].includes(item.role)&&typeof item.content==='string').map(item=>({
        role:item.role,
        content:[{type:'input_text',text:item.content.slice(0,4000)}]
      })),
      {role:'user',content:[{type:'input_text',text:message}]}
    ];

    const response=await fetch('https://api.openai.com/v1/responses',{
      method:'POST',
      headers:{
        'authorization':`Bearer ${context.env.OPENAI_API_KEY}`,
        'content-type':'application/json'
      },
      body:JSON.stringify({
        model:context.env.SAVINGIO_LINA_MODEL||'gpt-5-mini',
        input,
        store:false,
        max_output_tokens:700
      })
    });

    const result=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(result.error?.message||`OpenAI ${response.status}`);
    const reply=extractText(result);
    if(!reply)throw new Error('빈 응답');
    return json({ok:true,reply});
  }catch(error){
    return json({ok:false,error:error.message||'리나 응답 실패'},400);
  }
}
