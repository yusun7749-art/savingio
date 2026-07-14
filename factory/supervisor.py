from __future__ import annotations
from pathlib import Path
from .contracts import load_contracts, validate_packet, write_handoff
from .utils import save_json, now_iso

class Supervisor:
    def __init__(self, project_root: Path):
        self.project_root = project_root.resolve()
        self.config_dir = self.project_root / "factory" / "config"
        self.output_dir = self.project_root / "factory" / "output"
        self.contracts = load_contracts(self.config_dir)

    def review(self, department: str, packet: dict) -> dict:
        contract = self.contracts["departments"][department]
        result = validate_packet(packet, contract)
        report = {
            "department": department,
            "pass": result["pass"],
            "missing": result["missing"],
            "rework_required": not result["pass"],
            "reviewed_at": now_iso(),
        }
        write_handoff(self.output_dir, department, {"packet": packet, "review": report})
        return report

    def final_gate(self, packets: dict) -> dict:
        reports = {}
        for department, packet in packets.items():
            reports[department] = self.review(department, packet)
        failed = [name for name, report in reports.items() if not report["pass"]]
        result = {
            "pass": not failed,
            "failed_departments": failed,
            "reports": reports,
            "checked_at": now_iso(),
        }
        save_json(self.output_dir / "supervisor_report.json", result)
        return result
