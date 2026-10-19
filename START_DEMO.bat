@echo off
setlocal
cd /d "%~dp0"
if not defined SINBUVI_PHP set "SINBUVI_PHP=%~dp0..\..\php\php.exe"
if not exist "%SINBUVI_PHP%" (
  echo PHP was not found. Put this folder inside XAMPP htdocs or set SINBUVI_PHP.
  if /I "%~1"=="--check" exit /b 1
  pause
  exit /b 1
)
"%SINBUVI_PHP%" "_codex\demo-preflight.php"
if errorlevel 1 (
  if /I "%~1"=="--check" exit /b 1
  pause
  exit /b 1
)
if /I "%~1"=="--check" exit /b 0
for /f "delims=" %%U in ('""%SINBUVI_PHP%" "_codex\demo-preflight.php" --url"') do set "SINBUVI_DEMO_URL=%%U"
if not defined SINBUVI_DEMO_URL (
  echo Unable to read the configured website URL. Open the address in config/local.php manually.
  exit /b 1
)
if defined SINBUVI_DEMO_URL start "" "%SINBUVI_DEMO_URL%"
