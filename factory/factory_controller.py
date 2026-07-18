"""
Savingio Factory Controller
Central entry point for future Factory executions.

Rules:
- Existing MASTER LOG files are never overwritten.
- Every execution result must pass through the logging bridge.
"""

from datetime import datetime

try:
    from .master_execution_runner import MasterExecutionRunner
except Exception:
    MasterExecutionRunner = None


class FactoryController:
    def __init__(self):
        self.runner = MasterExecutionRunner() if MasterExecutionRunner else None

    def execute(self, task_name, task_data=None):
        started = datetime.now().isoformat()

        try:
            if self.runner:
                result = self.runner.execute(
                    task_name,
                    "SUCCESS",
                    [str(task_data or {})],
                    "next factory task"
                )
            else:
                result = {
                    "status": "pending",
                    "message": "execution runner connection required"
                }

            return {
                "task": task_name,
                "started": started,
                "result": result
            }

        except Exception as error:
            if self.runner:
                self.runner.execute(
                    task_name,
                    "FAILED",
                    [str(error)],
                    "repair execution flow"
                )

            return {
                "task": task_name,
                "started": started,
                "status": "failed",
                "error": str(error)
            }


if __name__ == "__main__":
    controller = FactoryController()
    print(controller.execute("TEST"))
