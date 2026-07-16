@echo off
setlocal
cd /d "%~dp0"
set "TASK_NAME=SavingioFactoryDaemon"
set "PYTHON_EXE=python"

%PYTHON_EXE% -c "import factory.factory_daemon" >nul 2>&1
if errorlevel 1 (
  echo FACTORY DAEMON MODULE CHECK FAILED
  pause
  exit /b 1
)

schtasks /Create /TN "%TASK_NAME%" /SC ONLOGON /RL LIMITED /F /TR "cmd /c cd /d \"%CD%\" ^& set PYTHONUTF8=1 ^& python -m factory.factory_daemon --root ." >nul
if errorlevel 1 (
  echo WINDOWS STARTUP TASK INSTALL FAILED
  echo Run this file once with Administrator permission if Windows blocks Task Scheduler.
  pause
  exit /b 1
)

schtasks /Run /TN "%TASK_NAME%" >nul
if errorlevel 1 (
  echo TASK INSTALLED, BUT FIRST START FAILED
  pause
  exit /b 1
)

echo.
echo SAVINGIO FACTORY DAEMON INSTALLED AND STARTED
echo It will start automatically when Windows signs in.
echo Watched release scope: index.html only
echo State: factory\output\factory_daemon_state.json
exit /b 0
