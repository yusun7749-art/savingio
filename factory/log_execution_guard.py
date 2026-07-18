"""
Savingio Factory Log Execution Guard

Purpose:
- Wrap execution calls with mandatory MASTER LOG recording.
- Keep append-only log rule.
- Record both success and failure.
"""

from factory.execution_bridge import ExecutionBridge


class LogExecutionGuard:
    def __init__(self):
        self.bridge = ExecutionBridge()

    def run(self, task_name, function, *args, **kwargs):
        try:
            result = function(*args, **kwargs)
            self.bridge.record_result(
                task=task_name,
                status="SUCCESS",
                details=["Execution completed"],
                next_task="Continue next pipeline step",
            )
            return result
        except Exception as error:
            self.bridge.record_result(
                task=task_name,
                status="FAILED",
                details=[str(error)],
                next_task="Review error and retry",
            )
            raise


if __name__ == "__main__":
    print("Log Execution Guard ready")
