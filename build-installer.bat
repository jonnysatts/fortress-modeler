@echo off
REM Fortress Financial Modeler - Windows Installer Build Script
REM This script builds a single-file Windows installer

echo.
echo Building Fortress Financial Modeler Windows Installer...
echo.

REM Check if Node.js is available
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed. Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if dependencies are installed
if not exist "node_modules\" (
    echo Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
)

REM Install Electron dependencies if not present
if not exist "node_modules\electron\" (
    echo Installing Electron dependencies...
    call npm install electron electron-builder electron-updater concurrently wait-on --save-dev
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install Electron dependencies
        pause
        exit /b 1
    )
)

REM Build the web application
echo.
echo Building web application...
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Failed to build web application
    pause
    exit /b 1
)

REM Build the Windows installer
echo.
echo Building Windows installer...
call npm run dist:win
if %errorlevel% neq 0 (
    echo ERROR: Failed to build Windows installer
    pause
    exit /b 1
)

echo.
echo SUCCESS: Windows installer built successfully!
echo.
echo Installer location: dist-electron\
dir /b dist-electron\*.exe 2>nul
echo.
echo You can now distribute the .exe file to users for easy installation.
echo.
pause