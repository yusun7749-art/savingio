@echo off
setlocal
cd /d "%~dp0"
python -m factory.department_automation --project-root . --resume --topic "resume-placeholder"
exit /b %ERRORLEVEL%
