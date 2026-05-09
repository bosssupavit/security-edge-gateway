@echo off
:: Security Edge Gateway — Auto-Restart Launcher
:: Place this file next to SecurityEdgeGateway.exe and config.yaml
:: Double-click to run — restarts automatically in 5 seconds after a crash

setlocal enabledelayedexpansion

set "SCRIPT_DIR=%~dp0"
set "EXE=%SCRIPT_DIR%SecurityEdgeGateway.exe"
set "LOG_FILE=%SCRIPT_DIR%gateway-crash.log"
set "RESTART_DELAY_SEC=5"

if not exist "%EXE%" (
    echo [ERROR] SecurityEdgeGateway.exe not found in %SCRIPT_DIR%
    pause
    exit /b 1
)

title Security Edge Gateway

set /a RESTART_COUNT=0

:LOOP
for /f "tokens=*" %%T in ('powershell -NoProfile -Command "Get-Date -Format \"yyyy-MM-dd HH:mm:ss\""') do set "TS=%%T"
echo [%TS%] Starting Security Edge Gateway (attempt #%RESTART_COUNT%)...
echo [%TS%] START restart=#%RESTART_COUNT% >> "%LOG_FILE%"

cd /d "%SCRIPT_DIR%"
"%EXE%"
set "EXIT_CODE=%errorLevel%"

for /f "tokens=*" %%T in ('powershell -NoProfile -Command "Get-Date -Format \"yyyy-MM-dd HH:mm:ss\""') do set "TS=%%T"

if %EXIT_CODE% equ 0 (
    echo [%TS%] Stopped cleanly (exit code 0) — not restarting
    echo [%TS%] EXIT code=0 (clean stop) >> "%LOG_FILE%"
    goto :END
)

set /a RESTART_COUNT+=1
echo [%TS%] Crashed (exit code %EXIT_CODE%) — restarting in %RESTART_DELAY_SEC% seconds...
echo [%TS%] CRASH code=%EXIT_CODE% restart=#%RESTART_COUNT% >> "%LOG_FILE%"

ping -n %RESTART_DELAY_SEC% 127.0.0.1 >nul 2>&1
goto :LOOP

:END
echo.
echo Gateway has stopped.
pause
endlocal
