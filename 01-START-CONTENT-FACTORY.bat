@echo off
setlocal EnableExtensions DisableDelayedExpansion
cd /d "%~dp0"
chcp 65001 >nul
set PYTHONUTF8=1
set "TOPICS="
set /p "TOPICS=TOPIC > "
if not defined TOPICS exit /b 1
python -X utf8 -m factory.factory_cli --project-root . run "%TOPICS%" --publish --overwrite --no-stage
if errorlevel 1 exit /b 1
python -X utf8 -m factory.auto_git_deploy --root . --execute
exit /b %errorlevel%
