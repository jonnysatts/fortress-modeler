@echo off
REM Fortress Financial Modeler - Smart Port Launcher
REM This script automatically finds an available port and starts the app

echo.
echo Starting Fortress Financial Modeler with automatic port detection...
echo.

REM List of ports to try (in order of preference)
set PORTS=8081 3000 5173 8080 4000 4173 9000 9999

REM Function to test if a port is available
for %%p in (%PORTS%) do (
    echo Testing port %%p...
    netstat -an | findstr ":%%p " >nul
    if errorlevel 1 (
        echo ✅ Port %%p is available - starting app...
        goto :start_app_%%p
    ) else (
        echo ❌ Port %%p is busy
    )
)

echo.
echo ❌ ERROR: No available ports found!
echo.
echo Troubleshooting options:
echo 1. Run: scripts\diagnose-port.bat
echo 2. Kill processes: taskkill /F /IM node.exe
echo 3. Restart your computer
echo 4. Try manual port: npm run dev -- --port 9999
echo.
pause
exit /b 1

:start_app_8081
echo.
echo 🚀 Starting on port 8081 (OAuth-compatible)...
echo 🌐 App will be available at: http://localhost:8081
echo.
npm run dev
goto :end

:start_app_3000
echo.
echo 🚀 Starting on port 3000...
echo 🌐 App will be available at: http://localhost:3000
echo ⚠️  Note: OAuth may not work on this port
echo.
npm run dev -- --port 3000
goto :end

:start_app_5173
echo.
echo 🚀 Starting on port 5173 (Vite default)...
echo 🌐 App will be available at: http://localhost:5173
echo ⚠️  Note: OAuth may not work on this port
echo.
npm run dev -- --port 5173
goto :end

:start_app_8080
echo.
echo 🚀 Starting on port 8080...
echo 🌐 App will be available at: http://localhost:8080
echo ⚠️  Note: OAuth may not work on this port
echo.
npm run dev -- --port 8080
goto :end

:start_app_4000
echo.
echo 🚀 Starting on port 4000...
echo 🌐 App will be available at: http://localhost:4000
echo ⚠️  Note: OAuth may not work on this port
echo.
npm run dev -- --port 4000
goto :end

:start_app_4173
echo.
echo 🚀 Starting on port 4173...
echo 🌐 App will be available at: http://localhost:4173
echo ⚠️  Note: OAuth may not work on this port
echo.
npm run dev -- --port 4173
goto :end

:start_app_9000
echo.
echo 🚀 Starting on port 9000...
echo 🌐 App will be available at: http://localhost:9000
echo ⚠️  Note: OAuth may not work on this port
echo.
npm run dev -- --port 9000
goto :end

:start_app_9999
echo.
echo 🚀 Starting on port 9999...
echo 🌐 App will be available at: http://localhost:9999
echo ⚠️  Note: OAuth may not work on this port
echo.
npm run dev -- --port 9999
goto :end

:end
echo.
echo App stopped.
pause