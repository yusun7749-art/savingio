(()=>{
'use strict';
const VERSION='1.0.0';
const ACTION_RULES=[
  {match:['환급','과납','돌려받'],steps:['대상 여부 확인','필요 서류 준비','공식 조회 또는 신청','입금·처리 결과 확인']},
  {match:['절약','할인','감면','줄이'],steps:['현재 지출 확인','적용 가능한 할인 찾기','설정 또는 신청','다음 청구액 비교']},
  {match:['세금','납부','위택스','홈택스'],steps:['납부 대상 확인','금액과 기한 확인','공식 사이트에서 처리','납부 내역 보관']},
  {match:['퇴사','실업','퇴직'],steps:['자격과 기한 확인','회사 발급 서류 확인','공식 신청','지급 일정 확인']},
  {match:['이사','보증금','관리비','장기수선'],steps:['계약·관리비 내역 확인','정산 대상 구분','관리사무소·임대인 요청','반환 결과 확인']}
];
const norm=value=>String(value??'').toLowerCase().normalize('NFKC');
function infer(record){
  const haystack=norm(`${record?.title||''} ${record?.keywords||''} ${(record?.exactQueries||[]).join(' ')}`);
  const rule=ACTION_RULES.find(item=>item.match.some(token=>haystack.includes(norm(token))));
  return rule?rule.steps:['내 상황 확인','조건과 예외 확인','필요한 행동 실행','결과를 다시 확인'];
}
function build(graph,related){
  const chain=value=>{
    const record=typeof value==='string'?(graph.getById(value)||graph.getByHref(value)):value;
    if(!record)return null;
    const next=related?.mixed(record,{limit:3})||[];
    return Object.freeze({record,steps:Object.freeze(infer(record).map((label,index)=>Object.freeze({order:index+1,label}))),next:Object.freeze(next)});
  };
  return Object.freeze({version:VERSION,chain});
}
window.SavingioActionChain=Object.freeze({VERSION,ACTION_RULES:Object.freeze(ACTION_RULES),build});
})();