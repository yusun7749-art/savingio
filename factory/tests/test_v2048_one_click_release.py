from pathlib import Path

from factory.one_click_release import GitChange, _is_volatile, _parse_porcelain_z


def test_volatile_paths_are_excluded():
    assert _is_volatile("factory/__pycache__/doctor.cpython-313.pyc")
    assert _is_volatile(".pytest_cache/v/cache/nodeids")
    assert _is_volatile("factory/output/debug.log")
    assert not _is_volatile("factory/doctor.py")
    assert not _is_volatile("articles/example.html")


def test_parse_porcelain_z_regular_and_untracked():
    raw = b" M factory/doctor.py\0?? FACTORY-ONE-CLICK.bat\0"
    changes = _parse_porcelain_z(raw)
    assert changes == [
        GitChange(status=" M", path="factory/doctor.py"),
        GitChange(status="??", path="FACTORY-ONE-CLICK.bat"),
    ]


def test_parse_porcelain_z_rename_uses_destination():
    raw = b"R  old.txt\0new.txt\0"
    changes = _parse_porcelain_z(raw)
    assert changes == [GitChange(status="R ", path="new.txt")]


def test_deleted_status_is_detected():
    assert GitChange(status=" D", path="old.txt").deleted
    assert not GitChange(status=" M", path="keep.txt").deleted
