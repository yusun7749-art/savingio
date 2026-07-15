@echo off
chcp 65001 >nul
setlocal EnableExtensions
cd /d "%~dp0"

echo.
echo ========================================
echo Savingio V2.047 안전 복구
echo ========================================

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo [FAIL] 이 폴더는 Git 저장소가 아닙니다.
  echo savingio-live 폴더 안에서 실행해 주세요.
  pause
  exit /b 1
)

echo [1/6] 임시 캐시 정리
for /d /r %%D in (__pycache__) do @if exist "%%D" rd /s /q "%%D"
if exist ".pytest_cache" rd /s /q ".pytest_cache"
if exist "Savingio-#Uc790#Ub3d9#Ubc30#Ud3ec.bat" del /q "Savingio-#Uc790#Ub3d9#Ubc30#Ud3ec.bat"
if exist "V2.048-BASELINE-HOUSE.md" del /q "V2.048-BASELINE-HOUSE.md"

echo [2/6] Python 캐시를 Git 추적에서 제거
git rm -r --cached --ignore-unmatch factory/__pycache__ >nul 2>&1
git rm -r --cached --ignore-unmatch tests/__pycache__ >nul 2>&1

echo [3/6] 변경 파일 안전 스테이징
git add .gitignore VERSION.json
git add -A -- . ":(exclude)**/__pycache__/**" ":(exclude)**/*.pyc" ":(exclude).pytest_cache/**" ":(exclude)Savingio-#Uc790#Ub3d9#Ubc30#Ud3ec.bat" ":(exclude)V2.048-BASELINE-HOUSE.md"
if errorlevel 1 (
  echo [FAIL] 파일 스테이징에 실패했습니다.
  pause
  exit /b 1
)

echo [4/6] 전체 테스트
python -m pytest -q
if errorlevel 1 (
  echo [FAIL] 테스트가 실패했습니다. 커밋과 PUSH는 실행하지 않았습니다.
  git reset
  pause
  exit /b 1
)

echo [5/6] 커밋
git diff --cached --quiet
if not errorlevel 1 (
  echo [PASS] 새로 커밋할 변경 사항이 없습니다.
) else (
  git commit -m "V2.047 restore stable factory baseline"
  if errorlevel 1 (
    echo [FAIL] 커밋에 실패했습니다. PUSH는 실행하지 않았습니다.
    pause
    exit /b 1
  )
)

echo [6/6] GitHub PUSH
git push
if errorlevel 1 (
  echo [FAIL] PUSH에 실패했습니다. 커밋은 로컬에 안전하게 남아 있습니다.
  pause
  exit /b 1
)

echo.
echo ========================================
echo PASS - Savingio V2.047 복구 완료
echo ========================================
git status --short
pause
