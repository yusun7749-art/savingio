"""
Savingio Factory Master Runtime Entry

Central entry point for future Factory executions.
Every task should pass through this layer so execution results can be logged.
"""

from factory.task_runner import TaskRunner


class MasterRuntime:
    def __init__(self):
        self.runner = TaskRunner()

    def execute(self, task_name, result):
        return self.runner.run(task_name, result)


if __name__ == "__main__":
    runtime = MasterRuntime()
    print(runtime.execute("RUNTIME_TEST", "MASTER runtime connected"))
