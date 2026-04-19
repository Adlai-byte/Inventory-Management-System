@echo off
REM ==========================================
REM BASTISTIL Inventory - Firewall Rule
REM ==========================================
REM Opens TCP port 3010 inbound on Private and Domain profiles.
REM LAN-agnostic (no hardcoded IP).
REM ==========================================

echo ============================================================
echo   Opening Port 3010 in Windows Firewall for LAN access
echo ============================================================
echo.

netsh advfirewall firewall delete rule name="BASTISTIL Inventory Port 3010" >nul 2>&1
netsh advfirewall firewall delete rule name="Node.js HTTPS LAN" >nul 2>&1
netsh advfirewall firewall delete rule name="Node.js HTTP LAN" >nul 2>&1

netsh advfirewall firewall add rule name="BASTISTIL Inventory Port 3010" dir=in action=allow protocol=TCP localport=3010 profile=private,domain

if %ERRORLEVEL% EQU 0 (
    echo.
    echo   SUCCESS: Port 3010/TCP is open on Private and Domain networks.
    echo.
) else (
    echo.
    echo   FAILED. Run this script as Administrator.
    echo   Right-click the file ^> Run as Administrator.
    echo.
    exit /b 1
)

REM Only pause when run interactively (not when invoked from server-init.bat).
if /i "%~1"=="/noprompt" exit /b 0
pause
