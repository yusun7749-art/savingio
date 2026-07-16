@echo off
setlocal
cd /d "%~dp0"
if exist "savingio-live" rmdir /s /q "savingio-live"
for /d /r %%D in (__pycache__) do @if exist "%%D" rmdir /s /q "%%D"
if exist ".pytest_cache" rmdir /s /q ".pytest_cache"
python -m compileall -q factory || exit /b 1
python -m pytest -q || exit /b 1
echo PASS
endlocal
