@echo off
setlocal
cd /d "%~dp0"
title Savingio Command Factory V3
echo ============================================================
echo Savingio Command Factory V3
echo Watching: factory-command\inbox
echo ============================================================
python -m factory.command_watcher --root . --poll 1
set "EXIT_CODE=%ERRORLEVEL%"
echo.
echo Command Factory stopped. Exit code: %EXIT_CODE%
pause
exit /b %EXIT_CODE%
