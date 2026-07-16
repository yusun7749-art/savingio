@echo off
cd /d "%~dp0"
python -m factory.run house-repair
if errorlevel 1 exit /b %errorlevel%
python -m factory.run house-integrity
