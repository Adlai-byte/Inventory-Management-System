@echo off
REM ==========================================
REM BASTISTIL Inventory - PM2 Auto-Start
REM ==========================================
REM Invoked by the Windows Task Scheduler on user logon.
REM Registered by scripts\server-init.bat.
REM ==========================================

cd /d "%~dp0.."
call pm2 resurrect
exit /b 0
