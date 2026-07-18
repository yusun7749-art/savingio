"""
Savingio Factory Master Execution Runner

Purpose:
- Central entry point for factory tasks
- Sends every execution result to MASTER LOG pipeline
"""

from factory.execution_bridge import ExecutionBridge


class MasterExecutionRunner:
    def __init__(self):
        self.bridge = ExecutionBridge()

    def execute(self, task_name, status, details=None, next_task=None):
        self.bridge.record_result(
            task=task_name,
            status=status,
            details=details or [],
            next_task=next_task,
        )

        return {
            "task": task_name,
            "status": status,
            "logged": True,
        }


if __name__ == "__main__":
    runner = MasterExecutionRunner()
    print(
        runner.execute(
            "MASTER EXECUTION RUNNER TEST",
            "TEST",
            ["Task execution connected to MASTER LOG"],
            "Connect production runners",
        )
    )
