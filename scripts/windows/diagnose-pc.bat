@echo off
setlocal enabledelayedexpansion

echo =========================================================
echo    FORTRESS MODELER - PC DIAGNOSTIC TOOL
echo =========================================================
echo.

:: Check Node.js
echo [CHECKING] Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is NOT installed!
    echo        Please download and install Node.js from https://nodejs.org/
    echo        Recommended: LTS version
    set "NODE_ERROR=1"
) else (
    for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
    echo [OK] Node.js is installed: !NODE_VERSION!
)
echo.

:: Check npm
echo [CHECKING] npm installation...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm is NOT available!
    echo        This usually comes with Node.js. Try reinstalling Node.js.
    set "NPM_ERROR=1"
) else (
    for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
    echo [OK] npm is installed: !NPM_VERSION!
)
echo.

:: Check current directory
echo [CHECKING] Current directory...
echo Current location: %CD%
if exist package.json (
    echo [OK] package.json found - correct directory
) else (
    echo [ERROR] package.json NOT found!
    echo        You must run this from the fortress-modeler directory
    echo        Please navigate to the project folder and try again
    set "DIR_ERROR=1"
)
echo.

:: Check node_modules
echo [CHECKING] Project dependencies...
if exist node_modules (
    :: Count approximate number of packages
    set count=0
    for /d %%i in (node_modules\*) do set /a count+=1
    echo [OK] node_modules exists with approximately !count! packages
) else (
    echo [WARNING] node_modules folder NOT found!
    echo           Dependencies may not be installed.
    echo           Run: npm install
    set "DEPS_WARNING=1"
)
echo.

:: Check port 8081
echo [CHECKING] Port 8081 availability...
netstat -ano | findstr ":8081" >nul 2>&1
if %errorlevel% equ 0 (
    echo [WARNING] Port 8081 is already in use!
    echo           Processes using port 8081:
    netstat -ano | findstr ":8081"
    echo.
    echo           To fix: Close any applications using port 8081
    set "PORT_WARNING=1"
) else (
    echo [OK] Port 8081 is available
)
echo.

:: Show system info
echo [INFO] System Information:
echo        User Profile: %USERPROFILE%
echo        System Architecture: %PROCESSOR_ARCHITECTURE%
echo        Current Time: %DATE% %TIME%
echo.

:: If no critical errors, try to start the app briefly
if not defined NODE_ERROR if not defined NPM_ERROR if not defined DIR_ERROR (
    echo [TESTING] Attempting to start the app for 5 seconds...
    echo          (This will show any immediate errors)
    echo.
    
    :: Create a temporary file to capture output
    set "TEMP_LOG=%TEMP%\fortress_test_%RANDOM%.log"
    
    :: Start npm in background and capture output
    start /b cmd /c "npm start 2>&1 | tee !TEMP_LOG!" >nul 2>&1
    
    :: Wait 5 seconds
    timeout /t 5 /nobreak >nul
    
    :: Kill any node processes we started
    taskkill /f /im node.exe >nul 2>&1
    
    :: Show captured output
    if exist "!TEMP_LOG!" (
        echo [OUTPUT] First 20 lines of startup log:
        echo -----------------------------------------
        set linecount=0
        for /f "delims=" %%a in (!TEMP_LOG!) do (
            if !linecount! lss 20 (
                echo %%a
                set /a linecount+=1
            )
        )
        del "!TEMP_LOG!" >nul 2>&1
        echo -----------------------------------------
    )
)
echo.

:: Summary
echo =========================================================
echo                      SUMMARY
echo =========================================================
if defined NODE_ERROR echo [CRITICAL] Node.js must be installed first!
if defined NPM_ERROR echo [CRITICAL] npm is not working properly!
if defined DIR_ERROR echo [CRITICAL] Wrong directory - must run from project folder!
if defined DEPS_WARNING echo [ACTION NEEDED] Run: npm install
if defined PORT_WARNING echo [ACTION NEEDED] Free up port 8081

if not defined NODE_ERROR if not defined NPM_ERROR if not defined DIR_ERROR if not defined DEPS_WARNING if not defined PORT_WARNING (
    echo [SUCCESS] All checks passed! 
    echo.
    echo To start the app, run one of these commands:
    echo   - npm start
    echo   - npm run dev
    echo   - Double-click setup.bat (if it exists)
) else (
    echo.
    echo [NEXT STEPS] Fix the issues above, then try again.
)

echo.
echo =========================================================
echo Press any key to close this window...
pause >nul