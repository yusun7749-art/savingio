@echo off
setlocal EnableExtensions
cd /d "%~dp0"
chcp 65001 >nul
python -X utf8 -m factory.factory_cli --project-root . brain-expand %*
if errorlevel 1 (
  echo.
  echo LIFE MONEY BRAIN BUILD FAILED
  pause
  exit /b 1
)
echo.
echo LIFE MONEY BRAIN BUILD PASS
echo Topic queue: factory\output\life_money_brain\topics.txt
pause
