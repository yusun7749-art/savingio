@echo off
setlocal
cd /d "%~dp0"
title Savingio Factory - ONE CLICK START

echo ============================================================
echo Savingio Factory - ONE CLICK START
echo Always run this same file for every version.
echo ============================================================

python -m factory.start_factory --root .
set "EXIT_CODE=%ERRORLEVEL%"

echo ============================================================
if "%EXIT_CODE%"=="0" (
  echo [PASS] Factory release, Git push, and live verification completed.
) else (
  echo [FAIL] Factory stopped safely. Check factory\output\start_factory_report.json
)
echo ============================================================
pause
exit /b %EXIT_CODE%
