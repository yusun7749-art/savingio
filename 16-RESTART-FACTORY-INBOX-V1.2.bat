@echo off
setlocal
cd /d "%~dp0"

echo Stopping old Factory Inbox Runner...
taskkill /F /IM pythonw.exe >nul 2>&1

echo Checking Factory Inbox V1.2...
python -m py_compile factory\factory_inbox_runner.py
if errorlevel 1 (
  echo FACTORY INBOX V1.2 COMPILE FAILED
  pause
  exit /b 1
)

if not exist "factory-output\inbox" mkdir "factory-output\inbox"

set "PYW=%LOCALAPPDATA%\Programs\Python\Python313\pythonw.exe"
if not exist "%PYW%" set "PYW=pythonw.exe"

echo Starting unified Factory Inbox Runner...
start "" /B "%PYW%" -m factory.factory_inbox_runner --root "%CD%"

timeout /t 3 /nobreak >nul

if exist "factory-output\inbox-runner-state.json" (
  echo FACTORY INBOX V1.2 START PASS
  echo State: factory-output\inbox-runner-state.json
  echo Log:   factory-output\inbox-runner.log
  echo Reports: factory-output\inbox
) else (
  echo FACTORY INBOX V1.2 START NOT CONFIRMED
)
pause
