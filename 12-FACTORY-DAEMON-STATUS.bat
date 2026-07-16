@echo off
setlocal
cd /d "%~dp0"
if exist "factory\output\factory_daemon_state.json" (
  type "factory\output\factory_daemon_state.json"
) else (
  echo NO DAEMON STATE FOUND
)
echo.
schtasks /Query /TN "SavingioFactoryDaemon" /FO LIST /V
pause
