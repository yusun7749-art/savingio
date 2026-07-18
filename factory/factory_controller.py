"""
Savingio Factory Controller
Central entry point for Factory executions.

Rules:
- Existing MASTER LOG files are never overwritten.
- Every execution result passes through logging guard.
"""

from datetime import datetime

try:
    from .master_execution_runner import MasterExecutionRunner
    from .log_execution_guard import LogExecutionGuard
except Exception:
    MasterExecutionRunner = None
    LogExecutionGuard = None


class FactoryController:
    def __init__(self):
        self.runner = MasterExecutionRunner() if MasterExecutionRunner else None
        self.guard = LogExecutionGuard() if LogExecutionGuard else None

    def _execute_task(self, task_name, task_data=None):
        if self.runner:
            return self.runner.execute(
                task_name,
                "SUCCESS",
                [str(task_data or {})],
                "next factory task"
            )
        return {
            "status": "pending",
            "message": "execution runner connection required"
        }

    def execute(self, task_name, task_data=None):
        started = datetime.now().isoformat()

        try:
            if self.guard:
                result = self.guard.run(
                    task_name,
                    self._execute_task,
                    task_name,
                    task_data,
                )
            else:
                result = self._execute_task(task_name, task_data)

            return {
                "task": task_name,
                "started": started,
                "result": result
            }

        except Exception as error:
            return {
                "task": task_name,
                "started": started,
                "status": "failed",
                "error": str(error)
            }


if __name__ == "__main__":
    controller = FactoryController()
    print(controller.execute("TEST"))
