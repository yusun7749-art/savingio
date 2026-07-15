from __future__ import annotations
from pathlib import Path
import json, html
from .calculator_registry import load_registry, save_registry
from .utils import save_json, now_iso
from .calculator_action_engine import load_action_rules

FORMULA_VERSION = "2.047"

def load_formula_dna(config_dir: Path) -> dict:
    path = config_dir / "calculator_formula_dna.json"
    if not path.exists():
        return {"version": FORMULA_VERSION, "calculators": {}}
    return json.loads(path.read_text(encoding="utf-8"))

def _field_html(field: dict) -> str:
    fid = html.escape(field["id"])
    label = html.escape(field["label"])
    if field.get("type") == "select":
        opts = "".join(f'<option value="{html.escape(str(o["value"]))}">{html.escape(o["label"])}</option>' for o in field.get("options", []))
        return f'<label class="cg-field"><span>{label}</span><select id="{fid}" name="{fid}">{opts}</select></label>'
    attrs = " ".join(f'{key}="{field[key]}"' for key in ("min", "max", "step") if key in field)
    default = field.get("default", "")
    unit = html.escape(field.get("unit", ""))
    return f'<label class="cg-field"><span>{label}</span><div class="cg-input-wrap"><input id="{fid}" name="{fid}" type="number" value="{default}" {attrs} required><em>{unit}</em></div></label>'

def _script(mode: str) -> str:
    formulas = {
        "salary": "const annual=v('annualSalary'),taxFree=v('taxFree'),dep=Math.max(1,v('dependents'));const gross=annual/12,taxable=Math.max(0,gross-taxFree),pension=Math.min(taxable,6170000)*0.045,health=taxable*0.03545,care=health*0.1295,employ=taxable*0.009,income=Math.max(0,taxable*0.03-(dep-1)*12500),local=income*0.1,deduct=pension+health+care+employ+income+local;show('예상 월 실수령액',gross-deduct,[['월 세전 급여',gross],['예상 공제 합계',deduct],['4대보험 추정',pension+health+care+employ],['소득세·지방소득세 추정',income+local]]);",
        "hourly": "const wage=v('hourlyWage'),hours=v('weeklyHours'),weeks=v('weeks'),base=wage*hours*weeks,weeklyAllowance=hours>=15?wage*(hours/5)*weeks:0;show('예상 월급',base+weeklyAllowance,[['기본급 추정',base],['주휴수당 추정',weeklyAllowance],['월 환산 근무시간',hours*weeks,'시간']]);",
        "electricity": "const usage=v('usage'),price=v('unitPrice'),pct=v('savingPercent'),current=usage*price,savedUsage=usage*pct/100,saving=savedUsage*price;show('예상 월 전기요금',current,[['절약 목표 사용량',savedUsage,'kWh'],['예상 절약액',saving],['절약 후 예상 요금',current-saving]]);",
        "severance": "const monthly=v('monthlyAverage'),years=v('serviceYears'),value=monthly*years;show('예상 퇴직금',value,[['평균 월급',monthly],['재직기간',years,'년'],['1년당 추정 퇴직금',monthly]]);",
        "vat": "const amount=v('amount'),rate=v('vatRate')/100,type=document.getElementById('amountType').value;let supply,vat,total;if(type==='total'){supply=amount/(1+rate);vat=amount-supply;total=amount}else{supply=amount;vat=amount*rate;total=supply+vat}show('부가세',vat,[['공급가액',supply],['부가세',vat],['합계금액',total]]);",
        "loan": "const p=v('principal'),annual=v('annualRate'),n=Math.max(1,v('months')),r=annual/100/12,payment=r===0?p/n:p*r*Math.pow(1+r,n)/(Math.pow(1+r,n)-1),total=payment*n;show('예상 월 상환액',payment,[['대출원금',p],['총 상환액',total],['총이자',total-p],['상환기간',n,'개월']]);",
    }
    return formulas[mode]

