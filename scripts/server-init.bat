@echo off
setlocal enabledelayedexpansion
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

REM [1] Check Node.js (v20+)
echo [1/10] Checking Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo   ERROR: Node.js not found.
    echo   Install Node.js 20 LTS or newer from: https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=1 delims=." %%a in ('node -p "process.versions.node"') do set NODE_MAJOR=%%a
for /f "tokens=*" %%i in ('node --version') do echo   Node.js %%i
if !NODE_MAJOR! LSS 20 (
    echo   ERROR: Node.js 20 or newer is required ^(Next.js 16^).
    echo   Upgrade from: https://nodejs.org/
    pause
    exit /b 1
)

REM [2] Check git
echo [2/10] Checking git...
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo   ERROR: git not found.
    echo   Install from: https://git-scm.com/
    pause
    exit /b 1
)
echo   git OK.

REM [3] Check MySQL service
echo [3/10] Checking MySQL service...
for /f "tokens=*" %%i in ('powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0check-mysql.ps1"') do set MYSQL_STATUS=%%i
if not "!MYSQL_STATUS!"=="OK" (
    echo   WARNING: No running MySQL service detected.
    echo   Install MySQL 8+ and start the service before continuing:
    echo     https://dev.mysql.com/downloads/installer/
    echo.
    set /p MYSQLSKIP="Continue anyway? (y/N): "
    if /i not "!MYSQLSKIP!"=="y" exit /b 1
) else (
    echo   MySQL service is running.
)

REM [4] Install PM2
echo [4/10] Installing PM2 globally...
call npm install -g pm2
if %errorlevel% neq 0 (
    echo   ERROR: Failed to install PM2.
    pause
    exit /b 1
)
echo   PM2 ready.

REM [5] Install dependencies
echo [5/10] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo   ERROR: npm install failed.
    pause
    exit /b 1
)
echo   Dependencies installed.

REM [6] Setup .env.local (JWT auto-gen + production defaults, BEFORE build)
echo [6/10] Checking environment config...
if not exist ".env.local" (
    if exist ".env.example" (
        copy .env.example .env.local >nul
        echo   Copied .env.example to .env.local
    ) else (
        echo   ERROR: .env.example not found.
        pause
        exit /b 1
    )

    REM Auto-generate JWT_SECRET
    for /f "tokens=*" %%i in ('powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0gen-jwt-secret.ps1"') do set JWT_NEW=%%i
    if not "!JWT_NEW!"=="" (
        powershell -NoProfile -Command "(Get-Content .env.local) -replace '^JWT_SECRET=.*', 'JWT_SECRET=!JWT_NEW!' | Set-Content .env.local"
        echo   JWT_SECRET auto-generated.
    )

    echo.
    echo   Opening .env.local for MySQL credentials...
    echo   Set at minimum: MYSQL_PASSWORD (and MYSQL_USER if not root).
    echo.
    notepad .env.local
    set /p ENVOK="Press Enter once you have saved .env.local..."
) else (
    echo   .env.local already exists. Leaving it untouched.
)

REM [7] Build
echo [7/10] Building application...
call npm run build
if %errorlevel% neq 0 (
    echo   ERROR: Build failed. Fix the errors above and run this script again.
    pause
    exit /b 1
)
echo   Build complete.

REM [8] HTTPS certificates via mkcert
echo [8/10] Setting up HTTPS certificates with mkcert...
mkcert -version >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo   mkcert not found. Install it first:
    echo     Option A (winget): winget install FiloSottile.mkcert
    echo     Option B (manual): https://github.com/FiloSottile/mkcert/releases
    echo.
    echo   After installing mkcert, re-run this script.
    pause
    exit /b 1
)

echo   Installing local CA (a trust dialog may appear)...
call mkcert -install

if not exist "certs" mkdir certs

for /f "tokens=*" %%i in ('powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0detect-lan-ip.ps1"') do set LAN_IP=%%i

if "!LAN_IP!"=="" (
    echo   Could not auto-detect LAN IP.
    set /p LAN_IP="Enter the server PC's LAN IP manually (e.g. 192.168.0.101): "
) else (
    echo   Detected LAN IP: !LAN_IP!
    set /p CONFIRM_IP="Use this IP? (Enter to confirm, or type a different IP): "
    if not "!CONFIRM_IP!"=="" set LAN_IP=!CONFIRM_IP!
)

if "!LAN_IP!"=="" (
    echo   No LAN IP provided. Generating cert for localhost only.
    call mkcert -key-file certs/key.pem -cert-file certs/cert.pem localhost 127.0.0.1
) else (
    echo   Generating certificate for localhost, 127.0.0.1, !LAN_IP!...
    call mkcert -key-file certs/key.pem -cert-file certs/cert.pem localhost 127.0.0.1 !LAN_IP!
)

if %errorlevel% neq 0 (
    echo   Certificate generation failed. Run manually:
    echo     mkcert -key-file certs/key.pem -cert-file certs/cert.pem localhost 127.0.0.1 YOUR-LAN-IP
    pause
    exit /b 1
)
echo   Certificates saved to certs/

for /f "tokens=*" %%i in ('mkcert -CAROOT') do set MKCERT_CAROOT=%%i
copy "!MKCERT_CAROOT!\rootCA.pem" public\ca.pem >nul
echo   Root CA copied to public\ca.pem

REM [9] Open Windows Firewall port 3010
echo [9/10] Opening Windows Firewall (port 3010)...
call "%~dp0..\open-firewall.bat" /noprompt
if %errorlevel% neq 0 (
    echo   Firewall rule failed. Re-run this script as Administrator,
    echo   or run open-firewall.bat manually as Administrator.
)

REM [10] Start PM2 + register auto-start on user logon
echo [10/10] Starting PM2 and registering auto-start...
call pm2 start ecosystem.config.js
call pm2 save

schtasks /query /tn "BASTISTIL Inventory Startup" >nul 2>&1
if %errorlevel% equ 0 (
    schtasks /delete /tn "BASTISTIL Inventory Startup" /f >nul 2>&1
)
schtasks /create /tn "BASTISTIL Inventory Startup" /tr "\"%~dp0pm2-startup.bat\"" /sc ONLOGON /RL HIGHEST /f >nul 2>&1
if %errorlevel% equ 0 (
    echo   Auto-start registered (runs on Windows logon).
    echo   Note: enable auto-login on this PC for unattended reboot recovery.
) else (
    echo   Could not register auto-start task. Run this script as Administrator,
    echo   or register manually:
    echo     schtasks /create /tn "BASTISTIL Inventory Startup" /tr "%~dp0pm2-startup.bat" /sc ONLOGON /RL HIGHEST /f
)

echo.
echo ============================================================
echo   DONE! Server is running.
echo ============================================================
echo.
if not "!LAN_IP!"=="" (
    echo   Access from this PC:  https://localhost:3010
    echo   Access from phone:    https://!LAN_IP!:3010
) else (
    echo   Access from this PC:  https://localhost:3010
)
echo.
echo   On your phone (first time only):
echo     1. Open https://!LAN_IP!:3010/ca.pem in the phone browser
echo        (tap Advanced / Show Details then Proceed/Visit anyway)
echo     2. Install the downloaded certificate:
echo        iPhone: Settings ^> General ^> VPN ^& Device Management ^> mkcert CA ^> Install
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
