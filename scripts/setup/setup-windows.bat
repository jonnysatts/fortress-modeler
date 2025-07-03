@echo off
REM Fortress Financial Modeler - Quick Setup Script for Windows
REM This script helps set up the app on a new Windows machine

echo.
echo Setting up Fortress Financial Modeler...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed. Please install Node.js v18+ from https://nodejs.org/
    pause
    exit /b 1
)

REM Check Node.js version
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo SUCCESS: Node.js detected: %NODE_VERSION%

REM Check if npm is available
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: npm is not available
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo SUCCESS: npm detected: %NPM_VERSION%

REM Install dependencies
echo.
echo Installing dependencies...
call npm install

if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo SUCCESS: Dependencies installed successfully

REM Run requirements verification
echo.
echo Verifying requirements...
call npm run verify

if %errorlevel% neq 0 (
    echo ERROR: Requirements verification failed
    echo Please check the errors above before continuing
    pause
    exit /b 1
)

REM Check if .env exists (optional with built-in config)
if not exist ".env" (
    echo.
    echo NOTE: No .env file found.
    echo The app includes built-in configuration and will work without .env files.
    echo.
    echo Optional setup:
    echo 1. Use built-in configuration ^(recommended - no setup required^)
    echo 2. Interactive configuration ^(for custom settings^)
    echo 3. Copy from production template
    echo 4. Copy from example template
    echo.
    set /p env_choice="Enter choice (1-4, or press Enter for option 1): "
    
    if "%env_choice%"=="" set env_choice=1
    if "%env_choice%"=="1" (
        echo SUCCESS: Using built-in configuration - no .env file needed
    ) else if "%env_choice%"=="2" (
        echo Running interactive configuration...
        call scripts\configure-env.bat
    ) else if "%env_choice%"=="3" (
        if exist ".env.production" (
            copy .env.production .env >nul
            echo SUCCESS: Copied production configuration
        ) else (
            echo ERROR: .env.production not found, falling back to example
            copy .env.example .env >nul
            echo WARNING: Using example template, manual configuration required
        )
    ) else (
        copy .env.example .env >nul
        echo WARNING: Using example template
        echo MANUAL SETUP REQUIRED: Edit .env with your actual credentials
    )
) else (
    echo SUCCESS: .env file already exists
)

echo.
echo Setup complete! To start the application:
echo.
echo RECOMMENDED: start-app.bat ^(handles port conflicts automatically^)
echo ALTERNATIVE: npm run dev ^(requires manual port 8081 fixing^)
echo.
echo ⚠️  IMPORTANT: This app requires port 8081 for authentication
echo   The launcher will automatically fix port conflicts
echo.
echo If you encounter issues:
echo   1. Run: fix-port-8081.bat
echo   2. Run: scripts\diagnose-port.bat  
echo   3. Read: docs\WHY_PORT_8081.md
echo.
echo The app will be available at: http://localhost:8081/
echo.
echo See INSTALLATION_GUIDE.md for detailed setup instructions
echo.
pause