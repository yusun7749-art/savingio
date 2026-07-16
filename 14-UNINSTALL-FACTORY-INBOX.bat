@echo off
setlocal
set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\SavingioFactoryInbox.vbs"
if exist "%STARTUP%" del /F /Q "%STARTUP%"
taskkill /F /IM pythonw.exe >nul 2>&1
echo SAVINGIO FACTORY INBOX AUTO-START REMOVED
pause
