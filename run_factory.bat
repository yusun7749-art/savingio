@echo off
setlocal
cd /d "%~dp0"
py -3 -m factory.run %*
if errorlevel 1 python -m factory.run %*
endlocal
