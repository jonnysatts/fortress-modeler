@echo off
echo.
echo Fortress Financial Modeler - Environment Configuration
echo ======================================================
echo.
echo This script will create your .env file with the correct credentials.
echo.

REM Check if .env already exists
if exist ".env" (
    echo .env file already exists. 
    set /p overwrite="Do you want to overwrite it? (y/N): "
    if /i not "%overwrite%"=="y" (
        echo Keeping existing .env file.
        pause
        exit /b 0
    )
)

echo.
echo Please enter your Supabase credentials:
echo (You can find these in your Supabase Dashboard > Settings > API)
echo.

REM Get Supabase URL
set /p SUPABASE_URL="Supabase URL (e.g., https://xxx.supabase.co): "
if "%SUPABASE_URL%"=="" (
    echo ERROR: Supabase URL is required
    pause
    exit /b 1
)

REM Get Supabase Anon Key
set /p SUPABASE_KEY="Supabase Anon Key: "
if "%SUPABASE_KEY%"=="" (
    echo ERROR: Supabase Anon Key is required
    pause
    exit /b 1
)

REM Get Google Client ID (optional)
echo.
set /p GOOGLE_CLIENT_ID="Google Client ID (optional, press Enter to skip): "

REM Choose backend mode
echo.
echo Backend Mode:
echo 1. Cloud Mode (recommended) - Use Supabase for data storage
echo 2. Local Mode - Use browser storage only
echo.
set /p mode_choice="Choose mode (1 or 2): "

if "%mode_choice%"=="2" (
    set BACKEND_MODE=false
    echo Selected: Local Mode
) else (
    set BACKEND_MODE=true
    echo Selected: Cloud Mode
)

REM Create .env file
echo.
echo Creating .env file...

(
echo # Fortress Financial Modeler - Environment Configuration
echo # Generated automatically on %DATE% at %TIME%
echo.
echo # Supabase Configuration
echo VITE_SUPABASE_URL=%SUPABASE_URL%
echo VITE_SUPABASE_ANON_KEY=%SUPABASE_KEY%
echo.
echo # Backend Mode
echo VITE_USE_SUPABASE_BACKEND=%BACKEND_MODE%
echo.
echo # OAuth Configuration ^(optional^)
if not "%GOOGLE_CLIENT_ID%"=="" echo VITE_GOOGLE_CLIENT_ID=%GOOGLE_CLIENT_ID%
echo.
echo # Debug Mode ^(optional^)
echo VITE_DEBUG=false
) > .env

echo SUCCESS: .env file created successfully!
echo.
echo Configuration:
echo   Supabase URL: %SUPABASE_URL%
echo   Backend Mode: %BACKEND_MODE%
if not "%GOOGLE_CLIENT_ID%"=="" echo   Google OAuth: Configured

echo.
echo You can now start the application with: npm run dev
echo.
pause