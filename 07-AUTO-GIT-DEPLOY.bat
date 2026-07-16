@echo off
setlocal
cd /d "%~dp0"
set PYTHONUTF8=1
python -m factory.auto_git_deploy --root . --execute
if errorlevel 1 (
  echo.
  echo AUTO GIT DEPLOY FAILED
  pause
  exit /b 1
)
echo.
echo AUTO GIT DEPLOY PASS
echo Savingio: https://savingio.com
pause
