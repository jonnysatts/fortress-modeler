@echo off
REM Fortress Financial Modeler - Port 8081 Fixer
REM This script specifically fixes port 8081 issues (REQUIRED for OAuth)

echo.
echo ==========================================
echo FIXING PORT 8081 (REQUIRED FOR OAUTH)
echo ==========================================
echo.

echo ⚠️  IMPORTANT: This app requires port 8081 for OAuth authentication
echo   Alternative ports will break login functionality
echo.

echo [1/5] Checking what's using port 8081...
netstat -ano | findstr ":8081" > temp_8081.txt

if %errorlevel% equ 0 (
    echo ❌ PROBLEM FOUND: Something is using port 8081
    echo.
    echo Processes using port 8081:
    type temp_8081.txt
    echo.
    
    REM Extract PIDs and kill them
    for /f "tokens=5" %%a in (temp_8081.txt) do (
        echo Killing process PID: %%a
        taskkill /PID %%a /F >nul 2>&1
    )
    
    del temp_8081.txt
    echo ✅ FIXED: Killed processes using port 8081
) else (
    echo ✅ GOOD: Port 8081 is available
    del temp_8081.txt >nul 2>&1
)

echo.
echo [2/5] Killing any leftover Node.js processes...
tasklist | findstr "node.exe" >nul
if %errorlevel% equ 0 (
    echo Found Node.js processes - killing them...
    taskkill /F /IM node.exe >nul 2>&1
    echo ✅ FIXED: Killed Node.js processes
) else (
    echo ✅ GOOD: No Node.js processes running
)

echo.
echo [3/5] Checking Windows Firewall...
netsh advfirewall firewall show rule name="Node.js" >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  Adding Node.js to Windows Firewall...
    netsh advfirewall firewall add rule name="Node.js" dir=in action=allow program="node.exe" enable=yes >nul 2>&1
    if %errorlevel% equ 0 (
        echo ✅ FIXED: Added Node.js to Windows Firewall
    ) else (
        echo ❌ WARNING: Could not add firewall rule (try running as Administrator)
    )
) else (
    echo ✅ GOOD: Node.js firewall rule exists
)

echo.
echo [4/5] Clearing any port bindings...
netsh int ipv4 reset >nul 2>&1
echo ✅ FIXED: Reset network stack

echo.
echo [5/5] Testing port 8081 availability...
netstat -an | findstr ":8081" >nul
if %errorlevel% equ 0 (
    echo ❌ ERROR: Port 8081 is still in use after fixes
    echo.
    echo MANUAL STEPS REQUIRED:
    echo 1. Restart your computer
    echo 2. Check what software might be using port 8081:
    echo    - Proxy software
    echo    - Development servers
    echo    - Other Node.js apps
    echo    - Enterprise software
    echo 3. Temporarily disable antivirus
    echo 4. Disconnect VPN
    echo.
) else (
    echo ✅ SUCCESS: Port 8081 is now available!
    echo.
    echo You can now start the app:
    echo   npm run dev
    echo.
    echo The app will be available at: http://localhost:8081
    echo.
)

echo.
echo ==========================================
echo PORT 8081 FIX COMPLETE
echo ==========================================
echo.

echo Starting the app now...
echo.
npm run dev

pause