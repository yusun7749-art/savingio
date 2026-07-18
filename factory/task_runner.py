"""
Savingio Factory Task Runner

Central execution entry point.
Runs a task and sends the result to Execution Bridge.
"""

from datetime import datetime

from factory.execution_bridge import ExecutionBridge


class TaskRunner:
    def __init__(self):
        self.bridge = ExecutionBridge()

    def run(self, task_name, task_result):
        payload = {
            "time": datetime.now().isoformat(),
            "task": task_name,
            "result": task_result,
        }

        self.bridge.record_result(
            task=task_name,
            status="COMPLETED",
            details=[task_result],
            next_task="Continue next task",
        )

        return payload


if __name__ == "__main__":
    runner = TaskRunner()
    print(runner.run("TEST", "Task Runner initialized"))
