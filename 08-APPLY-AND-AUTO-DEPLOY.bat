@echo off
setlocal
cd /d "%~dp0"
set PYTHONUTF8=1

if not exist "06-APPLY-ALL-ARTICLE-REMODEL.bat" (
  echo APPLY ENGINE NOT FOUND: 06-APPLY-ALL-ARTICLE-REMODEL.bat
  pause
  exit /b 1
)

call "06-APPLY-ALL-ARTICLE-REMODEL.bat"
if errorlevel 1 (
  echo.
  echo ARTICLE REMODEL APPLY FAILED - DEPLOY BLOCKED
  pause
  exit /b 1
)

call "07-AUTO-GIT-DEPLOY.bat"
if errorlevel 1 (
  echo.
  echo AUTO DEPLOY FAILED
  pause
  exit /b 1
)

echo.
echo SAVINGIO APPLY AND AUTO DEPLOY PASS
echo https://savingio.com
pause
