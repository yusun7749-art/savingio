@echo off
setlocal EnableExtensions
cd /d "%~dp0"

if not exist "factory\core_factory_runner.py" (
  echo [FAIL] factory\core_factory_runner.py not found.
  exit /b 1
)

echo [1/4] Backing up core_factory_runner.py...
copy /y "factory\core_factory_runner.py" "factory\core_factory_runner.py.before-syntax-fix.bak" >nul
if errorlevel 1 (
  echo [FAIL] Backup failed.
  exit /b 1
)

echo [2/4] Repairing escaped quotes that break Python syntax...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$p = Join-Path (Get-Location) 'factory\core_factory_runner.py';" ^
  "$s = [System.IO.File]::ReadAllText($p);" ^
  "$bs = [char]92; $dq = [char]34;" ^
  "$badName = 's.get(' + $bs + $dq + 'name' + $bs + $dq + ')';" ^
  "$goodName = 's.get(' + $dq + 'name' + $dq + ')';" ^
  "$badPass = 's.get(' + $bs + $dq + 'pass' + $bs + $dq + ')';" ^
  "$goodPass = 's.get(' + $dq + 'pass' + $dq + ')';" ^
  "$fixed = $s.Replace($badName, $goodName).Replace($badPass, $goodPass);" ^
  "if ($fixed -eq $s) { Write-Host '[INFO] Target pattern was already clean or not found.' } else { [System.IO.File]::WriteAllText($p, $fixed, (New-Object System.Text.UTF8Encoding($false))); Write-Host '[PASS] Syntax text repaired.' }"
if errorlevel 1 (
  echo [FAIL] Repair command failed.
  exit /b 1
)

echo [3/4] Verifying Python syntax...
python -m py_compile "factory\core_factory_runner.py"
if errorlevel 1 (
  echo [FAIL] core_factory_runner.py still has a syntax error.
  echo Restore backup: copy /y "factory\core_factory_runner.py.before-syntax-fix.bak" "factory\core_factory_runner.py"
  exit /b 1
)

python -m compileall -q factory
if errorlevel 1 (
  echo [FAIL] Another Python file in factory has a compile error.
  exit /b 1
)

echo [PASS] Python compile completed.

echo [4/4] Starting the existing safe auto deploy...
if not exist "07-AUTO-GIT-DEPLOY.bat" (
  echo [FAIL] 07-AUTO-GIT-DEPLOY.bat not found.
  exit /b 1
)
call "07-AUTO-GIT-DEPLOY.bat"
exit /b %errorlevel%
