"""Savingio Factory git auto commit helper.

Append-only master log workflow helper.
"""

import subprocess


def run_git(command):
    return subprocess.run(command, check=False, capture_output=True, text=True)


def auto_commit(message="Factory automatic log update"):
    run_git(["git", "add", "factory/MASTER_LOG"])
    commit = run_git(["git", "commit", "-m", message])
    if commit.returncode != 0:
        return {"status": "no_commit", "detail": commit.stderr}

    push = run_git(["git", "push"])
    return {
        "status": "pushed" if push.returncode == 0 else "push_failed",
        "commit": commit.stdout,
        "push": push.stdout or push.stderr,
    }
