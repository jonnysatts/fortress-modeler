@echo off
REM Fortress Financial Modeler - Electron Setup Script
REM This script sets up Electron for building Windows installers

echo.
echo Setting up Electron for Windows installer building...
echo.

REM Check if Node.js is available
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed. Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo SUCCESS: Node.js detected

REM Install Electron dependencies
echo.
echo Installing Electron dependencies...
call npm install electron electron-builder electron-updater concurrently wait-on --save-dev

if %errorlevel% neq 0 (
    echo ERROR: Failed to install Electron dependencies
    pause
    exit /b 1
)

echo SUCCESS: Electron dependencies installed

REM Create placeholder icons
echo.
echo Creating placeholder icons...
call node scripts/create-icons.cjs

REM Test Electron in development mode
echo.
echo Testing Electron setup...
echo.
echo To test the Electron app:
echo   npm run electron:dev
echo.
echo To build Windows installer:
echo   npm run dist:win
echo.
echo To build installer with automated script:
echo   build-installer.bat
echo.
echo Setup complete! Read docs/WINDOWS_INSTALLER.md for full instructions.
echo.
pause