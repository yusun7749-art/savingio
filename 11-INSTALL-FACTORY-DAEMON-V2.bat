@echo off
setlocal
cd /d "%~dp0"
set "PYTHON_EXE=python"

where py >nul 2>&1
if not errorlevel 1 set "PYTHON_EXE=py -3"

echo.
echo Savingio Factory Daemon Installer V2
echo Task Scheduler failure automatically falls back to the user Startup folder.
echo.

%PYTHON_EXE% -m factory.factory_daemon_installer
set "RESULT=%ERRORLEVEL%"

echo.
if "%RESULT%"=="0" (
  echo SAVINGIO FACTORY DAEMON INSTALL PASS
  echo The daemon is installed and running.
) else if "%RESULT%"=="2" (
  echo INSTALL COMPLETE, BUT RUNNING STATE WAS NOT CONFIRMED.
  echo Check factory\output\factory_daemon_install_report.json
) else (
  echo SAVINGIO FACTORY DAEMON INSTALL FAILED
  echo Check factory\output\factory_daemon_install_report.json
)

echo.
echo Report: factory\output\factory_daemon_install_report.json
pause
exit /b %RESULT%
