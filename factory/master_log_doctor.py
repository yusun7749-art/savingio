from pathlib import Path
import json

ROOT = Path(__file__).resolve().parent.parent


def check(label, fn):
    try:
        fn()
        print(f"{label:<15} PASS")
        return True
    except Exception as e:
        print(f"{label:<15} FAIL: {e}")
        return False


def run():
    print("MASTER LOG DOCTOR")
    print("=" * 30)

    results = []
    results.append(check("Config", lambda: json.loads((ROOT / "factory/config/master_log_config.json").read_text(encoding="utf-8"))))
    results.append(check("Log Folder", lambda: (ROOT / "factory/MASTER_LOG").mkdir(parents=True, exist_ok=True)))
    results.append(check("Writer", lambda: __import__("factory.log_writer", fromlist=["MasterLogWriter"])))
    results.append(check("Bridge", lambda: __import__("factory.execution_bridge", fromlist=["ExecutionBridge"])))
    results.append(check("Runtime", lambda: __import__("factory.master_runtime_entry", fromlist=["MasterRuntime"])))

    print("=" * 30)
    print("SYSTEM READY" if all(results) else "SYSTEM ERROR")


if __name__ == "__main__":
    run()
