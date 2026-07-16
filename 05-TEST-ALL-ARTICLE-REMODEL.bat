@echo off
setlocal
cd /d "%~dp0"
py -3 -m factory.article_remodel_test_runner --project-root .
if errorlevel 1 (
  echo.
  echo ARTICLE REMODEL TEST FAILED
  exit /b 1
)
echo.
echo ARTICLE REMODEL TEST PASS
exit /b 0
