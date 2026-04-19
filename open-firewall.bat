@echo off
echo ============================================================
echo  Opening Port 3010 in Windows Firewall for LAN access
echo ============================================================
echo.

netsh advfirewall firewall delete rule name="Node.js HTTPS LAN" >nul 2>&1
netsh advfirewall firewall delete rule name="Node.js HTTP LAN" >nul 2>&1

netsh advfirewall firewall add rule name="Node.js HTTPS LAN" dir=in action=allow protocol=TCP localport=3010 profile=private

if %ERRORLEVEL% EQU 0 (
    echo.
    echo  SUCCESS! Port 3010 is now open on your private network.
    echo.
    echo  Access the app from your phone at:
    echo  https://192.168.0.101:3010
    echo.
) else (
    echo.
    echo  FAILED. Make sure you ran this as Administrator.
    echo  Right-click this file > Run as Administrator
    echo.
)

pause
