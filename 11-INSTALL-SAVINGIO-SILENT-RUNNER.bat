@echo off
setlocal
cd /d "%~dp0"
set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "VBS=%STARTUP%\SavingioFactorySilentRunner.vbs"
if not exist "%STARTUP%" mkdir "%STARTUP%"
> "%VBS%" echo Set sh = CreateObject("WScript.Shell")
>> "%VBS%" echo sh.Run "cmd /c cd /d ""%CD%"" ^&^& set PYTHONUTF8=1 ^&^& pythonw -m factory.factory_daemon --root ""%CD%""", 0, False
start "" /b wscript.exe "%VBS%"
echo SAVINGIO SILENT RUNNER INSTALL PASS
echo No command window should flash during monitoring or Git checks.
pause
