from __future__ import annotations
from pathlib import Path
import json
from .utils import save_json, now_iso

VERSION = "2.047"

def load_action_rules(config_dir: Path) -> dict:
    path = config_dir / "calculator_action_rules.json"
    if not path.exists():
        return {"version": VERSION, "event_endpoint": "/api/calculator-events", "calculators": {}}
    return json.loads(path.read_text(encoding="utf-8"))

def select_action(calculator_id: str, value: float, config_dir: Path) -> dict:
    rules = load_action_rules(config_dir).get("calculators", {}).get(calculator_id, [])
    for rule in rules:
        maximum = rule.get("max")
        if maximum is None or value <= float(maximum):
            return {**rule, "calculator_id": calculator_id, "result_value": value, "version": VERSION}
    return {"calculator_id": calculator_id, "result_value": value, "level": "default", "title": "결과와 연결된 안내를 확인하세요", "description": "관련 글에서 계산 기준과 다음 행동을 확인할 수 있습니다.", "links": [], "version": VERSION}

def build_action_catalog(project_root: Path) -> dict:
    payload = load_action_rules(project_root / "factory" / "config")
    result = {
        "version": VERSION,
        "calculator_count": len(payload.get("calculators", {})),
        "rule_count": sum(len(v) for v in payload.get("calculators", {}).values()),
        "event_endpoint": payload.get("event_endpoint"),
        "created_at": now_iso(),
    }
    save_json(project_root / "factory" / "output" / "calculator" / "action_catalog.json", result)
    return result
