@echo off
REM Fortress Financial Modeler - Port Diagnostics Script
REM This script helps diagnose why port 8081 isn't working

echo.
echo ====================================================
echo Fortress Financial Modeler - Port 8081 Diagnostics
echo ====================================================
echo.

REM Check if port 8081 is already in use
echo [1/6] Checking if port 8081 is already in use...
netstat -an | findstr ":8081" >nul
if %errorlevel% equ 0 (
    echo ❌ FOUND: Port 8081 is already in use by another process
    echo.
    echo Processes using port 8081:
    netstat -ano | findstr ":8081"
    echo.
    echo To kill processes using port 8081:
    echo   1. Note the PID (last column above)
    echo   2. Run: taskkill /PID [PID_NUMBER] /F
    echo.
) else (
    echo ✅ GOOD: Port 8081 is available
)

echo.
echo [2/6] Checking Windows Firewall...
netsh advfirewall firewall show rule name="Node.js" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ GOOD: Node.js firewall rule exists
) else (
    echo ⚠️  WARNING: No Node.js firewall rule found
    echo.
    echo To add firewall rule:
    echo   netsh advfirewall firewall add rule name="Node.js" dir=in action=allow program="node.exe" enable=yes
    echo.
)

echo.
echo [3/6] Testing localhost connectivity...
ping -n 1 127.0.0.1 >nul
if %errorlevel% equ 0 (
    echo ✅ GOOD: Localhost (127.0.0.1) is reachable
) else (
    echo ❌ ERROR: Cannot reach localhost - this is a serious network issue
)

echo.
echo [4/6] Checking if Node.js is running...
tasklist | findstr "node.exe" >nul
if %errorlevel% equ 0 (
    echo ✅ FOUND: Node.js processes are running
    echo.
    echo Running Node.js processes:
    tasklist | findstr "node.exe"
) else (
    echo ❌ ERROR: No Node.js processes found
    echo Make sure you ran 'npm run dev' first
)

echo.
echo [5/6] Checking for common port conflicts...
echo Checking common conflicting services:

REM Check for common services that might use 8081
netstat -an | findstr ":8080" >nul
if %errorlevel% equ 0 (
    echo ⚠️  WARNING: Port 8080 is in use (might conflict)
)

netstat -an | findstr ":3000" >nul
if %errorlevel% equ 0 (
    echo ⚠️  INFO: Port 3000 is in use (React dev server)
)

netstat -an | findstr ":5173" >nul
if %errorlevel% equ 0 (
    echo ⚠️  INFO: Port 5173 is in use (Vite dev server)
)

echo.
echo [6/6] System Information:
echo OS Version: 
ver
echo.
echo Network Configuration:
ipconfig | findstr "IPv4"
echo.

echo.
echo ====================================================
echo TROUBLESHOOTING SUGGESTIONS:
echo ====================================================
echo.

echo 1. PORT CONFLICT SOLUTIONS:
echo   • Use different port: npm run dev -- --port 3000
echo   • Kill conflicting process: taskkill /PID [PID] /F
echo   • Restart computer to clear all port bindings
echo.

echo 2. FIREWALL SOLUTIONS:
echo   • Add Node.js to Windows Firewall exceptions
echo   • Temporarily disable Windows Firewall for testing
echo   • Check antivirus software blocking
echo.

echo 3. ALTERNATIVE PORTS TO TRY:
echo   • Port 3000: npm run dev -- --port 3000
echo   • Port 5173: npm run dev -- --port 5173  
echo   • Port 8080: npm run dev -- --port 8080
echo   • Any port: npm run dev -- --port 9999
echo.

echo 4. NETWORK SOLUTIONS:
echo   • Check if VPN is interfering
echo   • Try running as administrator
echo   • Reset network stack: netsh winsock reset
echo.

echo 5. BROWSER SOLUTIONS:
echo   • Try different browser (Chrome, Firefox, Edge)
echo   • Clear browser cache and cookies
echo   • Try incognito/private mode
echo   • Try direct IP: http://127.0.0.1:8081
echo.

echo Press any key to continue...
pause >nul