from pathlib import Path
import subprocess

from factory.auto_release import _changed_files, verify_live_site, run_auto_release


def _git(root: Path, *args: str):
    return subprocess.run(["git", *args], cwd=root, capture_output=True, text=True, check=False)


def test_changed_files_excludes_python_cache(tmp_path: Path):
    _git(tmp_path, "init")
    _git(tmp_path, "config", "user.email", "test@example.com")
    _git(tmp_path, "config", "user.name", "test")
    (tmp_path / "keep.txt").write_text("x")
    cache = tmp_path / "factory" / "__pycache__"
    cache.mkdir(parents=True)
    (cache / "x.pyc").write_bytes(b"x")
    files = _changed_files(tmp_path)
    assert "keep.txt" in files
    assert not any("__pycache__" in value or value.endswith(".pyc") for value in files)


def test_live_verification_checks_official_publisher(monkeypatch):
    import factory.auto_release as ar
    def fake(url, timeout=20):
        if url.endswith("/ads.txt"):
            body = "google.com, pub-7605193583747751, DIRECT, f08c47fec0942fa0\n"
        elif url.endswith("/"):
            body = '<script data-ad-client="ca-pub-7605193583747751"></script>'
        else:
            body = "ok"
        return {"pass": True, "status": 200, "url": url, "body": body}
    monkeypatch.setattr(ar, "_http_text", fake)
    result = verify_live_site(attempts=1, interval=0)
    assert result["pass"]


def test_auto_release_blocks_when_integrity_fails(tmp_path: Path, monkeypatch):
    import factory.auto_release as ar
    monkeypatch.setattr(ar, "clean_factory", lambda root: {"pass": True})
    monkeypatch.setattr(ar, "verify_deployment_integrity", lambda root, repair=True: {"pass": False})
    result = run_auto_release(tmp_path)
    assert result["status"] == "blocked"
    assert result["reason"] == "deployment_integrity_failed"
