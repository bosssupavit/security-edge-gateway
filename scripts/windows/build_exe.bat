@echo off
:: Security Edge Gateway — Build portable Windows .exe
:: Run this on Windows inside the repo root.
:: Output: backend\dist\SecurityEdgeGateway.exe  (+  config.yaml next to it)

pushd "%~dp0..\.."
set "PROJECT_ROOT=%CD%"
popd

echo ============================================================
echo  Security Edge Gateway — Build EXE
echo ============================================================
echo.

:: ── 1. Build React frontend ───────────────────────────────────────────────────
echo [1/3] Building frontend...
cd /d "%PROJECT_ROOT%\frontend"

where npm >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] npm not found. Install Node.js from https://nodejs.org
    pause & exit /b 1
)

call npm install --silent
call npm run build
if %errorLevel% neq 0 (
    echo [ERROR] Frontend build failed.
    pause & exit /b 1
)
echo [OK] Frontend built to backend\static\frontend
echo.

:: ── 2. Ensure PyInstaller is installed ───────────────────────────────────────
echo [2/3] Checking PyInstaller...
cd /d "%PROJECT_ROOT%\backend"

if not exist "venv" (
    echo [ERROR] venv not found. Run setup.bat first.
    pause & exit /b 1
)

venv\Scripts\pip install pyinstaller --quiet
echo [OK] PyInstaller ready
echo.

:: ── 3. Build exe ─────────────────────────────────────────────────────────────
echo [3/3] Building SecurityEdgeGateway.exe ...
venv\Scripts\pyinstaller SecurityEdgeGateway.spec --noconfirm
if %errorLevel% neq 0 (
    echo [ERROR] PyInstaller build failed. Check output above.
    pause & exit /b 1
)

:: ── Copy config.yaml next to the exe (must NOT be bundled inside) ────────────
copy /Y "%PROJECT_ROOT%\backend\config.yaml" "%PROJECT_ROOT%\backend\dist\config.yaml" >nul
echo [OK] config.yaml copied to dist\

echo.
echo ============================================================
echo  Build complete!
echo.
echo  Portable package is in:  backend\dist\
echo    SecurityEdgeGateway.exe   <- run this
echo    config.yaml               <- edit settings here
echo.
echo  The exe bundles:
echo    - FastAPI backend
echo    - React frontend (served at http://localhost:8099)
echo    - All Python dependencies
echo.
echo  NOTE: gateway.db (SQLite) will be created in the same
echo        folder as SecurityEdgeGateway.exe on first run.
echo ============================================================
pause
