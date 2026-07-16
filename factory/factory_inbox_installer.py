from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

CREATE_NO_WINDOW = getattr(subprocess, "CREATE_NO_WINDOW", 0)
DETACHED_PROCESS = getattr(subprocess, "DETACHED_PROCESS", 0)


def main() -> int:
    root = Path.cwd().resolve()
    runner = root / "factory" / "factory_inbox_runner.py"
    if not runner.exists():
        print("factory/factory_inbox_runner.py not found")
        return 1

    startup = Path(os.environ["APPDATA"]) / "Microsoft" / "Windows" / "Start Menu" / "Programs" / "Startup"
    startup.mkdir(parents=True, exist_ok=True)
    launcher = startup / "SavingioFactoryInbox.vbs"

    pythonw = Path(sys.executable).with_name("pythonw.exe")
    if not pythonw.exists():
        pythonw = Path(sys.executable)

    command = f'cmd /c cd /d "{root}" && "{pythonw}" -m factory.factory_inbox_runner --root "{root}"'
    escaped = command.replace('"', '""')
    launcher.write_text(
        'Set shell = CreateObject("WScript.Shell")\n'
        f'shell.Run "{escaped}", 0, False\n',
        encoding="utf-8-sig",
    )

    subprocess.Popen(
        [str(pythonw), "-m", "factory.factory_inbox_runner", "--root", str(root)],
        cwd=str(root),
        stdin=subprocess.DEVNULL,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        creationflags=CREATE_NO_WINDOW | DETACHED_PROCESS,
        close_fds=True,
    )

    (root / "factory-inbox").mkdir(exist_ok=True)
    print("SAVINGIO FACTORY INBOX INSTALL PASS")
    print(f"Inbox: {root / 'factory-inbox'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
