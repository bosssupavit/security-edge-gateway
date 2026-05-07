@echo off
:: Security Edge Gateway — Remove Auto-start Tasks

net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] This script must be run as Administrator.
    pause
    exit /b 1
)

echo [Remove] Deleting scheduled tasks...

schtasks /delete /tn "SecurityGateway-Backend" /f
schtasks /delete /tn "SecurityGateway-Frontend" /f

echo.
echo [Done] Auto-start tasks removed.
pause
