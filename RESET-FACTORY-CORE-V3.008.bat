@echo off
setlocal
cd /d "%~dp0"
py -3 -m factory.core_automation_cli --root "%CD%" --reset --count 1 %*
endlocal
