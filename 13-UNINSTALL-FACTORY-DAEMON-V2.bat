@echo off
setlocal
set "TASK_NAME=SavingioFactoryDaemon"
set "STARTUP_VBS=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\SavingioFactoryDaemon.vbs"

schtasks /Delete /TN "%TASK_NAME%" /F >nul 2>&1
if exist "%STARTUP_VBS%" del /q "%STARTUP_VBS%"

echo SAVINGIO FACTORY DAEMON AUTO-START REMOVED
pause
