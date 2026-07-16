@echo off
setlocal
cd /d "%~dp0"
py -3 -m factory.core_automation_cli --root "%CD%" %*
if errorlevel 1 (
  echo.
  echo FACTORY CORE FAILED
  exit /b 1
)
echo.
echo FACTORY CORE PASS
endlocal