def render_calculator_page(calculator: dict, formula: dict) -> str:
    fields = "".join(_field_html(f) for f in formula["inputs"])
    links = "".join(f'<a href="{html.escape(url)}">{html.escape(label)} →</a>' for url, label in formula.get("related", []))
    title = html.escape(formula["title"])
    desc = html.escape(formula["description"])
    notice = html.escape(formula["notice"])
    calc_id = html.escape(calculator["id"])
    canonical = "https://savingio.com" + calculator["url"]
    formula_js = _script(formula["mode"])
    action_payload = load_action_rules(Path(__file__).resolve().parent / "config").get("calculators", {}).get(calculator["id"], [])
    action_json = json.dumps(action_payload, ensure_ascii=False).replace("</", "<\\/")
    return f'''<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{title} | Savingio</title><meta name="description" content="{desc}"><meta name="robots" content="index,follow"><link rel="canonical" href="{canonical}"><link rel="stylesheet" href="/css/style.css?v=4"><link rel="stylesheet" href="/css/calculator-generation-v2046.css?v=1"></head><body class="cg-body" data-calculator-id="{calc_id}"><header class="site-header"><div class="header-inner"><a class="logo" href="/">Savingio</a><nav class="nav"><a href="/articles/">전체 글</a><a href="/calculators/">계산기</a><a href="/about.html">소개</a></nav></div></header><main class="cg-shell"><section class="cg-hero"><span>Savingio 해결 계산기</span><h1>{title}</h1><p>{desc}</p></section><section class="cg-card"><form id="calculator-form"><h2>1. 알고 있는 값을 입력하세요</h2><div class="cg-grid">{fields}</div><button class="cg-primary" type="submit">계산 결과 확인</button><button class="cg-secondary" type="reset">초기화</button><p id="cg-error" role="alert"></p></form><section id="cg-result" class="cg-result" aria-live="polite" hidden><h2>2. 예상 결과</h2><p id="cg-main-label"></p><strong id="cg-main-value"></strong><div id="cg-breakdown"></div><div id="cg-smart-action" class="cg-smart-action" hidden><span id="cg-action-level"></span><h3 id="cg-action-title"></h3><p id="cg-action-description"></p><div id="cg-action-links"></div></div><div class="cg-next"><h3>함께 확인할 기본 안내</h3>{links}</div><p class="cg-notice">{notice}</p></section></section></main><footer class="site-footer"><div class="footer-inner"><strong>Savingio</strong><div>계산 결과는 참고용이며 공식 기관과 계약 내용을 함께 확인하세요.</div></div></footer><script>(function(){{
const form=document.getElementById('calculator-form'),result=document.getElementById('cg-result'),error=document.getElementById('cg-error');
const actionBox=document.getElementById('cg-smart-action'),actionRules={action_json},cid='{calc_id}';
const won=n=>Math.round(n).toLocaleString('ko-KR')+'원';const v=id=>Number(document.getElementById(id).value||0);
const sid=(()=>{{let x=sessionStorage.getItem('savingio_calc_sid');if(!x){{x=(crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random());sessionStorage.setItem('savingio_calc_sid',x)}}return x}})();
function bucket(n){{if(n<100000)return'under_100k';if(n<500000)return'100k_500k';if(n<1000000)return'500k_1m';if(n<3000000)return'1m_3m';return'over_3m'}}
function track(event,extra){{const payload=Object.assign({{event:event,calculator_id:cid,page:location.pathname,session_id:sid,timestamp:new Date().toISOString()}},extra||{{}});window.dataLayer=window.dataLayer||[];window.dataLayer.push(payload);try{{const q=JSON.parse(localStorage.getItem('savingio_calculator_events')||'[]');q.push(payload);localStorage.setItem('savingio_calculator_events',JSON.stringify(q.slice(-100)))}}catch(e){{}}fetch('/api/calculator-events',{{method:'POST',headers:{{'content-type':'application/json'}},body:JSON.stringify(payload),keepalive:true}}).catch(()=>{{}})}}
function selectAction(value){{for(const rule of actionRules){{if(rule.max==null||value<=Number(rule.max))return rule}}return null}}
function renderAction(value){{const rule=selectAction(value);if(!rule){{actionBox.hidden=true;return}}document.getElementById('cg-action-level').textContent='맞춤 행동 · '+(rule.level||'guide');document.getElementById('cg-action-title').textContent=rule.title;document.getElementById('cg-action-description').textContent=rule.description;const links=document.getElementById('cg-action-links');links.innerHTML=(rule.links||[]).map(x=>'<a class="cg-action-link" href="'+x[0]+'">'+x[1]+' →</a>').join('');links.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>track('calculator_action_click',{{action_level:rule.level,target_url:a.getAttribute('href'),result_bucket:bucket(value)}})));actionBox.hidden=false;return rule}}
function show(label,value,rows){{document.getElementById('cg-main-label').textContent=label;document.getElementById('cg-main-value').textContent=won(value);document.getElementById('cg-breakdown').innerHTML=rows.map(r=>'<div><span>'+r[0]+'</span><b>'+(r[2]?Number(r[1]).toLocaleString('ko-KR')+r[2]:won(r[1]))+'</b></div>').join('');const rule=renderAction(value);result.hidden=false;result.scrollIntoView({{behavior:'smooth',block:'start'}});track('calculator_complete',{{action_level:rule?rule.level:null,result_bucket:bucket(value)}})}}
let started=false;form.addEventListener('input',()=>{{if(!started){{started=true;track('calculator_start')}}}});
form.addEventListener('submit',e=>{{e.preventDefault();error.textContent='';try{{{formula_js}}}catch(err){{error.textContent='입력값을 다시 확인해주세요.'}}}});form.addEventListener('reset',()=>{{result.hidden=true;actionBox.hidden=true;error.textContent='';started=false}});track('calculator_view');
}})();</script></body></html>'''

