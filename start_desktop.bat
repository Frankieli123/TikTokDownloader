@echo off
setlocal EnableExtensions

cd /d "%~dp0"

if /i "%~1"=="--check" goto :check

where uv >nul 2>nul
if %errorlevel%==0 goto :use_uv

if exist ".venv\\Scripts\\python.exe" goto :use_venv

echo [ERROR] uv not found and .venv\\Scripts\\python.exe not found.
echo [TIP] In PowerShell, run: uv run python main.py
echo [TIP] If browser cookie import fails, run as Administrator.
pause
exit /b 1

:use_uv
uv run python main.py %*
set "EC=%errorlevel%"
if not "%EC%"=="0" (
  echo.
  echo [ERROR] Program exited with code %EC%
  pause
)
exit /b %EC%

:use_venv
".venv\\Scripts\\python.exe" main.py %*
set "EC=%errorlevel%"
if not "%EC%"=="0" (
  echo.
  echo [ERROR] Program exited with code %EC%
  pause
)
exit /b %EC%

:check
echo OK: start_desktop.bat parsed
where uv >nul 2>nul && echo UV=found || echo UV=missing
if exist ".venv\\Scripts\\python.exe" (echo VENV=found) else (echo VENV=missing)
exit /b 0
