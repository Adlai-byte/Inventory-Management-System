@echo off
title BATISTIL Inventory System
REM ==========================================
REM BASTISTIL Inventory - Manual Start
REM ==========================================
REM For first-time setup run scripts\server-init.bat instead.
REM This script is only for manually (re)starting PM2 services.
REM ==========================================

echo ============================================================
echo   BATISTIL MINIMART - Inventory Management System
echo ============================================================
echo.

cd /d "%~dp0"

where pm2 >nul 2>&1
if %errorlevel% neq 0 (
    echo   ERROR: PM2 is not installed or not on PATH.
    echo   Run scripts\server-init.bat once to complete setup.
    pause
    exit /b 1
)

call pm2 resurrect
if %errorlevel% neq 0 (
    echo   No saved PM2 process list. Starting from ecosystem.config.js...
    call pm2 start ecosystem.config.js
    call pm2 save
)

echo.
call pm2 status
echo.
echo   Access: https://localhost:3010
echo   Logs:   pm2 logs
echo.
pause
