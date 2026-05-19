@echo off
title Atmos Weather Intelligence - Local Server
color 06

echo =======================================================================
echo    A T M O S   W E A T H E R   I N T E L L I G E N C E   S Y S T E M
echo                  [ LOCAL TELEMETRY CLIENT ]
echo =======================================================================
echo.

echo [1/3] Checking system Node environment...
where npm >nul 2>&1
if errorlevel 1 goto nonode
echo [SUCCESS] Node environment verified.
echo.

echo [2/3] Verifying workspace dependencies...
if not exist node_modules goto no_node_modules
echo [SUCCESS] node_modules verified.
echo.

goto start_server

:nonode
echo [ERROR] Node.js and npm are not installed or not in your system PATH.
echo Please install Node.js (https://nodejs.org) and try again.
echo.
pause
exit /b

:no_node_modules
echo [ALERT] node_modules folder is missing. Running npm install...
call npm install
echo.
goto start_server

:start_server
echo [3/3] Launching local client at http://localhost:3000...
start http://localhost:3000

echo.
echo =======================================================================
echo   Server is now active. Press Ctrl+C inside this window to exit.
echo =======================================================================
echo.

call npm run dev
if errorlevel 1 goto server_failed
exit /b

:server_failed
echo [ERROR] Vite server terminated unexpectedly or failed to launch.
pause
