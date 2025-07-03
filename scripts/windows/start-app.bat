@echo off
REM Fortress Financial Modeler - Enhanced Launcher
REM This script ensures port 8081 is available and launches the app with browser

echo.
echo ===============================================
echo 🏰 FORTRESS FINANCIAL MODELER LAUNCHER
echo ===============================================
echo.

REM Check if Node.js is available
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ ERROR: Node.js is not installed
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if dependencies are installed
if not exist "node_modules\" (
    echo 📦 Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo ❌ ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
)

echo ✅ Node.js detected and dependencies ready
echo.

echo 🔍 Checking port 8081 availability...
netstat -an | findstr ":8081 " >nul
if %errorlevel% equ 0 (
    echo ⚠️  Port 8081 is in use - attempting to free it...
    
    REM Try to kill processes using port 8081
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8081 "') do (
        echo Killing process PID: %%a
        taskkill /PID %%a /F >nul 2>&1
    )
    
    REM Wait for processes to close
    timeout /t 2 /nobreak >nul
    
    REM Check again
    netstat -an | findstr ":8081 " >nul
    if %errorlevel% equ 0 (
        echo ❌ WARNING: Could not free port 8081
        echo OAuth authentication may not work correctly
        echo.
        echo 💡 Try running: fix-port-8081.bat
        echo.
    ) else (
        echo ✅ Successfully freed port 8081
    )
) else (
    echo ✅ Port 8081 is available
)

echo.
echo 🚀 Starting Fortress Financial Modeler...
echo 🌐 The app will open at: http://localhost:8081
echo.
echo ⚠️  IMPORTANT: Do not close this window while using the app
echo Press Ctrl+C to stop the server
echo.

REM Start the enhanced dev server
call npm run dev

echo.
echo 👋 Thanks for using Fortress Financial Modeler!
pause