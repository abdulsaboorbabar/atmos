@echo off
title ATMOS Meteorological Intelligence - Local Server
color 0B

echo.
echo  ============================================
echo   ATMOS Meteorological Intelligence Platform
echo  ============================================
echo.
echo  Starting local development server...
echo.

:: Check if Python is available
where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo  [ERROR] Python is not installed or not in PATH.
    echo  Please install Python from https://python.org
    echo.
    pause
    exit /b 1
)

:: Get Python version
for /f "tokens=2" %%i in ('python --version 2^>^&1') do set PYVER=%%i
echo  Python %PYVER% detected.
echo.
set PORT=8000

echo  Server will start at:
echo.
echo    http://localhost:%PORT%
echo.
echo  Opening browser automatically...
echo  Press Ctrl+C in this window to stop the server.
echo  ============================================
echo.

:: Launch the browser asynchronously
start http://localhost:%PORT%

:: Start the server from the script directory
cd /d "%~dp0"
python -m http.server %PORT%

pause
