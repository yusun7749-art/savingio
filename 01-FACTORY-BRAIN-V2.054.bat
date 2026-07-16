@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title Savingio Factory V2.054 - Factory Brain

echo ============================================================
echo Savingio Factory V2.054 - TOPIC TO APPROVAL QUEUE
echo ============================================================
set /p "TOPIC=Enter one article topic: "
if "%TOPIC%"=="" (
  echo [FAIL] Topic is required.
  pause
  exit /b 1
)

py -3 -m factory.run factory-brain "%TOPIC%"
if errorlevel 1 python -m factory.run factory-brain "%TOPIC%"
if errorlevel 1 (
  echo [FAIL] Factory Brain stopped. Read factory\output\factory_brain_report.json
  pause
  exit /b 1
)

echo.
echo [PASS] Planning, research, writing, SEO, image brief, QA, CMS draft,
echo        deployment gate, analytics and revenue handoffs completed.
echo [NEXT] Review the Approval Center before publishing.
pause
exit /b 0
