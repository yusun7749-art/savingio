@echo off
setlocal
cd /d "%~dp0"
set "TOPIC=%~1"
if "%TOPIC%"=="" (
  echo Usage: RUN-FACTORY-CORE.bat "topic"
  exit /b 2
)
python -m factory --project-root . core-run "%TOPIC%" --count 1 --no-resume
exit /b %errorlevel%
