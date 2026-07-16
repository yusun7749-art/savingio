@echo off
setlocal
cd /d "%~dp0"
set "PY=python"
where py >nul 2>&1
if not errorlevel 1 set "PY=py -3"

%PY% -m py_compile factory\factory_inbox_runner.py factory\factory_inbox_installer.py
if errorlevel 1 (
  echo FACTORY INBOX COMPILE FAILED
  pause
  exit /b 1
)

%PY% -m factory.factory_inbox_installer
if errorlevel 1 (
  echo FACTORY INBOX INSTALL FAILED
  pause
  exit /b 1
)

echo.
echo From now on, place patch ZIP files only in:
echo %CD%\factory-inbox
echo.
echo The Factory will apply, test, commit, push, and archive them automatically.
pause
