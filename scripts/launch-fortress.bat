@echo off
title Fortress Financial Modeler - Launcher

echo.
echo 🏰 Starting Fortress Financial Modeler...
echo ================================================
echo.

REM Change to the directory where this batch file is located
cd /d "%~dp0"

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

REM Display versions
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i

echo ✅ Node.js found: %NODE_VERSION%
echo ✅ npm found: %NPM_VERSION%
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm install
    echo.
)

echo 🚀 Launching Fortress Financial Modeler...
echo The app will open in your default browser
echo.
echo 📍 Local URL: http://localhost:8080
echo 🔄 Hot reload is enabled for development
echo.
echo ❌ To stop the server, press Ctrl+C in this terminal
echo ================================================
echo.

REM Start the development server
npm run dev

REM Keep terminal open if there's an error
echo.
pause