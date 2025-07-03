# Fortress Modeler PowerShell Launcher
# Run this if the .bat file doesn't work

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "          FORTRESS MODELER - POWERSHELL LAUNCHER         " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

# Set window title
$host.UI.RawUI.WindowTitle = "Fortress Modeler"

# Change to script directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

# Check Node.js
Write-Host "[CHECKING] Node.js installation..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version 2>$null
    if ($nodeVersion) {
        Write-Host "[OK] Node.js is installed: $nodeVersion" -ForegroundColor Green
    } else {
        throw "Node.js not found"
    }
} catch {
    Write-Host "[ERROR] Node.js is not installed!" -ForegroundColor Red
    Write-Host "Please download from: https://nodejs.org/" -ForegroundColor White
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# Check npm
Write-Host "[CHECKING] npm installation..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version 2>$null
    if ($npmVersion) {
        Write-Host "[OK] npm is installed: $npmVersion" -ForegroundColor Green
    } else {
        throw "npm not found"
    }
} catch {
    Write-Host "[ERROR] npm is not available!" -ForegroundColor Red
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

Write-Host ""

# Check dependencies
if (!(Test-Path "node_modules")) {
    Write-Host "[SETUP] Installing dependencies..." -ForegroundColor Yellow
    Write-Host "This may take several minutes on first run..." -ForegroundColor Gray
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Failed to install dependencies!" -ForegroundColor Red
        Write-Host "Press any key to exit..."
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        exit 1
    }
    Write-Host "[OK] Dependencies installed!" -ForegroundColor Green
    Write-Host ""
}

# Check and free port 8081
Write-Host "[CHECKING] Port 8081..." -ForegroundColor Yellow
$port8081 = Get-NetTCPConnection -LocalPort 8081 -ErrorAction SilentlyContinue
if ($port8081) {
    Write-Host "[WARNING] Port 8081 is in use. Attempting to free it..." -ForegroundColor Yellow
    $port8081 | ForEach-Object {
        try {
            Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
            Write-Host "[OK] Freed port 8081" -ForegroundColor Green
        } catch {
            Write-Host "[WARNING] Could not stop process using port 8081" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "[OK] Port 8081 is available" -ForegroundColor Green
}

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "[STARTING] Launching Fortress Modeler..." -ForegroundColor Green
Write-Host ""
Write-Host "The app will open at: " -NoNewline
Write-Host "http://localhost:8081" -ForegroundColor Cyan
Write-Host ""
Write-Host "To stop: Close this window or press Ctrl+C" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

# Start the app
npm run dev

# If we get here, app has stopped
Write-Host ""
Write-Host "[INFO] App stopped." -ForegroundColor Yellow
Write-Host "Press any key to close..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")