@echo off
setlocal EnableExtensions

set "SCRIPT_DIR=%~dp0"
set "GENERATOR=%SCRIPT_DIR%generate_lifecycle_demo_sql.ps1"

if not exist "%GENERATOR%" (
  echo [ERROR] Lifecycle SQL generator was not found: %GENERATOR%
  exit /b 1
)

if "%~1"=="" (
  for /f "delims=" %%D in ('powershell -NoLogo -NoProfile -Command "(Get-Date).ToString('yyyy-MM-dd')"') do set "ANCHOR_DATE=%%D"
) else (
  set "ANCHOR_DATE=%~1"
)

if not defined ANCHOR_DATE (
  echo [ERROR] Could not determine the current local date.
  exit /b 1
)

echo Regenerating lifecycle demo SQL for %ANCHOR_DATE%...
powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%GENERATOR%" -AnchorDate "%ANCHOR_DATE%"
set "EXIT_CODE=%ERRORLEVEL%"

if not "%EXIT_CODE%"=="0" (
  echo [ERROR] Lifecycle SQL generation failed.
  exit /b %EXIT_CODE%
)

echo Lifecycle SQL files were updated successfully for %ANCHOR_DATE%.
exit /b 0
