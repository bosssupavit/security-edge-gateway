@echo off
:: Security Edge Gateway — Frontend Startup Script
:: Builds (if needed) and starts the React frontend via npm preview

cd /d "%~dp0..\..\frontend"

:: Check node_modules
if not exist "node_modules" (
    echo [Frontend] Installing npm packages...
    npm install
)

:: Build if dist doesn't exist
if not exist "dist" (
    echo [Frontend] Building frontend...
    npm run build
)

echo [Frontend] Starting preview server...
npm run preview -- --host 0.0.0.0
