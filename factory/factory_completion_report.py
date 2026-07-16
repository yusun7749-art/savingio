from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
checks={
"factory_exists":(ROOT/'factory').exists(),
"calculators":(ROOT/'calculators').exists(),
"articles":(ROOT/'articles').exists(),
"publisher_lock":'pub-7605193583747751' in (ROOT/'ads.txt').read_text(errors='ignore') if (ROOT/'ads.txt').exists() else False
}
out=ROOT/'factory'/'output'/'factory_completion_status.json'
out.parent.mkdir(exist_ok=True)
out.write_text(json.dumps(checks,indent=2),encoding='utf-8')
print(json.dumps(checks,indent=2))
