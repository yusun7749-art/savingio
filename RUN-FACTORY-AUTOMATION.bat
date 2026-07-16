@echo off
setlocal
cd /d "%~dp0"
python -m factory.pm_console --root . --mode automation --count %1
if errorlevel 1 exit /b 1
endlocal
