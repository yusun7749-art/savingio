@echo off
chcp 65001 > nul
cd /d "%~dp0"
echo.
echo ========================================
echo   Savingio Factory 자동 배포 시작
echo ========================================
echo.
python -m factory.run auto-release --execute
if errorlevel 1 (
  echo.
  echo [FAIL] 자동 배포가 안전하게 중단되었습니다.
  echo factory\output\auto_release_report.json 파일을 확인하세요.
) else (
  echo.
  echo [PASS] GitHub Push와 실제 사이트 검증이 완료되었습니다.
)
echo.
pause
