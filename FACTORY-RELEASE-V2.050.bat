@echo off
cd /d "%~dp0"
python -m factory.release_pipeline --root . --execute
pause
