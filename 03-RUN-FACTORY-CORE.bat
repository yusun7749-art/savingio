@echo off
setlocal
cd /d "%~dp0"
if "%~1"=="" (
  echo Usage: 03-RUN-FACTORY-CORE.bat "topic" ["topic 2" ...]
  exit /b 2
)
python -m factory --project-root "%CD%" core-run %*
exit /b %ERRORLEVEL%
