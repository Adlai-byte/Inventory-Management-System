@echo off
REM ==========================================
REM BASTISTIL Inventory - Server Init Script
REM ==========================================
REM Run this ONCE on the server PC (as Administrator)
REM after cloning the repository.
REM ==========================================

echo.
echo ============================================================
echo   BATISTIL Inventory - Server Initialization
echo ============================================================
echo.

cd /d "%~dp0.."

REM [1] Check Node.js
echo [1/7] Checking Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo   ERROR: Node.js not found.
    echo   Install from: https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do echo   Node.js %%i

REM [2] Check git
echo [2/7] Checking git...
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo   ERROR: git not found.
    echo   Install from: https://git-scm.com/
    pause
    exit /b 1
)
echo   git OK.

REM [3] Install PM2
echo [3/7] Installing PM2 globally...
call npm install -g pm2
if %errorlevel% neq 0 (
    echo   ERROR: Failed to install PM2.
    pause
    exit /b 1
)
echo   PM2 ready.

REM [4] Install dependencies
echo [4/7] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo   ERROR: npm install failed.
    pause
    exit /b 1
)
echo   Dependencies installed.

REM [5] Setup .env.local  (must happen BEFORE build)
echo [5/7] Checking environment config...
if not exist ".env.local" (
    echo.
    echo   .env.local not found!
    if exist ".env.example" (
        copy .env.example .env.local >nul
        echo   Copied .env.example to .env.local
    )
    echo.
    echo   Edit .env.local now with your MySQL credentials and JWT_SECRET:
    echo     MYSQL_HOST=localhost
    echo     MYSQL_USER=root
    echo     MYSQL_PASSWORD=your_password
    echo     MYSQL_DATABASE=bmm_db
    echo     JWT_SECRET=a-long-random-secret-at-least-32-chars
    echo.
    notepad .env.local
    echo.
    set /p ENVOK="Press Enter once you have saved .env.local..."
) else (
    echo   .env.local found.
)

REM [6] Build
echo [6/7] Building application...
call npm run build
if %errorlevel% neq 0 (
    echo   ERROR: Build failed. Fix the errors above and run this script again.
    pause
    exit /b 1
)
echo   Build complete.

REM [7] HTTPS certificates via mkcert
echo [7/7] Setting up HTTPS certificates with mkcert...
mkcert -version >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo   mkcert not found. Install it first:
    echo.
    echo     Option A (winget):
    echo       winget install FiloSottile.mkcert
    echo.
    echo     Option B (manual):
    echo       https://github.com/FiloSottile/mkcert/releases
    echo       Download mkcert-v*-windows-amd64.exe, rename to mkcert.exe,
    echo       place in C:\Windows\System32 or add to PATH.
    echo.
    echo   After installing mkcert, run these commands once:
    echo     mkcert -install
    echo     mkcert -key-file certs/key.pem -cert-file certs/cert.pem localhost 127.0.0.1 YOUR-LAN-IP
    echo.
    echo   Then start the server:
    echo     pm2 start ecosystem.config.js
    echo     pm2 save
    echo.
    pause
    exit /b 0
)

echo   Installing local CA (a trust dialog may appear)...
call mkcert -install

if not exist "certs" mkdir certs

REM Detect LAN IP (first non-loopback IPv4)
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4" ^| findstr /v "127.0.0.1"') do (
    set RAW_IP=%%a
    goto :ip_found
)
:ip_found
set LAN_IP=%RAW_IP: =%

if "%LAN_IP%"=="" (
    echo   Could not auto-detect LAN IP. Using localhost only.
    call mkcert -key-file certs/key.pem -cert-file certs/cert.pem localhost 127.0.0.1
) else (
    echo   Detected LAN IP: %LAN_IP%
    call mkcert -key-file certs/key.pem -cert-file certs/cert.pem localhost 127.0.0.1 %LAN_IP%
)

if %errorlevel% neq 0 (
    echo   Certificate generation failed. Run manually:
    echo     mkcert -key-file certs/key.pem -cert-file certs/cert.pem localhost 127.0.0.1 YOUR-LAN-IP
    pause
    exit /b 1
)
echo   Certificates saved to certs/

REM Copy mkcert root CA to public/ so the phone can download it
for /f "tokens=*" %%i in ('mkcert -CAROOT') do set MKCERT_CAROOT=%%i
copy "%MKCERT_CAROOT%\rootCA.pem" public\ca.pem >nul
echo   Root CA copied to public\ca.pem

echo.
echo ============================================================
echo   Starting PM2...
echo ============================================================
call pm2 start ecosystem.config.js
call pm2 save

echo.
echo ============================================================
echo   DONE! Server is running.
echo ============================================================
echo.
if not "%LAN_IP%"=="" (
    echo   Access from this PC:  https://localhost:3010
    echo   Access from phone:    https://%LAN_IP%:3010
) else (
    echo   Access from this PC:  https://localhost:3010
)
echo.
echo   On your phone (first time only):
echo     1. Open https://%LAN_IP%:3010/ca.pem in the phone browser
echo        (tap Advanced / Show Details then Proceed/Visit anyway)
echo     2. Install the downloaded certificate:
echo        iPhone: Settings ^> General ^> VPN ^& Device Management ^> BATISTIL CA ^> Install
echo                then Settings ^> General ^> About ^> Certificate Trust Settings ^> toggle ON
echo        Android: tap the file, enter your PIN, name it "BATISTIL CA", type = CA certificate
echo.
echo   Useful PM2 commands:
echo     pm2 status        - check running services
echo     pm2 logs          - view live logs
echo     pm2 restart all   - restart everything
echo.
echo   To update later: run scripts\update.bat
echo.
pause
