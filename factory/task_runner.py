"""
Savingio Factory Task Runner

Central execution entry point.
Runs a task and sends the result to Execution Bridge.
"""

from datetime import datetime

try:
    from execution_bridge import ExecutionBridge
except ImportError:
    ExecutionBridge = None


class TaskRunner:
    def __init__(self):
        self.bridge = ExecutionBridge() if ExecutionBridge else None

    def run(self, task_name, task_result):
        payload = {
            "time": datetime.now().isoformat(),
            "task": task_name,
            "result": task_result,
        }

        if self.bridge:
            self.bridge.record(payload)

        return payload


if __name__ == "__main__":
    runner = TaskRunner()
    print(runner.run("TEST", "Task Runner initialized"))
