@echo off
setlocal
cd /d "%~dp0"
py -3 -m factory.article_remodel_apply_runner --project-root .
if errorlevel 1 (
  echo.
  echo ARTICLE REMODEL APPLY FAILED - LIVE FILES ROLLED BACK
  exit /b 1
)
echo.
echo ARTICLE REMODEL APPLY PASS
exit /b 0
