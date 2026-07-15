@echo off
setlocal
cd /d "%~dp0"

echo ============================================================
echo Savingio Factory V2.052 - Python Compatibility and Doctor Gate
echo ============================================================

python -m pytest -q -W error::DeprecationWarning
if errorlevel 1 goto :fail_tests

python -c "from pathlib import Path; from factory.deprecated_api_scan import scan_deprecated_apis; r=scan_deprecated_apis(Path('.')); print('[PASS] Deprecated API scan' if r['pass'] else '[FAIL] Deprecated API scan', r['finding_count']); raise SystemExit(0 if r['pass'] else 1)"
if errorlevel 1 goto :fail_deprecated

python -m factory.one_click_release --root . --execute --message "V2.052 remove Python deprecation warnings and add Doctor gate"
if errorlevel 1 goto :fail_release

python -m factory.cloudflare_deploy_verify --root . --execute
if errorlevel 1 goto :fail_verify

echo ============================================================
echo [PASS] V2.052 release completed with zero deprecation warnings.
echo ============================================================
pause
exit /b 0

:fail_tests
echo [FAIL] Regression or deprecation-warning test failed.
goto :fail

:fail_deprecated
echo [FAIL] Deprecated API scan failed.
goto :fail

:fail_release
echo [FAIL] Safe Git release failed.
goto :fail

:fail_verify
echo [FAIL] Cloudflare and live-site verification failed.
echo Check factory\output\cloudflare_verify_report.json
goto :fail

:fail
echo ============================================================
pause
exit /b 1
