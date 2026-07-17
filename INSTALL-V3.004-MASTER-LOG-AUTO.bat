@echo off
setlocal
cd /d "%~dp0"
if not exist factory (
  echo ERROR: Put this ZIP contents inside savingio-live root.
  pause
  exit /b 2
)
copy /Y "V3.004-PATCH\factory\master_log_runtime.py" "factory\master_log_runtime.py" >nul || goto :fail
if not exist "factory\tests" mkdir "factory\tests"
copy /Y "V3.004-PATCH\factory\tests\test_master_log_runtime.py" "factory\tests\test_master_log_runtime.py" >nul || goto :fail
copy /Y "V3.004-PATCH\install_master_log_auto.py" "install_master_log_auto.py" >nul || goto :fail
python install_master_log_auto.py || goto :fail
python -m pytest factory/tests/test_master_log_runtime.py factory/tests/test_command_factory_v3.py -q || goto :fail
python -m compileall -q factory || goto :fail
python -c "from pathlib import Path; from factory.master_log_runtime import record_execution; record_execution(Path('.'),task='V3.004 MASTER LOG 자동 누적 검증',status='VERIFIED',changed_files=['factory/master_log_runtime.py','factory/command_watcher.py','factory/tests/test_master_log_runtime.py'],tests={'pass':True,'commands':['pytest','compileall']},next_step='Git commit/push')"
del /q install_master_log_auto.py >nul 2>&1
echo.
echo PASS: V3.004 MASTER LOG AUTO
echo Logs: factory\MASTER_LOG\
echo.
echo git add .
echo git commit -m "V3.004 add automatic master log runtime"
echo git push
pause
exit /b 0
:fail
echo FAIL: Installation or tests failed.
echo Backup: factory\command_watcher.py.before-v3.004.bak
pause
exit /b 1
