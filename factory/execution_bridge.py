"""
Savingio Factory Execution Bridge

Purpose:
- Connect task execution results to MASTER LOG Writer
- Keep logging append-only
"""

from factory.log_writer import MasterLogWriter


class ExecutionBridge:
    def __init__(self):
        self.writer = MasterLogWriter()

    def record_result(self, task, status, details=None, next_task=None):
        self.writer.append(
            title=task,
            status=status,
            details=details or [],
            next_task=next_task,
        )


if __name__ == "__main__":
    bridge = ExecutionBridge()
    bridge.record_result(
        "Execution Bridge Test",
        "TEST",
        ["LOG WRITER 연결 확인"],
        "Runner 연결"
    )
