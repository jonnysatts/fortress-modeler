@echo off
REM Fortress Financial Modeler - Quick Setup Script for Windows
REM This script helps set up the app on a new Windows machine

echo 🏰 Setting up Fortress Financial Modeler...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js v18+ from https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js detected: 
node --version

REM Check if npm is available
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is not available
    pause
    exit /b 1
)

echo ✅ npm detected:
npm --version

REM Install dependencies
echo.
echo 📦 Installing dependencies...
call npm install

if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo ✅ Dependencies installed successfully

REM Run requirements verification
echo.
echo 🔍 Verifying requirements...
call npm run verify

if %errorlevel% neq 0 (
    echo ❌ Requirements verification failed
    echo Please check the errors above before continuing
    pause
    exit /b 1
)

REM Check if .env exists
if not exist ".env" (
    echo.
    echo ⚠️  No .env file found. Creating from template...
    copy .env.example .env >nul
    echo ✅ Created .env file from template
    echo.
    echo 🔧 IMPORTANT: Edit the .env file with your actual Supabase credentials:
    echo    - VITE_SUPABASE_URL
    echo    - VITE_SUPABASE_ANON_KEY
    echo    - VITE_GOOGLE_CLIENT_ID (for OAuth)
    echo.
    echo Make sure VITE_USE_SUPABASE_BACKEND=true for cloud mode!
) else (
    echo ✅ .env file already exists
)

echo.
echo 🚀 Setup complete! To start the development server:
echo.
echo    npm run dev
echo.
echo The app will be available at: http://localhost:8081/
echo.
echo 📖 See INSTALLATION_GUIDE.md for detailed setup instructions
echo.
pause