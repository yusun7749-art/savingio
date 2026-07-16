@echo off
setlocal
cd /d "%~dp0"
python -m factory.factory_core_automation --root . --count 1
if errorlevel 1 (
  echo FACTORY CORE FAIL
  exit /b 1
)
echo FACTORY CORE PASS
endlocal
