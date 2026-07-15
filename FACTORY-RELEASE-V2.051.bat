@echo off
setlocal
cd /d "%~dp0"

echo ============================================================
echo Savingio Factory V2.051 - Release and Cloudflare Verify
echo ============================================================

python -m pytest -q
if errorlevel 1 goto :fail_tests

python -m factory.one_click_release --root . --execute --message "V2.051 fix Cloudflare verification fallback"
if errorlevel 1 goto :fail_release

python -m factory.cloudflare_deploy_verify --root . --execute
if errorlevel 1 goto :fail_verify

echo ============================================================
echo [PASS] V2.051 release and live-site verification completed.
echo ============================================================
pause
exit /b 0

:fail_tests
echo [FAIL] Regression tests failed.
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
