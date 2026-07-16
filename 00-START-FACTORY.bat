@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title Savingio Factory
chcp 65001 >nul

where python >nul 2>nul
if errorlevel 1 (
  echo Python not found.
  pause
  exit /b 1
)

python -X utf8 -m factory.start_factory
set "EXIT_CODE=%ERRORLEVEL%"

echo.
if "%EXIT_CODE%"=="0" (
  echo [PASS] Savingio Factory completed.
) else (
  echo [CHECK] Open factory\output\pm_factory_report.json
)
pause
exit /b %EXIT_CODE%
