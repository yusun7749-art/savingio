@echo off
setlocal
cd /d "%~dp0"

echo Stopping old Factory Inbox Runner...
taskkill /F /IM pythonw.exe >nul 2>&1

echo Checking V1.1 runner...
python -m py_compile factory\factory_inbox_runner.py
if errorlevel 1 (
  echo FACTORY INBOX V1.1 COMPILE FAILED
  pause
  exit /b 1
)

set "PYW=%LOCALAPPDATA%\Programs\Python\Python313\pythonw.exe"
if not exist "%PYW%" set "PYW=pythonw.exe"

echo Starting Factory Inbox Runner V1.1...
start "" /B "%PYW%" -m factory.factory_inbox_runner --root "%CD%"

timeout /t 3 /nobreak >nul

if exist "factory\output\inbox_runner_state.json" (
  echo FACTORY INBOX V1.1 START PASS
  echo State: factory\output\inbox_runner_state.json
  echo Log:   factory\output\inbox_runner.log
) else (
  echo FACTORY INBOX V1.1 START NOT CONFIRMED
)
pause
