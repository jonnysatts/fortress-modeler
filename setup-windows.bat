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

REM Check if .env exists
if not exist ".env" (
    echo.
    echo WARNING: No .env file found.
    echo.
    echo Choose setup option:
    echo 1. Interactive configuration ^(recommended^)
    echo 2. Copy from production template
    echo 3. Copy from example template
    echo.
    set /p env_choice="Enter choice (1-3): "
    
    if "%env_choice%"=="1" (
        echo Running interactive configuration...
        call scripts\configure-env.bat
    ) else if "%env_choice%"=="2" (
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
echo Setup complete! To start the development server:
echo.
echo    npm run dev
echo.
echo The app will be available at: http://localhost:8081/
echo.
echo See INSTALLATION_GUIDE.md for detailed setup instructions
echo.
pause