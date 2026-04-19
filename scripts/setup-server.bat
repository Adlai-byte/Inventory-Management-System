@echo off
REM ==========================================
REM BASTISTIL Inventory - Server Setup Script
REM ==========================================
REM This script sets up the project on a new server:
REM 1. Checks Node.js and npm
REM 2. Checks MySQL connectivity
REM 3. Installs dependencies
REM 4. Checks/creates .env.local
REM 5. Builds the application
REM ==========================================

setlocal enabledelayedexpansion

echo.
echo ========================================
echo  BASTISTIL Inventory - Server Setup
echo ========================================
echo.

set SCRIPT_DIR=%~dp0
cd /d "%SCRIPT_DIR%.."

REM Check Node.js
echo [1/5] Checking Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed. Please install Node.js 18+ first.
    echo Download from: https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo   Node.js: %NODE_VERSION%

REM Check npm
echo [2/5] Checking npm...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: npm is not available.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo   npm: v%NPM_VERSION%

REM Check MySQL
echo [3/5] Checking MySQL connectivity...
mysql --version >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: MySQL client not found in PATH.
    echo Please ensure MySQL is installed and added to PATH.
    echo You can continue, but database features may not work.
    set /p CONTINUE="Continue anyway? (y/n): "
    if /i not "!CONTINUE!"=="y" (
        exit /b 1
    )
) else (
    echo   MySQL client found.
)

REM Install dependencies
echo [4/5] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies.
    pause
    exit /b 1
)
echo   Dependencies installed successfully.

REM Check .env.local
echo [5/5] Checking environment configuration...
if not exist ".env.local" (
    echo.
    echo Creating .env.local from .env.example...
    copy /Y ".env.example" ".env.local" >nul 2>&1
    if %errorlevel% neq 0 (
        echo ERROR: Failed to create .env.local
        echo Please manually copy .env.example to .env.local
        pause
        exit /b 1
    )
    echo.
    echo ========================================
    echo  IMPORTANT: Configure .env.local
    echo ========================================
    echo Please edit .env.local with your settings:
    echo   - MYSQL_HOST      - Database host
    echo   - MYSQL_USER      - Database username
    echo   - MYSQL_PASSWORD  - Database password
    echo   - MYSQL_DATABASE  - Database name
    echo   - JWT_SECRET      - Secret key (min 32 chars)
    echo.
    set /p CONTINUE="Have you configured .env.local? (y/n): "
    if /i not "!CONTINUE!"=="y" (
        echo Please configure .env.local and run setup again.
        pause
        exit /b 1
    )
) else (
    echo   .env.local found.
)

REM Build the application
echo.
echo Building the application...
call npm run build
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Build failed. Please fix errors and try again.
    pause
    exit /b 1
)
echo   Build successful!

echo.
echo ========================================
echo  Setup Complete!
echo ========================================
echo.
echo Next steps:
echo   1. Set up your MySQL database:
echo        mysql -u root -p ^< sql/inventory_schema.sql
echo   2. (Optional) Seed test data:
echo        node scripts/seed-database.js
echo   3. Start the production server (accessible via LAN):
echo        npm run start:lan
echo.
echo   IMPORTANT: If accessing via LAN without HTTPS, edit .env.local and set:
echo        SESSION_COOKIE_SECURE=false
echo      Otherwise, users will not be able to log in.
echo.
pause