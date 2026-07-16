@echo off
setlocal
cd /d "%~dp0"
if "%~1"=="" (
  echo Usage: RUN-SAVINGIO-FACTORY.bat "topic"
  exit /b 2
)
py -3 -m factory.run_factory --project-root "%CD%" --topic "%~1"
exit /b %ERRORLEVEL%
