@echo off
:: Security Edge Gateway — Auto-start Setup
:: Registers backend + frontend as Windows Task Scheduler tasks
:: Must run as Administrator

net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] This script must be run as Administrator.
    echo Right-click the file and choose "Run as administrator".
    pause
    exit /b 1
)

:: Resolve absolute path to project root (2 levels up from scripts\windows\)
pushd "%~dp0..\.."
set "PROJECT_ROOT=%CD%"
popd

set "BACKEND_BAT=%PROJECT_ROOT%\scripts\windows\start_backend.bat"
set "FRONTEND_BAT=%PROJECT_ROOT%\scripts\windows\start_frontend.bat"

echo [Setup] Project root: %PROJECT_ROOT%
echo.

:: ── Backend task ─────────────────────────────────────────────────────────────
echo [Setup] Registering task: SecurityGateway-Backend
schtasks /delete /tn "SecurityGateway-Backend" /f >nul 2>&1
schtasks /create ^
  /tn "SecurityGateway-Backend" ^
  /tr "\"%BACKEND_BAT%\"" ^
  /sc onstart ^
  /delay 0000:30 ^
  /ru SYSTEM ^
  /rl highest ^
  /f
if %errorLevel% equ 0 (
    echo [OK] Backend task registered.
) else (
    echo [ERROR] Failed to register backend task.
)

:: ── Frontend task ─────────────────────────────────────────────────────────────
echo.
echo [Setup] Registering task: SecurityGateway-Frontend
schtasks /delete /tn "SecurityGateway-Frontend" /f >nul 2>&1
schtasks /create ^
  /tn "SecurityGateway-Frontend" ^
  /tr "\"%FRONTEND_BAT%\"" ^
  /sc onstart ^
  /delay 0001:00 ^
  /ru SYSTEM ^
  /rl highest ^
  /f
if %errorLevel% equ 0 (
    echo [OK] Frontend task registered.
) else (
    echo [ERROR] Failed to register frontend task.
)

echo.
echo ============================================================
echo  Done. Services will start automatically on next boot.
echo.
echo  To start now without rebooting, run:
echo    schtasks /run /tn "SecurityGateway-Backend"
echo    schtasks /run /tn "SecurityGateway-Frontend"
echo ============================================================
pause
