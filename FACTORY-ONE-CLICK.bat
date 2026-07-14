@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title Savingio Factory V2.049 Safe Release

where python >nul 2>nul
if errorlevel 1 (
  echo Python was not found.
  echo Install Python 3 and reopen this file.
  pause
  exit /b 1
)

python --version
if errorlevel 1 (
  echo Python check failed.
  pause
  exit /b 1
)

echo.
echo [1/2] Safe preview - only release_scope.json files can be selected.
python -m factory.one_click_release
if errorlevel 1 (
  echo.
  echo Preview failed. Nothing was committed or pushed.
  pause
  exit /b 1
)

echo.
choice /C YN /N /M "Commit the selected release-scope files and push to GitHub? [Y/N]: "
if errorlevel 2 (
  echo Cancelled. Nothing was committed or pushed.
  pause
  exit /b 0
)

echo.
echo [2/2] Running tests, integrity checks, commit, and push...
python -m factory.one_click_release --execute
if errorlevel 1 (
  echo.
  echo Release was blocked or failed.
  echo Read factory\output\one_click_release_report.json
  pause
  exit /b 1
)

echo.
echo PASS - Savingio Factory V2.049 release completed.
pause
exit /b 0
