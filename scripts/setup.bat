@echo off
REM ==========================================
REM BASTISTIL Inventory - Windows Setup Script
REM ==========================================
REM This script prepares the project for deployment:
REM 1. Checks Node.js and npm versions
REM 2. Installs dependencies
REM 3. Checks for .env.local file
REM 4. Builds the Next.js application
REM 5. Offers to seed the database
REM ==========================================

echo.
echo ========================================
echo  BASTISTIL Inventory - Setup
echo ========================================
echo.

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

REM Install dependencies
echo [3/5] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies.
    pause
    exit /b 1
)
echo   Dependencies installed successfully.

REM Check .env.local
echo [4/5] Checking environment configuration...
if not exist ".env.local" (
    echo.
    echo WARNING: .env.local file not found!
    echo Copying .env.example to .env.local...
    copy .env.example .env.local >nul
    echo.
    echo IMPORTANT: Please edit .env.local with your MySQL credentials and JWT_SECRET.
    echo.
    echo Example:
    echo   MYSQL_HOST=localhost
    echo   MYSQL_USER=root
    echo   MYSQL_PASSWORD=your_password
    echo   MYSQL_DATABASE=bmm_db
    echo   JWT_SECRET=a-random-secret-at-least-32-chars-long
    echo.
    set /p CONTINUE="Have you configured .env.local? (y/n): "
    if /i not "%CONTINUE%"=="y" (
        echo Please configure .env.local and run this script again.
        pause
        exit /b 1
    )
) else (
    echo   .env.local found.
)

REM Build the application
echo [5/5] Building the application...
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
echo   1. Ensure MySQL is running
echo   2. Run: mysql -u root -p ^< sql/inventory_schema.sql
echo   3. Run: node scripts/seed-database.js (optional)
echo   4. Start the server: npm run dev:lan
echo.

set /p SEED="Would you like to seed the database now? (y/n): "
if /i "%SEED%"=="y" (
    echo.
    echo Seeding database...
    call node scripts/seed-database.js
    if %errorlevel% neq 0 (
        echo.
        echo WARNING: Database seeding failed.
        echo You can run it manually later with: node scripts/seed-database.js
    )
)

echo.
echo Setup finished. You can now start the server with:
echo   npm run dev:lan
echo.
pause
