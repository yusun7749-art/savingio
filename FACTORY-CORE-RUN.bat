@echo off
cd /d "%~dp0"
python -m factory.pm_console --mode factory-core --count 20
if errorlevel 1 exit /b 1
exit /b 0
