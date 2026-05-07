@echo off
:: Security Edge Gateway — Backend Startup Script
:: Starts FastAPI + Modbus TCP server

cd /d "%~dp0..\..\backend"

:: Check if venv exists
if not exist "venv\Scripts\python.exe" (
    echo [ERROR] venv not found. Please run setup.bat first.
    pause
    exit /b 1
)

:: Check if config.yaml exists
if not exist "config.yaml" (
    echo [ERROR] config.yaml not found.
    pause
    exit /b 1
)

echo [Gateway] Starting backend...
venv\Scripts\python.exe run.py
