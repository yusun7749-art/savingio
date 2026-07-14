from pathlib import Path
import json
import zipfile

from factory.factory_cleaner import clean_factory
from factory.release_packager import build_release_package


def test_cleaner_removes_cache_and_preserves_git(tmp_path: Path):
    (tmp_path / ".git").mkdir()
    cache = tmp_path / "factory" / "__pycache__"
    cache.mkdir(parents=True)
    (cache / "x.pyc").write_bytes(b"cache")
    (tmp_path / "factory" / "output").mkdir(parents=True)
    result = clean_factory(tmp_path)
    assert result["pass"]
    assert not cache.exists()
    assert (tmp_path / ".git").exists()


def test_release_package_excludes_git_and_cache(tmp_path: Path, monkeypatch):
    root = tmp_path / "savingio-live"
    (root / ".git").mkdir(parents=True)
    (root / ".git" / "config").write_text("x")
    (root / "__pycache__").mkdir()
    (root / "__pycache__" / "x.pyc").write_bytes(b"x")
    # Package mechanics are tested independently of the full production gate.
    import factory.release_packager as rp
    monkeypatch.setattr(rp, "clean_factory", lambda p: {"pass": True})
    monkeypatch.setattr(rp, "verify_deployment_integrity", lambda p, repair=True: {"pass": True, "doctor": {"pass": True}, "publisher_lock": {"pass": True}})
    monkeypatch.setattr(rp, "load_identity", lambda p: {"publisher_id": "pub-7605193583747751", "adsense_client": "ca-pub-7605193583747751"})
    (root / "factory" / "output").mkdir(parents=True)
    (root / "index.html").write_text("ok")
    out = tmp_path / "release.zip"
    report = build_release_package(root, out)
    assert report["pass"]
    with zipfile.ZipFile(out) as zf:
        names = zf.namelist()
    assert not any("/.git/" in f"/{name}/" for name in names)
    assert not any("__pycache__" in name or name.endswith(".pyc") for name in names)