def generate_calculator(project_root: Path, calculator_id: str, overwrite: bool = False) -> dict:
    config_dir = project_root / "factory" / "config"
    registry = load_registry(config_dir)
    calculator = next((c for c in registry.get("calculators", []) if c.get("id") == calculator_id), None)
    formula = load_formula_dna(config_dir).get("calculators", {}).get(calculator_id)
    if not calculator:
        return {"status": "blocked", "reason": "calculator_not_registered", "calculator_id": calculator_id}
    if not formula:
        return {"status": "blocked", "reason": "formula_not_defined", "calculator_id": calculator_id}
    path = project_root / calculator["url"].lstrip("/")
    if path.exists() and not overwrite:
        return {"status": "skipped", "reason": "file_exists", "path": str(path), "calculator_id": calculator_id}
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(render_calculator_page(calculator, formula), encoding="utf-8")
    calculator["status"] = "active"
    calculator["formula_version"] = FORMULA_VERSION
    calculator["generated_at"] = now_iso()
    save_registry(config_dir, registry)
    result = {"status": "generated", "calculator_id": calculator_id, "path": str(path), "url": calculator["url"], "formula_version": FORMULA_VERSION, "generated_at": now_iso()}
    save_json(project_root / "factory" / "output" / "calculator" / f"{calculator_id}-generation.json", result)
    return result

def generate_all_calculators(project_root: Path, overwrite: bool = False) -> dict:
    registry = load_registry(project_root / "factory" / "config")
    results = [generate_calculator(project_root, c["id"], overwrite=overwrite) for c in registry.get("calculators", [])]
    return {"status": "completed" if all(r["status"] in {"generated", "skipped"} for r in results) else "partial", "generated": sum(r["status"] == "generated" for r in results), "skipped": sum(r["status"] == "skipped" for r in results), "blocked": sum(r["status"] == "blocked" for r in results), "results": results, "completed_at": now_iso()}

def validate_generated_calculator(project_root: Path, calculator_id: str) -> dict:
    registry = load_registry(project_root / "factory" / "config")
    c = next((x for x in registry.get("calculators", []) if x.get("id") == calculator_id), None)
    issues = []
    if not c:
        return {"pass": False, "issues": ["not_registered"], "calculator_id": calculator_id}
    path = project_root / c.get("url", "").lstrip("/")
    if not path.exists():
        issues.append("file_missing")
    else:
        text = path.read_text(encoding="utf-8", errors="ignore")
        for marker in ("calculator-form", "cg-result", "calculator_complete", "cg-smart-action", "/api/calculator-events", c["id"]):
            if marker not in text:
                issues.append("missing:" + marker)
        if '<meta name="description"' not in text:
            issues.append("missing:meta_description")
        if '<link rel="canonical"' not in text:
            issues.append("missing:canonical")
    if c.get("status") != "active":
        issues.append("registry_not_active")
    return {"pass": not issues, "issues": issues, "calculator_id": calculator_id, "path": str(path), "checked_at": now_iso()}

def validate_all_generated(project_root: Path) -> dict:
    registry = load_registry(project_root / "factory" / "config")
    results = [validate_generated_calculator(project_root, c["id"]) for c in registry.get("calculators", [])]
    return {"pass": all(r["pass"] for r in results), "count": len(results), "passed": sum(r["pass"] for r in results), "results": results, "checked_at": now_iso()}
