@echo off
title BATISTIL Inventory System
echo ============================================================
echo   BATISTIL MINIMART - Inventory Management System
echo ============================================================
echo.
echo  Starting services...
echo.

:: Kill any existing instances
taskkill /F /IM node.exe >nul 2>&1
timeout /t 1 /nobreak >nul

:: Start Next.js dev server in background
start "Next.js Server" /min cmd /c "cd /d "%~dp0" && npm run dev:lan > next-dev.log 2>&1"

:: Wait for Next.js to be ready
echo  Waiting for app server...
timeout /t 5 /nobreak >nul

:: Start Cloudflare tunnel in background
start "Cloudflare Tunnel" /min cmd /c "npx cloudflared tunnel run batistil-inventory > "%~dp0tunnel.log" 2>&1"

echo.
echo ============================================================
echo   APP IS RUNNING
echo ============================================================
echo.
echo   Local:    http://localhost:3000
echo   Internet: https://batistilminimart.uk
echo.
echo   Camera works on mobile via the internet URL.
echo   Keep this window open to keep the app running.
echo ============================================================
echo.
pause
