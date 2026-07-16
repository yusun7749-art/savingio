@echo off
setlocal
taskkill /F /IM pythonw.exe >nul 2>&1
del /F /Q "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\SavingioFactorySilentRunner.vbs" >nul 2>&1
echo SAVINGIO SILENT RUNNER REMOVED
pause
