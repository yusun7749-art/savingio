@echo off
schtasks /End /TN "SavingioFactoryDaemon" >nul 2>&1
schtasks /Delete /TN "SavingioFactoryDaemon" /F
if exist "factory\state\factory_daemon.lock" del /q "factory\state\factory_daemon.lock"
echo SAVINGIO FACTORY DAEMON REMOVED
pause
