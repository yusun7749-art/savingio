@echo off
setlocal
cd /d "%~dp0"
python -m factory.runner_integration_audit
if errorlevel 1 (
  echo.
  echo FACTORY RUNNER AUDIT FAILED
  exit /b 1
)
echo.
echo FACTORY RUNNER AUDIT PASS
exit /b 0
