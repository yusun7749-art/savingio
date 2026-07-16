@echo off
cd /d "%~dp0"
py -m factory --project-root . preflight
if errorlevel 1 exit /b %errorlevel%
if "%~1"=="" (
  echo Usage: FACTORY-AUTOMATION.bat "topic"
  exit /b 2
)
py -m factory --project-root . run "%~1"
