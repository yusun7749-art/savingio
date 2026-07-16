@echo off
setlocal

echo [1/4] Stopping Savingio Factory Daemon...
taskkill /F /IM pythonw.exe >nul 2>&1
taskkill /F /IM python.exe >nul 2>&1

echo [2/4] Removing Startup launcher...
set "STARTUP_VBS=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\SavingioFactoryDaemon.vbs"
if exist "%STARTUP_VBS%" del /F /Q "%STARTUP_VBS%"

echo [3/4] Removing scheduled task if present...
schtasks /Delete /TN "SavingioFactoryDaemon" /F >nul 2>&1

echo [4/4] Done.
echo Savingio Factory Daemon has been stopped and auto-start disabled.
pause
