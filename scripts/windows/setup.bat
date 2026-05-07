@echo off
:: Security Edge Gateway — First-time Setup for Windows
:: Run this once after cloning the repository

pushd "%~dp0..\.."
set "PROJECT_ROOT=%CD%"
popd

echo ============================================================
echo  Security Edge Gateway — Windows Setup
echo ============================================================
echo.

:: ── Check Python ─────────────────────────────────────────────────────────────
where python >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] Python not found. Install Python 3.11+ from https://python.org
    echo         Make sure to check "Add Python to PATH" during install.
    pause
    exit /b 1
)

python --version
echo.

:: ── Backend: create venv + install deps ──────────────────────────────────────
cd /d "%PROJECT_ROOT%\backend"

if not exist "venv" (
    echo [Backend] Creating virtual environment...
    python -m venv venv
) else (
    echo [Backend] venv already exists, skipping.
)

echo [Backend] Installing Python packages...
venv\Scripts\pip install -r requirements.txt --quiet

:: ── Backend: migrate DB ───────────────────────────────────────────────────────
echo [Backend] Running database migration...
venv\Scripts\python.exe migrate.py

:: ── Frontend: install npm packages + build ────────────────────────────────────
cd /d "%PROJECT_ROOT%\frontend"

where npm >nul 2>&1
if %errorLevel% neq 0 (
    echo [WARNING] npm not found. Install Node.js from https://nodejs.org
    echo           Frontend will not be set up.
    goto :done
)

echo [Frontend] Installing npm packages...
npm install

echo [Frontend] Building frontend...
npm run build

:done
echo.
echo ============================================================
echo  Setup complete!
echo.
echo  Next steps:
echo    1. Edit backend\config.yaml with your HikCentral / ZKBio settings
echo    2. Run scripts\windows\setup_autostart.bat  (as Administrator)
echo       to register auto-start on Windows boot
echo    3. Or run manually:
echo       scripts\windows\start_backend.bat
echo       scripts\windows\start_frontend.bat
echo.
echo  Backend API : http://localhost:8080
echo  Frontend    : http://localhost:4173
echo  API Docs    : http://localhost:8080/docs
echo ============================================================
pause
