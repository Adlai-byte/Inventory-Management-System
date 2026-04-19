@echo off
REM ==========================================
REM BASTISTIL Inventory - Update Script
REM ==========================================
REM Run this to pull latest code and restart.
REM ==========================================

echo.
echo ============================================================
echo   BATISTIL Inventory - Updating
echo ============================================================
echo.

cd /d "%~dp0.."

echo [1/4] Pulling latest code...
git pull
if %errorlevel% neq 0 (
    echo   ERROR: git pull failed. Check your internet connection
    echo   or run: git status
    pause
    exit /b 1
)
echo   Code updated.

echo [2/4] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo   ERROR: npm install failed.
    pause
    exit /b 1
)

echo [3/4] Building application...
call npm run build
if %errorlevel% neq 0 (
    echo   ERROR: Build failed.
    pause
    exit /b 1
)
echo   Build complete.

echo [4/4] Restarting PM2 services...
call pm2 reload ecosystem.config.js --update-env
if %errorlevel% neq 0 (
    echo   Reload failed, trying restart...
    call pm2 restart ecosystem.config.js
)
call pm2 save

echo.
echo ============================================================
echo   Update complete!
echo ============================================================
echo.
call pm2 status
echo.
pause
